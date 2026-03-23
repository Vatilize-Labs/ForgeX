"""Pydantic models for API request/response schemas."""

from pydantic import BaseModel, Field


class StrategyRequest(BaseModel):
    user_address: str = Field(..., description="User's wallet address")
    risk_preference: str = Field(
        default="balanced",
        description="Risk preference: conservative, balanced, or aggressive",
    )


class RiskRequest(BaseModel):
    user_address: str = Field(..., description="User's wallet address")


class ChatRequest(BaseModel):
    user_address: str | None = Field(
        default=None, description="User's wallet address (optional for general questions)"
    )
    message: str = Field(..., description="User's chat message")
    history: list[dict] | None = Field(
        default=None, description="Previous chat messages [{role, content}]"
    )


class InsightsRequest(BaseModel):
    user_address: str = Field(..., description="User's wallet address")


class AIResponse(BaseModel):
    success: bool
    data: str
    error: str | None = None


class HealthResponse(BaseModel):
    status: str
    version: str
    network: str


# ── Agent Models ──

class AgentStartRequest(BaseModel):
    user_address: str = Field(..., description="User's wallet address")
    vault_addresses: list[str] = Field(..., description="Vault addresses to monitor")
    risk_profile: str = Field(default="balanced", description="conservative, balanced, or aggressive")
    interval: int = Field(default=60, description="Monitoring interval in seconds (min 30)")
    simulate: bool = Field(default=True, description="Simulation mode — log decisions without executing on-chain")


class AgentActionResponse(BaseModel):
    success: bool
    data: dict
    error: str | None = None
