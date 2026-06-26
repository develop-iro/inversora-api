from typing import Any, Literal

from pydantic import BaseModel, Field


AssistantSurface = Literal["home", "fund-detail", "catalog", "ranking", "compare"]


class AgentRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    surface: AssistantSurface
    locale: Literal["es"] = "es"
    context: dict[str, Any] = Field(default_factory=dict)
    session_id: str | None = Field(default=None, max_length=120)


class AgentResponse(BaseModel):
    text: str
    source: Literal["openai-agents"]
    model: str


class HealthResponse(BaseModel):
    status: Literal["ok"]
