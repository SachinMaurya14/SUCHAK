"""
SUCHAK Safety Analysis Service
Phase 4 Safety NLP Engine & SIF Potential Detection
Orchestrates report ingestion, preprocessing, AI inference, audit logging,
state transitions, and persistence of SIF classifications.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.report import Report, ProcessingStatus, ReviewStatus
from backend.app.models.analysis import AnalysisResult, SIFPriority, Hazard, AnalysisHazard
from backend.app.repositories.repositories import (
    ReportRepository,
    AnalysisRepository,
    ModelVersionRepository,
    AuditRepository,
    HazardRepository,
)
from backend.app.ai.schemas.safety_analysis import (
    SafetyAnalysisResult,
    SIFClassification,
    AnalysisResponse,
)
from backend.app.ai.preprocessing.text_preprocessor import (
    TextPreprocessor,
    TextPreprocessingError,
)
from backend.app.ai.providers.base import AIProviderError, AIProviderUnavailableError
from backend.app.ai.providers.factory import get_ai_provider

logger = logging.getLogger("suchak.services.analysis")


class SafetyAnalysisService:
    """
    Orchestration service for analyzing safety reports.
    Enforces idempotency, tenant isolation, safety-first error handling,
    and audit tracking across analysis lifecycles.
    """

    def __init__(self, session: Session):
        self.session = session
        self.report_repo = ReportRepository(session)
        self.analysis_repo = AnalysisRepository(session)
        self.model_version_repo = ModelVersionRepository(session)
        self.audit_repo = AuditRepository(session)
        self.hazard_repo = HazardRepository(session)
        self.preprocessor = TextPreprocessor(max_length=settings.MAX_REPORT_TEXT_LENGTH)

    def analyze_report(
        self,
        report_id: uuid.UUID,
        organization_id: uuid.UUID,
        actor_user_id: Optional[uuid.UUID] = None,
        force_reanalyze: bool = False,
    ) -> AnalysisResult:
        """
        Main analysis pipeline:
        1. Fetch report with tenant scoping.
        2. Verify eligibility and handle idempotency.
        3. Transition status to PROCESSING.
        4. Normalize narrative text.
        5. Invoke AI Engine with timeout and retries.
        6. On failure: Transition to ANALYSIS_FAILED / REVIEW_REQUIRED (Never SIF=NO).
        7. On success: Persist AnalysisResult, update Report status, record audit logs.
        """
        report = self.report_repo.get_by_id_scoped(report_id, organization_id)
        if not report or report.is_deleted:
            raise HTTPException(status_code=404, detail="Safety report not found.")

        # Idempotency check
        if report.processing_status == ProcessingStatus.PROCESSING:
            raise HTTPException(
                status_code=409,
                detail="Safety report analysis is currently in progress."
            )

        existing_analysis = self.analysis_repo.get_by_report(report.id)
        if existing_analysis and not force_reanalyze:
            if report.processing_status in [ProcessingStatus.ANALYZED, ProcessingStatus.REVIEW_REQUIRED]:
                logger.info(f"Returning cached analysis for report {report_id}")
                return existing_analysis

        # Text preprocessing validation
        try:
            preprocessed = self.preprocessor.preprocess(report.description)
        except TextPreprocessingError as e:
            raise HTTPException(status_code=422, detail=f"Invalid report text: {str(e)}")

        prev_processing_status = report.processing_status
        report.processing_status = ProcessingStatus.PROCESSING
        self.session.flush()

        # Audit analysis initiation
        self.audit_repo.record_action(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            entity_type="REPORT",
            entity_id=str(report.id),
            action="AI_ANALYSIS_STARTED",
            before_data={"processing_status": prev_processing_status.value if hasattr(prev_processing_status, 'value') else str(prev_processing_status)},
            after_data={"processing_status": ProcessingStatus.PROCESSING.value},
            metadata_json={"force_reanalyze": force_reanalyze},
        )
        self.session.commit()

        # Build domain operational context
        context: Dict[str, Any] = {
            "report_type": report.report_type,
            "site_name": report.site.name if report.site else None,
            "location_name": report.location.name if report.location else None,
            "activity_name": report.activity.name if report.activity else None,
        }

        # Invoke AI Provider
        try:
            provider = get_ai_provider()
            ai_result: SafetyAnalysisResult = provider.analyze_report(
                description=preprocessed.normalized_text,
                actual_outcome=report.actual_outcome,
                context=context,
            )
        except Exception as exc:
            # Safety-First Failure Mode: TECHNICAL FAILURE MUST NOT CLEAR SAFETY
            logger.error(f"AI analysis failed for report {report_id}: {str(exc)}", exc_info=True)
            report.processing_status = ProcessingStatus.ANALYSIS_FAILED
            report.review_status = ReviewStatus.PENDING

            safe_error_msg = "Technical error during AI inference. Review required."
            if isinstance(exc, (AIProviderError, AIProviderUnavailableError)):
                safe_error_msg = str(exc)

            self.audit_repo.record_action(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                entity_type="REPORT",
                entity_id=str(report.id),
                action="AI_ANALYSIS_FAILED",
                before_data={"processing_status": ProcessingStatus.PROCESSING.value},
                after_data={
                    "processing_status": ProcessingStatus.ANALYSIS_FAILED.value,
                    "review_status": ReviewStatus.PENDING.value,
                },
                metadata_json={"error": safe_error_msg},
            )
            self.session.commit()

            raise HTTPException(
                status_code=503 if isinstance(exc, AIProviderUnavailableError) else 500,
                detail=f"Analysis unavailable: {safe_error_msg} Safety review is required."
            )

        # Successful inference - persist ModelVersion and AnalysisResult
        model_version = self.model_version_repo.get_or_create(
            model_name=ai_result.model_name,
            version=ai_result.model_version,
            model_type="SIF_CLASSIFIER",
            metadata_json={"prompt_version": ai_result.prompt_version},
        )

        sif_potential_bool = None
        if ai_result.classification == SIFClassification.SIF_POTENTIAL:
            sif_potential_bool = True
        elif ai_result.classification == SIFClassification.NON_SIF_POTENTIAL:
            sif_potential_bool = False

        analysis_record = AnalysisResult(
            report_id=report.id,
            model_version_id=model_version.id,
            sif_potential=sif_potential_bool,
            confidence=ai_result.confidence_estimate,
            priority=ai_result.priority,
            sif_score=round(ai_result.confidence_estimate * 100, 1),
            explanation=ai_result.explanation,
            evidence_json=ai_result.model_dump(),
            status="COMPLETED",
            analyzed_at=datetime.now(timezone.utc),
        )
        self.session.add(analysis_record)
        self.session.flush()

        # Link any matched taxonomy hazards
        for hazard_name in ai_result.hazards:
            hazard_obj = self.hazard_repo.get_by_name(hazard_name.strip().upper())
            if hazard_obj:
                junction = AnalysisHazard(
                    analysis_result_id=analysis_record.id,
                    hazard_id=hazard_obj.id,
                    notes=f"Detected by {ai_result.model_name}",
                )
                self.session.add(junction)

        # Update report status
        if ai_result.classification == SIFClassification.NEEDS_REVIEW:
            report.processing_status = ProcessingStatus.REVIEW_REQUIRED
            report.review_status = ReviewStatus.PENDING
        else:
            report.processing_status = ProcessingStatus.ANALYZED
            if sif_potential_bool is True:
                report.review_status = ReviewStatus.PENDING

        action_name = "AI_ANALYSIS_REANALYZED" if force_reanalyze else "AI_ANALYSIS_COMPLETED"
        self.audit_repo.record_action(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            entity_type="REPORT",
            entity_id=str(report.id),
            action=action_name,
            before_data={"processing_status": prev_processing_status.value if hasattr(prev_processing_status, 'value') else str(prev_processing_status)},
            after_data={
                "processing_status": report.processing_status.value,
                "review_status": report.review_status.value,
                "analysis_result_id": str(analysis_record.id),
            },
            metadata_json={
                "sif_classification": ai_result.classification.value,
                "confidence": ai_result.confidence_estimate,
                "model_name": ai_result.model_name,
                "prompt_version": ai_result.prompt_version,
            },
        )

        self.session.commit()
        return analysis_record

    def get_latest_analysis(
        self,
        report_id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> Optional[AnalysisResult]:
        """
        Retrieves the latest analysis result for a tenant-scoped report.
        """
        report = self.report_repo.get_by_id_scoped(report_id, organization_id)
        if not report or report.is_deleted:
            raise HTTPException(status_code=404, detail="Safety report not found.")

        return self.analysis_repo.get_by_report(report.id)

    def list_analysis_history(
        self,
        report_id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> List[AnalysisResult]:
        """
        Retrieves all historical analysis records for a report (e.g. from re-analysis runs).
        """
        report = self.report_repo.get_by_id_scoped(report_id, organization_id)
        if not report or report.is_deleted:
            raise HTTPException(status_code=404, detail="Safety report not found.")

        return self.analysis_repo.list_by_report(report.id)

    @classmethod
    def format_analysis_response(cls, record: AnalysisResult) -> AnalysisResponse:
        """
        Translates persistent AnalysisResult entity into public AnalysisResponse contract.
        """
        evidence_data = record.evidence_json or {}

        # Derive classification enum safely
        raw_class = evidence_data.get("classification")
        if raw_class:
            classification = SIFClassification.normalize_classification(raw_class)
        elif record.sif_potential is True:
            classification = SIFClassification.SIF_POTENTIAL
        elif record.sif_potential is False:
            classification = SIFClassification.NON_SIF_POTENTIAL
        else:
            classification = SIFClassification.NEEDS_REVIEW

        conf_est = record.confidence if record.confidence is not None else evidence_data.get("confidence_estimate", 0.0)
        conf_band = evidence_data.get("confidence_band") or ("HIGH" if conf_est >= 0.8 else ("MEDIUM" if conf_est >= 0.5 else "LOW"))

        return AnalysisResponse(
            id=record.id,
            report_id=record.report_id,
            model_version_id=record.model_version_id,
            status=record.status,
            classification=classification,
            sif_potential=record.sif_potential,
            confidence_estimate=round(conf_est, 4),
            confidence_band=conf_band,
            priority=record.priority.value if hasattr(record.priority, 'value') else str(record.priority),
            safety_indicators=evidence_data.get("safety_indicators", []),
            hazards=evidence_data.get("hazards", []),
            precursor_summary=evidence_data.get("precursor_summary"),
            evidence=evidence_data.get("evidence", []),
            actual_outcome=evidence_data.get("actual_outcome"),
            potential_consequence=evidence_data.get("potential_consequence"),
            explanation=record.explanation or evidence_data.get("explanation"),
            model_name=evidence_data.get("model_name") or (record.model_version.model_name if record.model_version else "suchak_nlp"),
            model_version=evidence_data.get("model_version") or (record.model_version.version if record.model_version else "v1"),
            prompt_version=evidence_data.get("prompt_version"),
            analyzed_at=record.analyzed_at,
            created_at=record.created_at,
        )
