import time
from datetime import datetime, timezone
from fastapi import APIRouter, status, Response
from sqlalchemy import text, inspect

from backend.app.schemas.health import HealthResponse, DatabaseHealthResponse
from backend.app.core.database import engine
from backend.app.models.base import Base

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
def get_health():
    """
    Health check endpoint returning system status.
    """
    return HealthResponse(
        status="ok",
        app="SUCHAK",
        version="1.0.0",
        phase="Phase 2 - Database, Data Model & Persistence Foundation",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/health/db", response_model=DatabaseHealthResponse)
def get_db_health(response: Response):
    """
    Database health check endpoint returning connectivity status,
    engine details, latency, and schema readiness.
    """
    start_time = time.perf_counter()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    try:
        with engine.connect() as connection:
            # Connectivity probe
            connection.execute(text("SELECT 1"))
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            
            # Inspect existing tables
            inspector = inspect(connection)
            table_names = set(inspector.get_table_names())
            
            expected_tables = set(Base.metadata.tables.keys())
            # Schema is considered ready if core tables are present
            schema_ready = len(expected_tables.intersection(table_names)) > 0
            
            dialect_name = connection.dialect.name
            db_name = connection.engine.url.database or "default"
            
            return DatabaseHealthResponse(
                status="healthy",
                connected=True,
                latency_ms=latency_ms,
                engine=dialect_name,
                database=db_name,
                schema_ready=schema_ready,
                tables_count=len(table_names),
                error=None,
                timestamp=now_iso,
            )
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return DatabaseHealthResponse(
            status="unhealthy",
            connected=False,
            latency_ms=latency_ms,
            engine=engine.dialect.name if hasattr(engine, "dialect") else "unknown",
            database=engine.url.database if hasattr(engine, "url") else None,
            schema_ready=False,
            tables_count=0,
            error=str(exc),
            timestamp=now_iso,
        )

