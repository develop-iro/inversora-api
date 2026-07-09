"""API-key authentication for the SORA Python agent service."""

import hmac
import os
from typing import Annotated

from fastapi import Header, HTTPException, status


def _configured_agent_api_key() -> str | None:
    raw = os.getenv("ASSISTANT_AGENT_API_KEY") or os.getenv("SORA_AGENT_API_KEY")
    if raw is None:
        return None

    trimmed = raw.strip()
    return trimmed if trimmed else None


def _extract_provided_api_key(
    header_key: str | None,
    authorization: str | None,
) -> str | None:
    if header_key is not None and header_key.strip():
        return header_key.strip()

    if authorization is None:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() == "bearer" and token.strip():
        return token.strip()

    return None


def require_agent_api_key(
    x_sora_agent_api_key: Annotated[str | None, Header()] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    """Validates the shared secret for `/agent/respond`."""

    configured_key = _configured_agent_api_key()
    if configured_key is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SORA agent authentication is not configured",
        )

    provided_key = _extract_provided_api_key(x_sora_agent_api_key, authorization)
    if provided_key is None or not hmac.compare_digest(provided_key, configured_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SORA agent API key",
        )
