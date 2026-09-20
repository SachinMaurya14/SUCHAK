"""
SUCHAK Core Relational Models & Integrity Tests
Phase 2 Persistence Architecture
"""
import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy.exc import IntegrityError

from backend.app.models.organization import Organization, Site, Location, Activity
from backend.app.models.user import User, Role, UserRole
from backend.app.models.report import Report, ReportType, ProcessingStatus, ReviewStatus, ReportAttachment
from backend.app.models.analysis import ModelVersion, AnalysisResult, Hazard, Precursor, BarrierFailure, AnalysisHazard, SIFPriority
from backend.app.models.safety_rule import LifeSavingRule, ReportRuleMapping
from backend.app.models.review import Review, ReviewFeedback
from backend.app.models.action import Action, ActionStatus, Alert, AlertSeverity


def test_organization_and_site_hierarchy(db_session):
    """Verify Organization -> Site -> Location hierarchy and relationships."""
    org = Organization(name="Upper Assam Asset", slug="upper-assam", status="ACTIVE")
    db_session.add(org)
    db_session.flush()

    site = Site(organization_id=org.id, name="Baghjan Drill Site", code="SITE-BGJ-01", site_type="DRILLING_RIG")
    db_session.add(site)
    db_session.flush()

    loc = Location(site_id=site.id, name="Cellar Pit", code="LOC-CELLAR")
    db_session.add(loc)
    db_session.flush()

    assert site.organization_id == org.id
    assert loc.site_id == site.id
    assert len(site.locations) == 1
    assert site.locations[0].name == "Cellar Pit"


def test_user_and_role_assignment(db_session):
    """Verify User, Role, and UserRole junction mapping."""
    org = Organization(name="Test Org", slug="test-user-org")
    db_session.add(org)
    db_session.flush()

    user = User(organization_id=org.id, email="safety.lead@assam.oil.in", full_name="Tapan Bora")
    role = Role(code="SafetyLead", name="Safety Team Lead")
    db_session.add_all([user, role])
    db_session.flush()

    user_role = UserRole(user_id=user.id, role_id=role.id, organization_id=org.id)
    db_session.add(user_role)
    db_session.flush()

    assert user_role.user_id == user.id
    assert user_role.role_id == role.id


def test_report_creation_and_attachments(db_session):
    """Verify Report creation, defaults, and attachment associations."""
    org = Organization(name="Test Org 2", slug="test-org-2")
    db_session.add(org)
    db_session.flush()

    site = Site(organization_id=org.id, name="Rig 12", code="RIG-12")
    db_session.add(site)
    db_session.flush()

    report = Report(
        organization_id=org.id,
        site_id=site.id,
        report_number="TEST-RPT-001",
        report_type=ReportType.NEAR_MISS,
        report_datetime=datetime.now(timezone.utc),
        description="High pressure hose whiplash prevented by safety whipcheck cable.",
    )
    db_session.add(report)
    db_session.flush()

    assert report.id is not None
    assert report.processing_status == ProcessingStatus.SUBMITTED
    assert report.review_status == ReviewStatus.PENDING
    assert report.is_deleted is False

    # Add attachment
    attachment = ReportAttachment(
        report_id=report.id,
        filename="whipcheck_inspection.jpg",
        content_type="image/jpeg",
        size_bytes=1048576,
        storage_key="s3://suchak-attachments/whipcheck.jpg",
    )
    db_session.add(attachment)
    db_session.flush()

    assert len(report.attachments) == 1
    assert report.attachments[0].filename == "whipcheck_inspection.jpg"


def test_analysis_result_and_hazard_associations(db_session):
    """Verify AnalysisResult persistence contract and junction tables."""
    org = Organization(name="Test Org 3", slug="test-org-3")
    db_session.add(org)
    db_session.flush()

    site = Site(organization_id=org.id, name="Rig 14", code="RIG-14")
    db_session.add(site)
    db_session.flush()

    report = Report(
        organization_id=org.id,
        site_id=site.id,
        report_number="TEST-RPT-002",
        report_type=ReportType.UNSAFE_CONDITION,
        report_datetime=datetime.now(timezone.utc),
        description="Hydrocarbon vapor detector sensor reading zero calibration offset.",
    )
    db_session.add(report)
    db_session.flush()

    model_ver = ModelVersion(model_name="SUCHAK-SIF", model_type="SIF", version="1.0.0")
    db_session.add(model_ver)
    db_session.flush()

    analysis = AnalysisResult(
        report_id=report.id,
        model_version_id=model_ver.id,
        sif_potential=True,
        confidence=0.88,
        priority=SIFPriority.CRITICAL,
        sif_score=0.92,
        explanation="Test explanation for potential hazard.",
    )
    db_session.add(analysis)
    db_session.flush()

    hazard = Hazard(name="Combustible Gas Release", category="FIRE_EXPLOSION")
    db_session.add(hazard)
    db_session.flush()

    link = AnalysisHazard(analysis_result_id=analysis.id, hazard_id=hazard.id, notes="Primary fuel source detected")
    db_session.add(link)
    db_session.flush()

    assert len(analysis.analysis_hazards) == 1
    assert analysis.analysis_hazards[0].hazard.name == "Combustible Gas Release"


def test_unique_constraint_enforcement(db_session):
    """Verify unique constraint on natural keys (e.g. Organization slug)."""
    org1 = Organization(name="Unique Org 1", slug="unique-slug")
    db_session.add(org1)
    db_session.flush()

    org2 = Organization(name="Unique Org 2", slug="unique-slug")
    db_session.add(org2)
    with pytest.raises(IntegrityError):
        db_session.flush()
