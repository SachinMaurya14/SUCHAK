"""
SUCHAK API Health Endpoint Tests
Phase 2 Persistence Architecture
"""
from fastapi.testclient import TestClient


def test_root_health(client: TestClient):
    """Test basic root health check."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_api_v1_health(client: TestClient):
    """Test API v1 system health endpoint."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "SUCHAK"
    assert "Phase 2" in data["phase"]


def test_api_v1_health_db(client: TestClient):
    """Test API v1 database connectivity and schema readiness endpoint."""
    response = client.get("/api/v1/health/db")
    # Even if PostgreSQL is not currently running locally in test environment,
    # the endpoint returns a structured JSON payload with status and connected boolean
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "connected" in data
    assert "timestamp" in data
    assert "schema_ready" in data
