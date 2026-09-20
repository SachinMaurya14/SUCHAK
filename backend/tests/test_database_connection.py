"""
SUCHAK Database Connection & Transaction Tests
Phase 2 Persistence Architecture
"""
import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.app.core.errors import DatabaseError


def test_database_connection_live(db_session: Session):
    """Verify that the database engine can execute queries and return scalar results."""
    result = db_session.execute(text("SELECT 1")).scalar()
    assert result == 1


def test_database_transaction_rollback(db_session: Session):
    """Verify that transactions rollback cleanly upon encountering errors."""
    from backend.app.models.organization import Organization
    
    org = Organization(name="Rollback Test Org", slug="rollback-test", status="ACTIVE")
    db_session.add(org)
    db_session.flush()
    assert org.id is not None
    
    # Savepoint rollback
    savepoint = db_session.begin_nested()
    try:
        # Intentionally cause an error by inserting duplicate slug
        dup_org = Organization(name="Duplicate Org", slug="rollback-test", status="ACTIVE")
        db_session.add(dup_org)
        db_session.flush()
    except Exception:
        savepoint.rollback()
    
    # Confirm initial org remains intact and session is recoverable
    assert db_session.query(Organization).filter_by(slug="rollback-test").count() == 1
