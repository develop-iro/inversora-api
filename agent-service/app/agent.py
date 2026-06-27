import json
import os
from typing import Any

import httpx
from fastapi import HTTPException, status

from .backend_tools import BackendToolsClient
from .config import AgentRuntimeConfig, load_agent_config
from .logging_config import get_logger
from .prompts import SORA_AGENT_INSTRUCTIONS, build_user_turn
from .schemas import AgentRequest, AgentResponse

logger = get_logger(__name__)


class SoraAgentRunner:
    """Reusable OpenAI Agents SDK wrapper for SORA educational turns."""

    def __init__(self, config: AgentRuntimeConfig | None = None) -> None:
        self._config = config or load_agent_config()
        self.backend_tools = BackendToolsClient()
        self._agent: Any | None = None
        self._runner_cls: Any | None = None

    @property
    def model(self) -> str:
        return self._config.model

    def _ensure_agent(self) -> tuple[Any, Any]:
        if self._agent is not None and self._runner_cls is not None:
            return self._agent, self._runner_cls

        try:
            from agents import Agent, ModelSettings, Runner, function_tool
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Install the openai-agents package before running the agent.",
            ) from exc

        backend_tools = self.backend_tools
        tools: list[Any] = []

        if backend_tools.is_configured:

            @function_tool
            async def get_fund_snapshot(isin: str) -> dict[str, Any]:
                """Obtiene datos educativos de un fondo por ISIN."""

                return await backend_tools.get_fund_snapshot(isin)

            @function_tool
            async def get_score_breakdown(isin: str) -> dict[str, Any]:
                """Obtiene el desglose del Score Inversora de un fondo por ISIN."""

                return await backend_tools.get_score_breakdown(isin)

            @function_tool
            async def compare_funds(isins: list[str]) -> dict[str, Any]:
                """Obtiene snapshots de hasta cinco fondos para compararlos."""

                return await backend_tools.compare_funds(isins)

            @function_tool
            async def validate_comparison_fairness(
                isins: list[str],
            ) -> dict[str, Any]:
                """Comprueba si una comparativa entre fondos es educativamente justa."""

                return await backend_tools.validate_comparison_fairness(isins)

            @function_tool
            async def get_glossary_term(term: str) -> dict[str, Any]:
                """Busca un termino financiero en el glosario educativo de Inversora."""

                return await backend_tools.get_glossary_term(term)

            tools = [
                get_fund_snapshot,
                get_score_breakdown,
                compare_funds,
                validate_comparison_fairness,
                get_glossary_term,
            ]

        model_settings = ModelSettings(
            temperature=self._config.temperature,
            max_tokens=self._config.max_tokens,
        )

        self._agent = Agent(
            name="SORA",
            instructions=SORA_AGENT_INSTRUCTIONS,
            model=self._config.model,
            tools=tools,
            model_settings=model_settings,
        )
        self._runner_cls = Runner

        logger.info(
            "SORA agent initialized model=%s tools=%d",
            self._config.model,
            len(tools),
        )

        return self._agent, self._runner_cls

    async def respond(self, request: AgentRequest) -> AgentResponse:
        if not self._config.openai_api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OPENAI_API_KEY is required to run the SORA agent.",
            )

        agent, runner_cls = self._ensure_agent()

        payload: dict[str, Any] = {
            "message": request.message,
            "surface": request.surface,
            "locale": request.locale,
            "context": request.context,
        }

        if request.session_id is not None:
            payload["session_id"] = request.session_id

        user_turn = build_user_turn(payload)

        logger.info(
            "SORA turn surface=%s session_id=%s message_len=%d",
            request.surface,
            request.session_id,
            len(request.message),
        )

        try:
            result = await runner_cls.run(agent, user_turn)
        except httpx.HTTPError as exc:
            logger.exception("SORA backend tool failure during agent run")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SORA backend tools are unavailable.",
            ) from exc
        except Exception as exc:
            logger.exception("SORA agent run failed")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SORA could not generate a response.",
            ) from exc

        text = str(result.final_output).strip()

        if len(text) == 0:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SORA returned an empty response.",
            )

        logger.info(
            "SORA turn completed surface=%s response_len=%d",
            request.surface,
            len(text),
        )

        return AgentResponse(
            text=text,
            source="openai-agents",
            model=self._config.model,
        )
