"""
SUCHAK Seed Data Correctness & Idempotency Tests
Phase 2 Persistence Architecture
"""
import pytest
from backend.app.seeds.seed_data import seed_database
from backend.app.models.organization import Organization, Site
from backend.app.models.report import Report


def test_seed_database_execution_and_labels(db_session):
    """Verify seed execution, synthetic markers, and non-empty entities."""
    summary = seed_database(db_session)
    assert summary["organizations"] >= 1
    assert summary["sites"] >= 3
    assert summary["demo_reports"] >= 3

    # Verify synthetic demo label on organization
    org = db_session.query(Organization).filter_by(slug="oil-india-demo").first()
    assert org is not None
    assert "[SYNTHETIC DEMO]" in org.name

    # Verify demo reports have DEMO- prefix and synthetic marking
    reports = db_session.query(Report).filter_by(organization_id=org.id).all()
    assert len(reports) >= 3
    for r in reports:
        assert r.report_number.startswith("DEMO-RPT-")
        assert "[SYNTHETIC DEMO]" in r.description


def test_seed_database_idempotency(db_session):
    """Verify that running seed_database twice does not duplicate records or fail."""
    summary1 = seed_database(db_session)
    summary2 = seed_database(db_session)

    # Second run should result in 0 new entities
    for k, v in summary2.items():
        assert v == 0, f"Expected 0 additions on re-seed for {k}, got {v}"
