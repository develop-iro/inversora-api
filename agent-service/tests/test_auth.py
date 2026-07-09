from fastapi.testclient import TestClient

from app.main import app


def test_agent_respond_requires_api_key(monkeypatch) -> None:
    monkeypatch.setenv("ASSISTANT_AGENT_API_KEY", "local-dev-agent-key-16")

    client = TestClient(app)
    response = client.post(
        "/agent/respond",
        json={
            "message": "Que es el TER?",
            "surface": "home",
            "locale": "es",
            "context": {"intent": "general"},
        },
    )

    assert response.status_code == 401


def test_health_does_not_require_api_key(monkeypatch) -> None:
    monkeypatch.setenv("ASSISTANT_AGENT_API_KEY", "local-dev-agent-key-16")

    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
