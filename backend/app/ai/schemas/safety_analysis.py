"""
SUCHAK Safety Analysis Schemas & Result Contracts
Phase 4 Safety NLP Engine
Strict validation schemas for model output and API contracts.
"""
import uuid
from enum import Enum
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict

from backend.app.models.analysis import SIFPriority


class SIFClassification(str, Enum):
    SIF_POTENTIAL = "SIF_POTENTIAL"
    NON_SIF_POTENTIAL = "NON_SIF_POTENTIAL"
    NEEDS_REVIEW = "NEEDS_REVIEW"

    @classmethod
    def normalize_classification(cls, value: Any) -> "SIFClassification":
        if isinstance(value, cls):
            return value
        if not value:
            return cls.NEEDS_REVIEW
        v_str = str(value).strip().upper().replace(" ", "_").replace("-", "_")
        if v_str in ["SIF", "SIF_POTENTIAL", "YES", "TRUE"]:
            return cls.SIF_POTENTIAL
        if v_str in ["NON_SIF", "NON_SIF_POTENTIAL", "NO", "FALSE"]:
            return cls.NON_SIF_POTENTIAL
        return cls.NEEDS_REVIEW


class ConfidenceBand(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class SafetyAnalysisResult(BaseModel):
    """
    Validated structured output from the Safety NLP Engine.
    Enforces strict typing, bounding, and schema constraints.
    """
    model_config = ConfigDict(extra="ignore")

    classification: SIFClassification = Field(
        ...,
        description="Controlled SIF classification: SIF_POTENTIAL, NON_SIF_POTENTIAL, or NEEDS_REVIEW"
    )
    confidence_estimate: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model confidence estimate (not calibrated empirical probability)"
    )
    confidence_band: ConfidenceBand = Field(
        ConfidenceBand.MEDIUM,
        description="Qualitative confidence band (LOW, MEDIUM, HIGH)"
    )
    priority: SIFPriority = Field(
        SIFPriority.MEDIUM,
        description="Assigned risk priority based on precursor severity and exposure"
    )
    safety_indicators: List[str] = Field(
        default_factory=list,
        description="Explicit physical or operational warning signals detected in the text"
    )
    hazards: List[str] = Field(
        default_factory=list,
        description="Energy source categories identified (PRESSURE, GRAVITY, ELECTRICAL, etc.)"
    )
    precursor_summary: Optional[str] = Field(
        None,
        max_length=500,
        description="Concise synthesis of detected precursor condition"
    )
    evidence: List[str] = Field(
        default_factory=list,
        description="Specific factual excerpts and observations grounded strictly in the report text"
    )
    actual_outcome: Optional[str] = Field(
        None,
        description="Observed actual consequence extracted or normalized from report"
    )
    potential_consequence: str = Field(
        ...,
        min_length=3,
        description="Assessment of potential consequence if barriers had completely failed"
    )
    explanation: str = Field(
        ...,
        min_length=10,
        description="Concise human-readable rationale grounded in report evidence ('WHY FLAGGED')"
    )
    model_name: str = Field(..., description="Underlying model identifier")
    model_version: str = Field(..., description="Model release version or alias")
    prompt_version: str = Field(..., description="Version of the safety analysis prompt used")
    analysis_timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp of inference completion"
    )
    status: str = Field("ANALYZED", description="Status of the analysis job")

    @field_validator("confidence_estimate")
    @classmethod
    def round_confidence(cls, v: float) -> float:
        return round(v, 4)

    @field_validator("classification", mode="before")
    @classmethod
    def normalize_classification(cls, v: Any) -> SIFClassification:
        if isinstance(v, SIFClassification):
            return v
        if isinstance(v, str):
            clean = v.strip().upper().replace(" ", "_").replace("-", "_")
            if clean in ["SIF", "SIF_POTENTIAL", "POTENTIAL_SIF", "SIF_YES", "YES"]:
                return SIFClassification.SIF_POTENTIAL
            if clean in ["NON_SIF", "NON_SIF_POTENTIAL", "NOT_SIF", "SIF_NO", "NO"]:
                return SIFClassification.NON_SIF_POTENTIAL
            if clean in ["NEEDS_REVIEW", "INCONCLUSIVE", "AMBIGUOUS", "REVIEW_REQUIRED", "UNKNOWN"]:
                return SIFClassification.NEEDS_REVIEW
        return SIFClassification.NEEDS_REVIEW


class AnalysisResponse(BaseModel):
    """
    Public REST response contract for safety analysis results.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    report_id: uuid.UUID
    model_version_id: Optional[uuid.UUID] = None
    status: str
    classification: SIFClassification
    sif_potential: Optional[bool] = None
    confidence_estimate: float
    confidence_band: str
    priority: str
    safety_indicators: List[str] = []
    hazards: List[str] = []
    precursor_summary: Optional[str] = None
    evidence: List[str] = []
    actual_outcome: Optional[str] = None
    potential_consequence: Optional[str] = None
    explanation: Optional[str] = None
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    prompt_version: Optional[str] = None
    analyzed_at: Optional[datetime] = None
    created_at: datetime


class AnalysisErrorResponse(BaseModel):
    """
    Response returned when analysis is unavailable or encounters a technical failure.
    Enforces Safety-First failure mode: Never claims SIF=NO.
    """
    report_id: str
    status: str = "ANALYSIS_FAILED"
    message: str = "Analysis unavailable. Review required."
    detail: Optional[str] = None
    fallback_recommended: bool = True
