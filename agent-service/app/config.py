"""Runtime configuration for the SORA Python agent service."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AgentRuntimeConfig:
    """Environment-backed settings for a single agent runtime instance."""

    model: str
    temperature: float
    max_tokens: int
    openai_api_key: str | None


def load_agent_config() -> AgentRuntimeConfig:
    """Loads agent runtime settings from environment variables."""

    temperature_raw = os.getenv("OPENAI_AGENT_TEMPERATURE", "0.3")
    max_tokens_raw = os.getenv("OPENAI_AGENT_MAX_TOKENS", "500")

    return AgentRuntimeConfig(
        model=os.getenv("OPENAI_AGENT_MODEL", "gpt-4o-mini"),
        temperature=float(temperature_raw),
        max_tokens=int(max_tokens_raw),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
    )
