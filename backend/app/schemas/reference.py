"""
SUCHAK Reference Data Schemas
Phase 3 Report Management Foundation
"""
import uuid
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class SiteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    code: str
    site_type: str
    status: str


class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    site_id: uuid.UUID
    name: str
    code: Optional[str] = None
    description: Optional[str] = None


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    code: str
    category: Optional[str] = None
    risk_level_baseline: str
    status: str


class ReportTypeInfo(BaseModel):
    value: str
    label: str
    description: str

