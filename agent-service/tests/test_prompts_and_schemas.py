from app.prompts import SORA_PROMPT_VERSION, build_user_turn
from app.schemas import AgentRequest


def test_build_user_turn_includes_session_and_context() -> None:
    payload = {
        "message": "Compara TER y score",
        "surface": "compare",
        "locale": "es",
        "session_id": "sora_test",
        "context": {
            "intent": "compare",
            "funds": [{"isin": "US78462F1030"}],
        },
    }

    turn = build_user_turn(payload)

    assert "Intencion detectada: compare" in turn
    assert "Compara TER y score" in turn
    assert "sora_test" in turn
    assert "US78462F1030" in turn


def test_agent_request_accepts_compare_surface() -> None:
    request = AgentRequest(
        message="Explicame el score",
        surface="compare",
        locale="es",
        session_id="sora_123",
        context={"intent": "compare"},
    )

    assert request.surface == "compare"
    assert request.session_id == "sora_123"


def test_prompt_version_matches_nestjs_v2() -> None:
    assert SORA_PROMPT_VERSION == "sora-v2"
