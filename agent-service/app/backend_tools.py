import os
from typing import Any

import httpx


class BackendToolsClient:
    """HTTP client for NestJS read-only SORA tools."""

    def __init__(self) -> None:
        self.base_url = os.getenv("SORA_BACKEND_BASE_URL")
        self.api_key = os.getenv("SORA_INTERNAL_API_KEY")
        timeout_raw = os.getenv("SORA_BACKEND_TIMEOUT_SECONDS", "5")
        self.timeout = float(timeout_raw)

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    async def get_fund_snapshot(self, isin: str) -> dict[str, Any]:
        return await self._request(
            "GET",
            f"/internal/assistant/tools/funds/{isin}/snapshot",
        )

    async def compare_funds(self, isins: list[str]) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/internal/assistant/tools/funds/compare",
            json={"isins": isins},
        )

    async def _request(
        self,
        method: str,
        path: str,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not self.is_configured:
            return {
                "error": "SORA backend tools are not configured.",
            }

        assert self.base_url is not None
        assert self.api_key is not None

        async with httpx.AsyncClient(
            base_url=self.base_url,
            timeout=self.timeout,
            headers={"X-Sora-Internal-Api-Key": self.api_key},
        ) as client:
            response = await client.request(method, path, json=json)
            response.raise_for_status()
            payload = response.json()

            if isinstance(payload, dict):
                return payload

            return {"data": payload}
