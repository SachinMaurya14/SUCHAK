"""
SUCHAK Safety NLP Engine & SIF Potential Analysis Integration Tests
Validates the complete pipeline:
REPORT -> Submit -> PostgreSQL -> [ Analyze Report ] -> Safety NLP Engine ->
[ SIF Classification, Safety Indicators, Evidence, Explanation ] -> Analysis Result ->
PostgreSQL -> Report Detail.
Also verifies:
Report -> AI unavailable -> ANALYSIS_FAILED -> "Review Required".
"""
import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.app.models.organization import Site
from backend.app.models.report import Report, ReportType, ProcessingStatus, ReviewStatus
from backend.app.models.analysis import AnalysisResult, SIFPriority
from backend.app.ai.schemas.safety_analysis import (
    SafetyAnalysisResult,
    SIFClassification,
)
from backend.app.ai.providers.rule_based_fallback import RuleBasedFallbackProvider
from backend.app.ai.providers.base import AIProviderUnavailableError
from backend.app.services.safety_analysis_service import SafetyAnalysisService


def test_rule_based_fallback_provider_sif_detection():
    """
    Tests that the deterministic rule-based safety engine detects high-pressure
    and line of fire barrier breaches as SIF Potential.
    """
    provider = RuleBasedFallbackProvider()
    narrative = (
        "During hydrostatic pressure testing at 5,000 PSI on manifold #4, a technician stepped across "
        "the barricaded line of fire zone while the safety whip check was disconnected. Emergency bleed-off "
        "was executed before catastrophic rupture."
    )
    result = provider.analyze_report(description=narrative)

    assert isinstance(result, SafetyAnalysisResult)
    assert result.classification == SIFClassification.SIF_POTENTIAL
    assert result.confidence_estimate >= 0.8
    assert len(result.safety_indicators) > 0
    assert len(result.evidence) > 0
    assert "PRESSURE" in result.hazards
    assert result.explanation is not None
    assert "precursor" in result.explanation.lower() or "sif" in result.explanation.lower()


def test_rule_based_fallback_provider_non_sif_detection():
    """
    Tests that routine, non-hazardous events without high energy release
    are classified as Non-SIF.
    """
    provider = RuleBasedFallbackProvider()
    narrative = "Admin employee completed routine housekeeping, minor scratch reported on cabinet, area cleaned."
    result = provider.analyze_report(description=narrative)

    assert isinstance(result, SafetyAnalysisResult)
    assert result.classification == SIFClassification.NON_SIF_POTENTIAL
    assert result.confidence_estimate >= 0.7
    assert result.priority in ["LOW", SIFPriority.LOW]


@patch("backend.app.services.safety_analysis_service.get_ai_provider", return_value=RuleBasedFallbackProvider())
def test_safety_analysis_pipeline_end_to_end(mock_ai, client: TestClient, db_session, org_factory):
    """
    Validates complete pipeline:
    1. Report created in PostgreSQL
    2. POST /api/v1/reports/{id}/analyze triggers NLP Engine
    3. Persists SIF Classification, Safety Indicators, Evidence, Explanation to PostgreSQL
    4. Report status is updated to ANALYZED
    5. GET /api/v1/reports/{id} includes latest_analysis
    """
    org = org_factory(name="Brahmaputra Petrochemicals", slug="brahmaputra-petro")
    site = Site(organization_id=org.id, name="Cracker Unit 1", code="CRK-01", site_type="PROCESSING_PLANT")
    db_session.add(site)
    db_session.flush()

    report = Report(
        organization_id=org.id,
        site_id=site.id,
        report_number="REP-2026-000991",
        report_type=ReportType.NEAR_MISS,
        report_datetime=datetime.now(timezone.utc),
        description=(
            "Contractor was working at height (6.5 meters) on scaffolding. "
            "Safety harness lanyard was not hooked to the lifeline. Worker slipped but caught the guardrail."
        ),
        actual_outcome="No injury occurred. Work halted.",
        processing_status=ProcessingStatus.SUBMITTED,
        review_status=ReviewStatus.PENDING,
        source="PORTAL_WEB",
    )
    db_session.add(report)
    db_session.commit()

    headers = {"X-Organization-Slug": "brahmaputra-petro"}

    # 1. Trigger AI Analysis
    analyze_resp = client.post(f"/api/v1/reports/{report.id}/analyze", headers=headers)
    assert analyze_resp.status_code == 200
    analysis_data = analyze_resp.json()

    assert analysis_data["report_id"] == str(report.id)
    assert analysis_data["classification"] == "SIF_POTENTIAL"
    assert len(analysis_data["safety_indicators"]) > 0
    assert len(analysis_data["evidence"]) > 0
    assert analysis_data["explanation"] is not None
    assert analysis_data["confidence_estimate"] > 0

    # 2. Verify Persistence in PostgreSQL
    db_session.expire_all()
    updated_report = db_session.query(Report).filter(Report.id == report.id).first()
    assert updated_report.processing_status in [ProcessingStatus.ANALYZED, ProcessingStatus.REVIEW_REQUIRED]

    persisted_analysis = db_session.query(AnalysisResult).filter(AnalysisResult.report_id == report.id).first()
    assert persisted_analysis is not None
    assert persisted_analysis.explanation == analysis_data["explanation"]
    assert persisted_analysis.evidence_json["safety_indicators"] == analysis_data["safety_indicators"]

    # 3. Verify GET /reports/{id} includes latest_analysis
    detail_resp = client.get(f"/api/v1/reports/{report.id}", headers=headers)
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["latest_analysis"] is not None
    assert detail_data["latest_analysis"]["classification"] == analysis_data["classification"]


def test_ai_unavailable_fails_safe_to_analysis_failed_and_review_required(client: TestClient, db_session, org_factory):
    """
    Verifies user requirement:
    Report -> AI unavailable -> ANALYSIS_FAILED -> "Review Required"
    Ensures safety integrity: technical failure must NEVER default to SIF=NO.
    """
    org = org_factory(name="Assam Gasfields", slug="assam-gas")
    site = Site(organization_id=org.id, name="Wellhead 12", code="WH-12", site_type="WELLHEAD")
    db_session.add(site)
    db_session.flush()

    report = Report(
        organization_id=org.id,
        site_id=site.id,
        report_number="REP-2026-000992",
        report_type=ReportType.INCIDENT,
        report_datetime=datetime.now(timezone.utc),
        description="Hydrocarbon vapor detected at separator flange above LEL threshold.",
        processing_status=ProcessingStatus.SUBMITTED,
        review_status=ReviewStatus.PENDING,
        source="PORTAL_WEB",
    )
    db_session.add(report)
    db_session.commit()

    headers = {"X-Organization-Slug": "assam-gas"}

    # Mock get_ai_provider to simulate AI service failure / unavailability
    with patch("backend.app.services.safety_analysis_service.get_ai_provider") as mock_provider_factory:
        mock_provider = mock_provider_factory.return_value
        mock_provider.analyze_report.side_effect = AIProviderUnavailableError("Gemini API connection timed out.")

        resp = client.post(f"/api/v1/reports/{report.id}/analyze", headers=headers)
        assert resp.status_code == 503
        err_detail = resp.json()["detail"]
        assert "Review required" in err_detail or "Safety review is required" in err_detail

    # Verify Report status transitioned to ANALYSIS_FAILED and Review Required
    db_session.expire_all()
    failed_report = db_session.query(Report).filter(Report.id == report.id).first()
    assert failed_report.processing_status == ProcessingStatus.ANALYSIS_FAILED
    assert failed_report.review_status == ReviewStatus.PENDING

    # Verify GET /reports/{id} reflects this failure state
    detail_resp = client.get(f"/api/v1/reports/{report.id}", headers=headers)
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["processing_status"] == "ANALYSIS_FAILED"
    assert detail_data["review_status"] == "PENDING"


@patch("backend.app.services.safety_analysis_service.get_ai_provider", return_value=RuleBasedFallbackProvider())
def test_idempotent_analysis_and_reanalyze(mock_ai, client: TestClient, db_session, org_factory):
    """
    Tests idempotency:
    - Calling analyze on an already analyzed report returns cached result.
    - Calling reanalyze forces a new analysis run and appends history.
    """
    org = org_factory(name="Duliajan Gas Gathering", slug="duliajan-gas")
    site = Site(organization_id=org.id, name="Station Charlie", code="STN-C", site_type="COMPRESSOR_STATION")
    db_session.add(site)
    db_session.flush()

    report = Report(
        organization_id=org.id,
        site_id=site.id,
        report_number="REP-2026-000993",
        report_type=ReportType.UNSAFE_ACT,
        report_datetime=datetime.now(timezone.utc),
        description="Confined space entry into vessel V-101 occurred without continuous gas monitoring badge.",
        processing_status=ProcessingStatus.SUBMITTED,
        review_status=ReviewStatus.PENDING,
        source="PORTAL_WEB",
    )
    db_session.add(report)
    db_session.commit()

    headers = {"X-Organization-Slug": "duliajan-gas"}

    # 1. First analysis call
    resp1 = client.post(f"/api/v1/reports/{report.id}/analyze", headers=headers)
    assert resp1.status_code == 200
    res1_id = resp1.json()["id"]

    # 2. Duplicate analysis call should return existing cached analysis
    resp2 = client.post(f"/api/v1/reports/{report.id}/analyze", headers=headers)
    assert resp2.status_code == 200
    assert resp2.json()["id"] == res1_id

    # 3. Force re-analysis creates a new analysis run
    resp3 = client.post(f"/api/v1/reports/{report.id}/reanalyze", headers=headers)
    assert resp3.status_code == 200
    res3_id = resp3.json()["id"]
    assert res3_id != res1_id

    # 4. History endpoint lists both runs
    hist_resp = client.get(f"/api/v1/reports/{report.id}/analysis/history", headers=headers)
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert len(history) >= 2
