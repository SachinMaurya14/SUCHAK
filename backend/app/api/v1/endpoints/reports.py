"""
SUCHAK Safety Report Ingestion & Management API Endpoints
Phase 3 Core RESTful Endpoints
"""
import uuid
import math
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.api.v1.dependencies import get_current_organization
from backend.app.models.organization import Organization
from backend.app.models.report import ReportType, ProcessingStatus, ReviewStatus
from backend.app.repositories.repositories import ReportRepository, AnalysisRepository
from backend.app.services.services import ReportPersistenceService
from backend.app.services.safety_analysis_service import SafetyAnalysisService
from backend.app.services.bulk_upload_service import BulkUploadService
from backend.app.core.errors import EntityNotFoundError, DuplicateEntityError, TenantIsolationError
from backend.app.ai.schemas.safety_analysis import AnalysisResponse
from backend.app.schemas.report import (
    ReportCreate,
    ReportUpdate,
    ReportResponse,
    ReportDetailResponse,
    ReportListResponse,
    AttachmentCreate,
    AttachmentResponse,
    ReportAuditItem,
)
from backend.app.schemas.bulk_upload import (
    BulkUploadValidateResponse,
    BulkUploadCommitRequest,
    BulkUploadCommitResponse,
)

router = APIRouter()


def normalize_report_type_param(val: Optional[str]) -> Optional[ReportType]:
    if not val:
        return None
    clean = val.strip().lower().replace("-", "_").replace(" ", "_")
    mapping = {
        "unsafe_act": ReportType.UNSAFE_ACT,
        "unsafe_condition": ReportType.UNSAFE_CONDITION,
        "near_miss": ReportType.NEAR_MISS,
        "incident": ReportType.INCIDENT,
    }
    return mapping.get(clean)


def normalize_processing_status_param(val: Optional[str]) -> Optional[ProcessingStatus]:
    if not val:
        return None
    try:
        return ProcessingStatus(val.strip().upper())
    except ValueError:
        return None


def normalize_review_status_param(val: Optional[str]) -> Optional[ReviewStatus]:
    if not val:
        return None
    try:
        return ReviewStatus(val.strip().upper())
    except ValueError:
        return None


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    payload: ReportCreate,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """
    Ingests and persists a new manual safety report.
    Validates organization boundaries, site/location/activity relationships,
    generates a collision-safe report number, sets initial processing status to SUBMITTED,
    and logs an audit trail event.
    """
    service = ReportPersistenceService(db)
    try:
        attachments_data = [a.model_dump() for a in payload.attachments] if payload.attachments else None
        report = service.create_report(
            organization_id=org.id,
            report_type=payload.report_type,
            site_id=payload.site_id,
            report_datetime=payload.report_datetime,
            description=payload.description,
            location_id=payload.location_id,
            activity_id=payload.activity_id,
            actual_outcome=payload.actual_outcome,
            source=payload.source,
            attachments=attachments_data,
        )
        db.commit()
        # Reload with details for complete response
        return service.get_report_detail(str(report.id), org.id)
    except TenantIsolationError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DuplicateEntityError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create report: {str(e)}")


@router.get("", response_model=ReportListResponse)
def list_reports(
    search: Optional[str] = Query(None, description="Search across report number, description, site, or activity"),
    site_id: Optional[uuid.UUID] = Query(None, description="Filter by installation site"),
    report_type: Optional[str] = Query(None, description="Filter by report classification"),
    activity_id: Optional[uuid.UUID] = Query(None, description="Filter by operational activity"),
    processing_status: Optional[str] = Query(None, description="Filter by processing status"),
    review_status: Optional[str] = Query(None, description="Filter by verification review status"),
    date_from: Optional[datetime] = Query(None, description="Filter by start date (inclusive)"),
    date_to: Optional[datetime] = Query(None, description="Filter by end date (inclusive)"),
    sort_by: str = Query("newest", description="Sorting criteria (newest, oldest, report_number_asc, report_number_desc, site_asc, site_desc, status_asc, status_desc)"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (bounded 1-100)"),
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """
    Returns paginated safety reports matching active search terms, filters, and sort options.
    Strictly scoped to the caller's organization.
    """
    repo = ReportRepository(db)
    skip = (page - 1) * page_size
    resolved_type = normalize_report_type_param(report_type)
    resolved_proc = normalize_processing_status_param(processing_status)
    resolved_rev = normalize_review_status_param(review_status)

    items, total = repo.search_and_list_reports(
        organization_id=org.id,
        search=search,
        site_id=site_id,
        report_type=resolved_type,
        activity_id=activity_id,
        processing_status=resolved_proc,
        review_status=resolved_rev,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        skip=skip,
        limit=page_size,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return ReportListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/bulk-upload/validate", response_model=BulkUploadValidateResponse)
async def validate_bulk_upload(
    request: Request,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """
    Parses and pre-validates batch CSV data without persisting records.
    Provides row-by-row error diagnostics, relation resolution, and duplicate detection.
    Accepts JSON body ({"csv_content": "..."}), multipart form with file, or raw CSV text.
    """
    content = ""
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("file")
        if uploaded_file and hasattr(uploaded_file, "read"):
            raw_bytes = await uploaded_file.read()
            try:
                content = raw_bytes.decode("utf-8")
            except UnicodeDecodeError:
                content = raw_bytes.decode("latin-1")
        elif "csv_text" in form:
            content = str(form.get("csv_text"))
    else:
        try:
            body_json = await request.json()
            if isinstance(body_json, dict):
                content = body_json.get("csv_content") or body_json.get("csv_text") or ""
        except Exception:
            raw_body = await request.body()
            content = raw_body.decode("utf-8", errors="replace")

    if not content or not content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No CSV content provided. Upload a file or provide csv_content string.",
        )

    service = BulkUploadService(db)
    return service.validate_csv(org.id, content)


@router.post("/bulk-upload/commit", response_model=BulkUploadCommitResponse)
def commit_bulk_upload(
    payload: BulkUploadCommitRequest,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """
    Persists pre-validated CSV rows in safe, bounded database batches.
    Generates collision-safe report numbers, applies tenant isolation,
    and logs an audit trail event.
    """
    service = BulkUploadService(db)
    return service.commit_bulk(
        organization_id=org.id,
        rows_to_import=payload.rows,
        skip_duplicates=payload.skip_duplicates,
    )


@router.get("/{identifier}", response_model=ReportDetailResponse)
def get_report(
    identifier: str,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """
    Fetches full report details, hierarchy context (site, location, activity),
    uploaded attachments, and chronological audit history.
    Accepts either UUID or formatted report number (e.g. REP-2026-000001).
    """
    repo = ReportRepository(db)
    report = repo.get_by_id_or_number(identifier, org.id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with identifier '{identifier}' was not found in active organization.",
        )
    
    # Fetch audit events for this report
    history_records = repo.get_audit_history(report.id, org.id)
    history_items = [ReportAuditItem.model_validate(h) for h in history_records]

    # Assemble response
    resp = ReportDetailResponse.model_validate(report)
    resp.history = history_items

    # Fetch latest analysis if available
    analysis_repo = AnalysisRepository(db)
    analysis = analysis_repo.get_by_report(report.id)
    if analysis:
        resp.latest_analysis = SafetyAnalysisService.format_analysis_response(analysis)

    return resp


@router.patch("/{identifier}", response_model=ReportResponse)
def update_report(
    identifier: str,
    payload: ReportUpdate,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """
    Safely updates an existing report's editable fields (description, outcome, site, location, activity).
    Enforces tenant boundaries, preserves immutable identifiers, and logs audit events.
    """
    repo = ReportRepository(db)
    report = repo.get_by_id_or_number(identifier, org.id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with identifier '{identifier}' was not found in active organization.",
        )

    service = ReportPersistenceService(db)
    try:
        update_dict = payload.model_dump(exclude_unset=True)
        updated = service.update_report(
            report_id=report.id,
            organization_id=org.id,
            update_data=update_dict,
        )
        db.commit()
        return service.get_report_detail(str(updated.id), org.id)
    except TenantIsolationError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update report: {str(e)}")


@router.post("/{identifier}/attachments", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
def add_attachment(
    identifier: str,
    payload: AttachmentCreate,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """
    Attaches metadata for an uploaded document or evidence image to a report.
    Validates file extension, size limits, and security constraints.
    """
    repo = ReportRepository(db)
    report = repo.get_by_id_or_number(identifier, org.id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with identifier '{identifier}' was not found in active organization.",
        )

    service = ReportPersistenceService(db)
    try:
        attachment = service.attach_file_metadata(
            report_id=report.id,
            organization_id=org.id,
            filename=payload.filename,
            content_type=payload.content_type,
            size_bytes=payload.size_bytes,
            storage_key=payload.storage_key,
        )
        db.commit()
        return AttachmentResponse.model_validate(attachment)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to attach file: {str(e)}")


@router.post("/{identifier}/analyze", response_model=AnalysisResponse, status_code=status.HTTP_200_OK)
def trigger_analysis(
    identifier: str,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """
    Triggers the SUCHAK Safety NLP Engine to evaluate a safety report.
    Extracts SIF precursors, hazardous energy sources, and barrier degradation signals.
    Enforces idempotency and safety-first failure modes.
    """
    repo = ReportRepository(db)
    report = repo.get_by_id_or_number(identifier, org.id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with identifier '{identifier}' was not found in active organization.",
        )

    service = SafetyAnalysisService(db)
    analysis = service.analyze_report(
        report_id=report.id,
        organization_id=org.id,
        actor_user_id=None,
        force_reanalyze=False,
    )
    return SafetyAnalysisService.format_analysis_response(analysis)


@router.post("/{identifier}/reanalyze", response_model=AnalysisResponse, status_code=status.HTTP_200_OK)
def trigger_reanalysis(
    identifier: str,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """
    Forces re-analysis of an existing safety report through the NLP engine.
    Preserves historical analysis records and creates a new versioned evaluation.
    """
    repo = ReportRepository(db)
    report = repo.get_by_id_or_number(identifier, org.id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with identifier '{identifier}' was not found in active organization.",
        )

    service = SafetyAnalysisService(db)
    analysis = service.analyze_report(
        report_id=report.id,
        organization_id=org.id,
        actor_user_id=None,
        force_reanalyze=True,
    )
    return SafetyAnalysisService.format_analysis_response(analysis)


@router.get("/{identifier}/analysis", response_model=AnalysisResponse, status_code=status.HTTP_200_OK)
def get_report_analysis(
    identifier: str,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """
    Fetches the latest AI analysis result for a given report.
    """
    repo = ReportRepository(db)
    report = repo.get_by_id_or_number(identifier, org.id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with identifier '{identifier}' was not found in active organization.",
        )

    service = SafetyAnalysisService(db)
    analysis = service.get_latest_analysis(report_id=report.id, organization_id=org.id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No analysis has been completed for report '{identifier}'.",
        )
    return SafetyAnalysisService.format_analysis_response(analysis)


@router.get("/{identifier}/analysis/history", response_model=List[AnalysisResponse], status_code=status.HTTP_200_OK)
def get_report_analysis_history(
    identifier: str,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """
    Fetches chronological history of all AI analysis runs performed on a report.
    """
    repo = ReportRepository(db)
    report = repo.get_by_id_or_number(identifier, org.id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with identifier '{identifier}' was not found in active organization.",
        )

    service = SafetyAnalysisService(db)
    analyses = service.list_analysis_history(report_id=report.id, organization_id=org.id)
    return [SafetyAnalysisService.format_analysis_response(a) for a in analyses]

