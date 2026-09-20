"""
SUCHAK API Request Dependencies & Context Resolution
Phase 3 Multi-Tenant Access Control
"""
import uuid
from typing import Optional
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.database import get_db
from backend.app.models.organization import Organization


def get_current_organization(
    db: Session = Depends(get_db),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-Id"),
    x_organization_slug: Optional[str] = Header(None, alias="X-Organization-Slug"),
) -> Organization:
    """
    Resolves tenant context securely for the active request.
    Priority:
    1. Explicit X-Organization-Id header (UUID)
    2. Explicit X-Organization-Slug header (str)
    3. Default active demonstrator organization ('oil-india-demo')
    4. First active organization in the persistence store
    """
    if x_organization_id:
        try:
            target_id = uuid.UUID(x_organization_id)
            stmt = select(Organization).where(Organization.id == target_id, Organization.status == "ACTIVE")
            org = db.execute(stmt).scalar_one_or_none()
            if org:
                return org
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Active organization with ID '{x_organization_id}' not found.",
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid UUID format for X-Organization-Id header.",
            )

    if x_organization_slug:
        stmt = select(Organization).where(Organization.slug == x_organization_slug, Organization.status == "ACTIVE")
        org = db.execute(stmt).scalar_one_or_none()
        if org:
            return org
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active organization with slug '{x_organization_slug}' not found.",
        )

    # Default to prototype tenant 'oil-india-demo'
    stmt = select(Organization).where(Organization.slug == "oil-india-demo", Organization.status == "ACTIVE")
    demo_org = db.execute(stmt).scalar_one_or_none()
    if demo_org:
        return demo_org

    # Fallback to any active organization
    stmt = select(Organization).where(Organization.status == "ACTIVE").limit(1)
    fallback_org = db.execute(stmt).scalar_one_or_none()
    if fallback_org:
        return fallback_org

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Platform configuration error: No active organization is initialized in the persistence store.",
    )
