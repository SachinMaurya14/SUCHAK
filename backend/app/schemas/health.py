"""
Health Check Schemas for SUCHAK API
"""
from pydantic import BaseModel
from typing import Optional

class HealthResponse(BaseModel):
    status: str
    app: Optional[str] = "SUCHAK"
    version: Optional[str] = "1.0.0"
    phase: Optional[str] = "Phase 2 - Database, Data Model & Persistence Foundation"
    timestamp: Optional[str] = None


class DatabaseHealthResponse(BaseModel):
    status: str  # "healthy", "degraded", "unhealthy"
    connected: bool
    latency_ms: Optional[float] = None
    engine: Optional[str] = None
    database: Optional[str] = None
    schema_ready: bool = False
    tables_count: Optional[int] = None
    error: Optional[str] = None
    timestamp: str

