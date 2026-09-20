"""
SUCHAK Phase 2 Test Configuration & Fixtures
Configures test SQLite in-memory database and FastAPI TestClient.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

from backend.app.models.base import Base
from backend.app.models.organization import Organization
from backend.app.core.database import get_db
from backend.app.main import app

# In-memory SQLite for fast, isolated, deterministic unit & persistence testing
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(test_engine):
    """Provides a fresh transactional session rolled back after every test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = session_factory()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def org_factory(db_session: Session):
    """Factory fixture to create isolated test organizations."""
    def _create_org(name: str = "Test OilCorp", slug: str = "test-oilcorp", status: str = "ACTIVE") -> Organization:
        org = Organization(name=name, slug=slug, status=status)
        db_session.add(org)
        db_session.commit()
        return org
    return _create_org


@pytest.fixture(scope="function")
def client(db_session: Session):
    """Provides a FastAPI test client with the test DB session injected."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
