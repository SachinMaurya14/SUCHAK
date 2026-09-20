"""
SUCHAK Reference Data Endpoints
Phase 3 Core Reference & Hierarchy Services
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.api.v1.dependencies import get_current_organization
from backend.app.models.organization import Organization
from backend.app.repositories.repositories import SiteRepository, LocationRepository, ActivityRepository
from backend.app.schemas.reference import SiteResponse, LocationResponse, ActivityResponse, ReportTypeInfo
from backend.app.models.report import ReportType

router = APIRouter()


@router.get("/sites", response_model=List[SiteResponse])
def list_sites(
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """Lists all active installation and operational sites scoped to the active tenant organization."""
    site_repo = SiteRepository(db)
    return site_repo.list_active(org.id)


@router.get("/sites/{site_id}/locations", response_model=List[LocationResponse])
def list_site_locations(
    site_id: uuid.UUID,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """Lists all locations belonging to a specific site, enforcing organization boundary."""
    site_repo = SiteRepository(db)
    site = site_repo.get_by_id_scoped(site_id, org.id)
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site with identifier '{site_id}' not found in active organization.",
        )
    return site_repo.list_locations(site_id)


@router.get("/activities", response_model=List[ActivityResponse])
def list_activities(
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
):
    """Lists all active operational activities and work categories for the active tenant organization."""
    act_repo = ActivityRepository(db)
    return act_repo.list_active(org.id)


@router.get("/report-types", response_model=List[ReportTypeInfo])
def list_report_types():
    """Returns official standardized observation and incident classification taxonomy."""
    return [
        ReportTypeInfo(
            value=ReportType.UNSAFE_ACT.value,
            label="Unsafe Act",
            description="Human behavior or procedural deviation that violates safe work procedures and introduces risk.",
        ),
        ReportTypeInfo(
            value=ReportType.UNSAFE_CONDITION.value,
            label="Unsafe Condition",
            description="Physical workplace condition, mechanical flaw, or environmental state capable of causing harm.",
        ),
        ReportTypeInfo(
            value=ReportType.NEAR_MISS.value,
            label="Near Miss",
            description="An unplanned sequence of events that had the potential for injury or asset damage but resulted in none.",
        ),
        ReportTypeInfo(
            value=ReportType.INCIDENT.value,
            label="Incident",
            description="An event resulting in actual personal injury, asset damage, environmental release, or process loss.",
        ),
    ]
