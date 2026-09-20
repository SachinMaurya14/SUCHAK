"""
SUCHAK Report Ingestion, Validation & Management Schemas
Phase 3 Core Contracts
"""
import uuid
import re
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict
from backend.app.models.report import ReportType, ProcessingStatus, ReviewStatus


class AttachmentCreate(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., min_length=1, max_length=100)
    size_bytes: int = Field(..., gt=0, le=10 * 1024 * 1024)  # 10MB limit
    storage_key: Optional[str] = Field(None, max_length=500)

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Filename cannot be empty")
        # Prevent directory traversal attacks
        if ".." in clean or "/" in clean or "\\" in clean:
            raise ValueError("Filename cannot contain path navigation characters")
        # Block dangerous executable extensions
        forbidden = [".exe", ".bat", ".cmd", ".sh", ".py", ".pl", ".php", ".js", ".vbs", ".dll", ".so"]
        lower = clean.lower()
        if any(lower.endswith(ext) for ext in forbidden):
            raise ValueError(f"File extension not permitted for security compliance")
        return clean


class AttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    report_id: uuid.UUID
    filename: str
    content_type: str
    size_bytes: int
    storage_key: str
    created_at: datetime


class ReportAuditItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    action: str
    entity_type: str
    entity_id: str
    actor_user_id: Optional[uuid.UUID] = None
    created_at: datetime
    before_data: Optional[Dict[str, Any]] = None
    after_data: Optional[Dict[str, Any]] = None
    metadata_json: Optional[Dict[str, Any]] = None


class NestedSite(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    code: str
    site_type: str


class NestedLocation(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    code: Optional[str] = None


class NestedActivity(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    code: str
    category: Optional[str] = None
    risk_level_baseline: str


class ReportCreate(BaseModel):
    report_type: ReportType
    site_id: uuid.UUID
    location_id: Optional[uuid.UUID] = None
    activity_id: Optional[uuid.UUID] = None
    report_datetime: datetime
    description: str = Field(..., min_length=5, max_length=10000)
    actual_outcome: Optional[str] = Field(None, max_length=5000)
    source: str = Field("PORTAL_WEB", max_length=100)
    attachments: Optional[List[AttachmentCreate]] = None

    @field_validator("report_type", mode="before")
    @classmethod
    def validate_report_type(cls, v: Any) -> ReportType:
        if isinstance(v, ReportType):
            return v
        if isinstance(v, str):
            clean = v.strip().lower().replace("-", "_").replace(" ", "_")
            mapping = {
                "unsafe_act": ReportType.UNSAFE_ACT,
                "unsafe_condition": ReportType.UNSAFE_CONDITION,
                "near_miss": ReportType.NEAR_MISS,
                "incident": ReportType.INCIDENT,
            }
            if clean in mapping:
                return mapping[clean]
        raise ValueError(f"Invalid report_type '{v}'. Must be one of Unsafe Act, Unsafe Condition, Near Miss, Incident.")

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 5:
            raise ValueError("Description must contain at least 5 meaningful characters.")
        return clean

    @field_validator("actual_outcome")
    @classmethod
    def clean_outcome(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip()
        return clean if clean else None

    @field_validator("report_datetime")
    @classmethod
    def validate_datetime(cls, v: datetime) -> datetime:
        # Normalize naive datetime to UTC if needed
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        # Prevent distant future dates (e.g. > 24 hours into future)
        now = datetime.now(timezone.utc)
        if (v - now).total_seconds() > 86400:
            raise ValueError("Report date/time cannot be in the future.")
        return v


class ReportUpdate(BaseModel):
    report_type: Optional[ReportType] = None
    site_id: Optional[uuid.UUID] = None
    location_id: Optional[uuid.UUID] = None
    activity_id: Optional[uuid.UUID] = None
    report_datetime: Optional[datetime] = None
    description: Optional[str] = Field(None, min_length=5, max_length=10000)
    actual_outcome: Optional[str] = Field(None, max_length=5000)

    @field_validator("report_type", mode="before")
    @classmethod
    def validate_report_type(cls, v: Any) -> Optional[ReportType]:
        if v is None:
            return None
        if isinstance(v, ReportType):
            return v
        if isinstance(v, str):
            clean = v.strip().lower().replace("-", "_").replace(" ", "_")
            mapping = {
                "unsafe_act": ReportType.UNSAFE_ACT,
                "unsafe_condition": ReportType.UNSAFE_CONDITION,
                "near_miss": ReportType.NEAR_MISS,
                "incident": ReportType.INCIDENT,
            }
            if clean in mapping:
                return mapping[clean]
        raise ValueError(f"Invalid report_type '{v}'. Must be one of Unsafe Act, Unsafe Condition, Near Miss, Incident.")

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip()
        if len(clean) < 5:
            raise ValueError("Description must contain at least 5 meaningful characters.")
        return clean


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    report_number: str
    report_type: ReportType
    site_id: uuid.UUID
    location_id: Optional[uuid.UUID] = None
    activity_id: Optional[uuid.UUID] = None
    report_datetime: datetime
    description: str
    actual_outcome: Optional[str] = None
    processing_status: ProcessingStatus
    review_status: ReviewStatus
    source: str
    created_at: datetime
    updated_at: datetime
    site: Optional[NestedSite] = None
    location: Optional[NestedLocation] = None
    activity: Optional[NestedActivity] = None
    attachments_count: int = 0


from backend.app.ai.schemas.safety_analysis import AnalysisResponse


class ReportDetailResponse(ReportResponse):
    attachments: List[AttachmentResponse] = []
    history: List[ReportAuditItem] = []
    latest_analysis: Optional[AnalysisResponse] = None


class ReportListResponse(BaseModel):
    items: List[ReportResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
