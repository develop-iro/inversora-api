import pytest
from fastapi import HTTPException

from app.agent import SoraAgentRunner
from app.config import AgentRuntimeConfig
from app.schemas import AgentRequest


@pytest.mark.asyncio
async def test_respond_requires_openai_api_key() -> None:
    runner = SoraAgentRunner(
        AgentRuntimeConfig(
            model="gpt-4o-mini",
            temperature=0.3,
            max_tokens=500,
            openai_api_key=None,
        )
    )

    with pytest.raises(HTTPException) as exc_info:
        await runner.respond(
            AgentRequest(
                message="Que es el TER?",
                surface="home",
                locale="es",
                context={"intent": "general"},
            )
        )

    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_respond_returns_agent_text(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeResult:
        final_output = "Respuesta educativa."

    class FakeRunner:
        calls = 0

        @staticmethod
        async def run(agent: object, user_turn: str) -> FakeResult:
            FakeRunner.calls += 1
            return FakeResult()

    class FakeAgent:
        def __init__(self, **kwargs: object) -> None:
            self.kwargs = kwargs

    def fake_function_tool(func):  # type: ignore[no-untyped-def]
        return func

    class FakeModelSettings:
        def __init__(self, **kwargs: object) -> None:
            self.kwargs = kwargs

    fake_agents = type(
        "agents",
        (),
        {
            "Agent": FakeAgent,
            "Runner": FakeRunner,
            "ModelSettings": FakeModelSettings,
            "function_tool": staticmethod(fake_function_tool),
        },
    )

    monkeypatch.setitem(__import__("sys").modules, "agents", fake_agents)

    runner = SoraAgentRunner(
        AgentRuntimeConfig(
            model="gpt-4o-mini",
            temperature=0.3,
            max_tokens=500,
            openai_api_key="sk-test",
        )
    )

    response = await runner.respond(
        AgentRequest(
            message="Que es el TER?",
            surface="home",
            locale="es",
            context={"intent": "explain_term"},
        )
    )

    assert response.text == "Respuesta educativa."
    assert response.model == "gpt-4o-mini"
    assert response.source == "openai-agents"

    # Agent should be reused on subsequent turns.
    first_agent = runner._agent
    await runner.respond(
        AgentRequest(
            message="Y el tracking error?",
            surface="home",
            locale="es",
            context={"intent": "explain_term"},
        )
    )
    assert runner._agent is first_agent
    assert FakeRunner.calls == 2
