"""
SUCHAK Database Engine & Session Management Layer
Phase 2 Persistence Architecture
Provides connection pooling, request-scoped sessions, transactional context manager,
health-check probe, and test database adaptability.
"""
from typing import Generator, Optional
from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import QueuePool, StaticPool, NullPool

from backend.app.core.config import settings

# Engine cache
_engine: Optional[Engine] = None
_SessionFactory: Optional[sessionmaker] = None


def create_db_engine(db_url: Optional[str] = None, echo: Optional[bool] = None) -> Engine:
    """
    Creates an optimized SQLAlchemy Engine supporting PostgreSQL connection pooling
    and SQLite fallback for local testing.
    """
    url = db_url or settings.DATABASE_URL
    is_sqlite = url.startswith("sqlite")
    echo_mode = echo if echo is not None else settings.DB_ECHO

    if is_sqlite:
        connect_args = {"check_same_thread": False}
        if ":memory:" in url:
            poolclass = StaticPool
        else:
            poolclass = NullPool
        return create_engine(
            url,
            echo=echo_mode,
            connect_args=connect_args,
            poolclass=poolclass,
        )
    else:
        # PostgreSQL Production Engine with robust pooling
        return create_engine(
            url,
            echo=echo_mode,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_timeout=settings.DB_POOL_TIMEOUT,
            pool_recycle=settings.DB_POOL_RECYCLE,
            pool_pre_ping=True,  # Test connections before checkout
        )


def get_engine() -> Engine:
    """Singleton getter for application engine."""
    global _engine
    if _engine is None:
        _engine = create_db_engine()
    return _engine


# Convenient module-level engine reference for migrations/health checks
class _EngineProxy:
    def __getattr__(self, name):
        return getattr(get_engine(), name)

engine = _EngineProxy()



def get_session_factory() -> sessionmaker:
    """Singleton getter for sessionmaker."""
    global _SessionFactory
    if _SessionFactory is None:
        engine = get_engine()
        _SessionFactory = sessionmaker(
            bind=engine,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )
    return _SessionFactory


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a request-scoped database session.
    Automatically rolls back uncommitted changes on exceptions and closes the session.
    """
    session_factory = get_session_factory()
    db: Session = session_factory()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def db_session() -> Generator[Session, None, None]:
    """
    Context manager for background tasks, CLI seeds, and test fixtures.
    Ensures safe commit/rollback lifecycle.
    """
    session_factory = get_session_factory()
    db: Session = session_factory()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def check_db_connection(engine: Optional[Engine] = None) -> dict:
    """
    Performs a lightweight connectivity check against the configured database.
    Returns status dictionary for health check endpoints.
    """
    target_engine = engine or get_engine()
    try:
        with target_engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            val = result.scalar()
            return {
                "status": "connected" if val == 1 else "unexpected_result",
                "dialect": target_engine.dialect.name,
                "url_driver": target_engine.url.drivername,
            }
    except Exception as e:
        return {
            "status": "disconnected",
            "dialect": target_engine.dialect.name if target_engine else "unknown",
            "error": str(e),
        }
