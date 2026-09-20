"""
SUCHAK Multi-Tenant Organization Data Isolation Tests
Phase 2 Persistence Architecture
"""
import uuid
from datetime import datetime, timezone
import pytest

from backend.app.models.organization import Organization, Site
from backend.app.models.report import Report, ReportType
from backend.app.repositories.repositories import ReportRepository, SiteRepository
from backend.app.services.services import ReportPersistenceService
from backend.app.core.errors import TenantIsolationError


def test_repository_tenant_isolation(db_session):
    """Verify that queries scoped to Organization A strictly exclude Organization B records."""
    org_a = Organization(name="Asset Alpha", slug="asset-alpha")
    org_b = Organization(name="Asset Beta", slug="asset-beta")
    db_session.add_all([org_a, org_b])
    db_session.flush()

    site_a = Site(organization_id=org_a.id, name="Rig Alpha 1", code="RIG-A1")
    site_b = Site(organization_id=org_b.id, name="Rig Beta 1", code="RIG-B1")
    db_session.add_all([site_a, site_b])
    db_session.flush()

    report_a = Report(
        organization_id=org_a.id,
        site_id=site_a.id,
        report_number="RPT-ALPHA-01",
        report_type=ReportType.NEAR_MISS,
        report_datetime=datetime.now(timezone.utc),
        description="Alpha asset isolated incident report.",
    )
    report_b = Report(
        organization_id=org_b.id,
        site_id=site_b.id,
        report_number="RPT-BETA-01",
        report_type=ReportType.NEAR_MISS,
        report_datetime=datetime.now(timezone.utc),
        description="Beta asset isolated incident report.",
    )
    db_session.add_all([report_a, report_b])
    db_session.flush()

    repo = ReportRepository(db_session)

    # Scoped fetch of report A by Org A succeeds
    fetched = repo.get_by_id_scoped(report_a.id, org_a.id)
    assert fetched is not None
    assert fetched.report_number == "RPT-ALPHA-01"

    # Cross-tenant query attempt: Org B requesting Org A report returns None
    cross_tenant = repo.get_by_id_scoped(report_a.id, org_b.id)
    assert cross_tenant is None

    # List scoped for Org A returns only Org A reports
    org_a_reports = repo.list_scoped(org_a.id)
    assert len(org_a_reports) == 1
    assert org_a_reports[0].id == report_a.id

    # List scoped for Org B returns only Org B reports
    org_b_reports = repo.list_scoped(org_b.id)
    assert len(org_b_reports) == 1
    assert org_b_reports[0].id == report_b.id


def test_service_cross_tenant_site_validation(db_session):
    """Verify that ReportPersistenceService blocks assigning a site belonging to Org B to a report for Org A."""
    org_a = Organization(name="Asset Alpha 2", slug="asset-alpha-2")
    org_b = Organization(name="Asset Beta 2", slug="asset-beta-2")
    db_session.add_all([org_a, org_b])
    db_session.flush()

    site_b = Site(organization_id=org_b.id, name="Rig Beta 2", code="RIG-B2")
    db_session.add(site_b)
    db_session.flush()

    service = ReportPersistenceService(db_session)

    # Attempt to create report for Org A referencing Site from Org B must raise TenantIsolationError
    with pytest.raises(TenantIsolationError):
        service.create_report(
            organization_id=org_a.id,
            report_number="ILLEGAL-CROSS-TENANT-001",
            report_type=ReportType.NEAR_MISS,
            site_id=site_b.id,
            report_datetime=datetime.now(timezone.utc),
            description="Should fail due to tenant boundary violation",
        )
