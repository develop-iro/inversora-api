from fastapi import Depends, FastAPI

from .agent import SoraAgentRunner
from .auth import require_agent_api_key
from .logging_config import configure_logging
from .schemas import AgentRequest, AgentResponse, HealthResponse

configure_logging()

app = FastAPI(
    title="SORA Agent Service",
    version="0.2.0",
    description="Internal Python runtime for the Inversora educational assistant.",
)

runner = SoraAgentRunner()


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post("/agent/respond", response_model=AgentResponse)
async def respond(
    request: AgentRequest,
    _: None = Depends(require_agent_api_key),
) -> AgentResponse:
    return await runner.respond(request)
