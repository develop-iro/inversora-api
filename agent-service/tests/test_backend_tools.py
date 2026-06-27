import pytest
import httpx

from app.backend_tools import BackendToolsClient


@pytest.mark.asyncio
async def test_backend_tools_returns_configuration_error_when_unconfigured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("SORA_BACKEND_BASE_URL", raising=False)
    monkeypatch.delenv("SORA_INTERNAL_API_KEY", raising=False)

    client = BackendToolsClient()

    assert client.is_configured is False
    assert await client.get_fund_snapshot("US78462F1030") == {
        "error": "SORA backend tools are not configured.",
    }


@pytest.mark.asyncio
async def test_backend_tools_calls_score_breakdown_endpoint(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SORA_BACKEND_BASE_URL", "http://nestjs.test")
    monkeypatch.setenv("SORA_INTERNAL_API_KEY", "test-internal-key")

    calls: list[tuple[str, str]] = []

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {"isin": "US78462F1030", "score": 88}

    class FakeClient:
        def __init__(self, *args: object, **kwargs: object) -> None:
            pass

        async def __aenter__(self) -> "FakeClient":
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        async def request(
            self,
            method: str,
            path: str,
            json: dict[str, object] | None = None,
        ) -> FakeResponse:
            calls.append((method, path))
            return FakeResponse()

    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)

    client = BackendToolsClient()
    payload = await client.get_score_breakdown("US78462F1030")

    assert payload == {"isin": "US78462F1030", "score": 88}
    assert calls == [("GET", "/internal/assistant/tools/funds/US78462F1030/score-breakdown")]
