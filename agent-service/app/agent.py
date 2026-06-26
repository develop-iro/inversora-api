import json
import os
from typing import Any

from fastapi import HTTPException, status

from .backend_tools import BackendToolsClient
from .schemas import AgentRequest, AgentResponse


SORA_AGENT_INSTRUCTIONS = """
Eres SORA, el asistente educativo de Inversora.
Explicas conceptos de inversion indexada y datos de fondos con lenguaje claro.
Usa solo el contexto factual enviado por el backend. Si falta informacion, dilo.
No recomiendes comprar, vender, suscribir ni invertir en productos concretos.
No recalcules ni alteres el Score Inversora ni el ranking.
Puedes usar tools de solo lectura para consultar snapshots o comparativas cuando falten datos en el contexto.
Responde en espanol de Espana con un maximo de tres parrafos cortos.
"""


class SoraAgentRunner:
    """Thin wrapper around OpenAI Agents SDK for SORA turns."""

    def __init__(self) -> None:
        self.model = os.getenv("OPENAI_AGENT_MODEL", "gpt-4o-mini")
        self.backend_tools = BackendToolsClient()

    async def respond(self, request: AgentRequest) -> AgentResponse:
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OPENAI_API_KEY is required to run the SORA agent.",
            )

        try:
            from agents import Agent, Runner, function_tool
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Install the openai-agents package before running the agent.",
            ) from exc

        @function_tool
        async def get_fund_snapshot(isin: str) -> dict[str, Any]:
            """Obtiene datos educativos de un fondo por ISIN."""

            return await self.backend_tools.get_fund_snapshot(isin)

        @function_tool
        async def compare_funds(isins: list[str]) -> dict[str, Any]:
            """Obtiene snapshots de hasta cinco fondos para compararlos."""

            return await self.backend_tools.compare_funds(isins)

        tools = (
            [get_fund_snapshot, compare_funds]
            if self.backend_tools.is_configured
            else []
        )

        agent = Agent(
            name="SORA",
            instructions=SORA_AGENT_INSTRUCTIONS,
            model=self.model,
            tools=tools,
        )

        payload: dict[str, Any] = {
            "message": request.message,
            "surface": request.surface,
            "locale": request.locale,
            "context": request.context,
        }

        result = await Runner.run(
            agent,
            "Responde a la pregunta usando solo este JSON:\n"
            f"{json.dumps(payload, ensure_ascii=False, indent=2)}",
        )

        return AgentResponse(
            text=str(result.final_output).strip(),
            source="openai-agents",
            model=self.model,
        )
