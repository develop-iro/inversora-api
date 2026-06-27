from fastapi import FastAPI

from .agent import SoraAgentRunner
from .schemas import AgentRequest, AgentResponse, HealthResponse

app = FastAPI(
    title="SORA Agent Service",
    version="0.1.0",
    description="Internal Python runtime for the Inversora educational assistant.",
)

runner = SoraAgentRunner()


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post("/agent/respond", response_model=AgentResponse)
async def respond(request: AgentRequest) -> AgentResponse:
    return await runner.respond(request)
