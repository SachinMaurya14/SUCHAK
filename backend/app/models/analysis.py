"""
SUCHAK AI Analysis Persistence Contracts & Normalized Precursor Taxonomy
Phase 2 Persistence Layer (Schema Only - No AI Logic)
"""
import uuid
import enum
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    String,
    Text,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    JSON,
    Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class SIFPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ModelVersion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Registry entity for model tracking, reproducibility, and governance.
    Tracks NLP models, rule engines, and classifier versions.
    """
    __tablename__ = "model_versions"

    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    model_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., 'SIF_CLASSIFIER', 'PRECURSOR_EXTRACTOR'
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, DEPRECATED, CANDIDATE
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    analysis_results: Mapped[List["AnalysisResult"]] = relationship("AnalysisResult", back_populates="model_version")


class Hazard(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Normalized physical hazard and energy source taxonomy.
    Examples: Pressurized Lines, Suspended Loads, Rotating Equipment, Toxic Gas.
    """
    __tablename__ = "hazards"

    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., 'PRESSURE', 'GRAVITY', 'CHEMICAL'
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    precursors: Mapped[List["Precursor"]] = relationship("Precursor", back_populates="hazard")


class Precursor(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    High-risk precursor signal or weak warning indicator.
    Linked to hazards and energy sources.
    """
    __tablename__ = "precursors"

    hazard_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("hazards.id", ondelete="SET NULL"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., 'LINE_OF_FIRE', 'ENERGY_ISOLATION'
    precursor_type: Mapped[str] = mapped_column(String(100), default="LEADING_INDICATOR", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    hazard: Mapped[Optional["Hazard"]] = relationship("Hazard", back_populates="precursors")


class BarrierFailure(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Normalized barrier degradation and defense failure records.
    Examples: Bypass of Safety Interlock, Defective Pressure Relief, Missing Guard.
    """
    __tablename__ = "barrier_failures"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    barrier_type: Mapped[str] = mapped_column(String(100), nullable=False)  # 'ENGINEERED', 'ADMINISTRATIVE', 'HUMAN'
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class AnalysisResult(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Structured persistence contract for future AI inference outputs.
    Stores SIF potential, confidence scores, priority, and structured findings.
    """
    __tablename__ = "analysis_results"
    __table_args__ = (
        Index("ix_analysis_results_report_id", "report_id"),
        Index("ix_analysis_results_priority", "priority"),
        Index("ix_analysis_results_sif_potential", "sif_potential"),
        Index("ix_analysis_results_created_at", "created_at"),
    )

    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    model_version_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("model_versions.id", ondelete="SET NULL"),
        nullable=True,
    )
    sif_potential: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    priority: Mapped[SIFPriority] = mapped_column(
        SAEnum(SIFPriority, name="sif_priority_enum", native_enum=False),
        default=SIFPriority.MEDIUM,
        nullable=False,
    )
    sif_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="COMPLETED", nullable=False)
    analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    report: Mapped["Report"] = relationship("Report", back_populates="analysis_results")
    model_version: Mapped[Optional["ModelVersion"]] = relationship("ModelVersion", back_populates="analysis_results")
    analysis_hazards: Mapped[List["AnalysisHazard"]] = relationship("AnalysisHazard", back_populates="analysis_result", cascade="all, delete-orphan")
    analysis_precursors: Mapped[List["AnalysisPrecursor"]] = relationship("AnalysisPrecursor", back_populates="analysis_result", cascade="all, delete-orphan")
    analysis_barrier_failures: Mapped[List["AnalysisBarrierFailure"]] = relationship("AnalysisBarrierFailure", back_populates="analysis_result", cascade="all, delete-orphan")


class AnalysisHazard(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Junction entity mapping identified Hazards to an AnalysisResult."""
    __tablename__ = "analysis_hazards"

    analysis_result_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("analysis_results.id", ondelete="CASCADE"),
        nullable=False,
    )
    hazard_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("hazards.id", ondelete="CASCADE"),
        nullable=False,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    analysis_result: Mapped["AnalysisResult"] = relationship("AnalysisResult", back_populates="analysis_hazards")
    hazard: Mapped["Hazard"] = relationship("Hazard")


class AnalysisPrecursor(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Junction entity mapping identified Precursors to an AnalysisResult."""
    __tablename__ = "analysis_precursors"

    analysis_result_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("analysis_results.id", ondelete="CASCADE"),
        nullable=False,
    )
    precursor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("precursors.id", ondelete="CASCADE"),
        nullable=False,
    )
    severity: Mapped[Optional[str]] = mapped_column(String(50), default="MODERATE", nullable=True)

    # Relationships
    analysis_result: Mapped["AnalysisResult"] = relationship("AnalysisResult", back_populates="analysis_precursors")
    precursor: Mapped["Precursor"] = relationship("Precursor")


class AnalysisBarrierFailure(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Junction entity mapping identified Barrier Failures to an AnalysisResult."""
    __tablename__ = "analysis_barrier_failures"

    analysis_result_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("analysis_results.id", ondelete="CASCADE"),
        nullable=False,
    )
    barrier_failure_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("barrier_failures.id", ondelete="CASCADE"),
        nullable=False,
    )
    degradation_level: Mapped[Optional[str]] = mapped_column(String(50), default="COMPROMISED", nullable=True)

    # Relationships
    analysis_result: Mapped["AnalysisResult"] = relationship("AnalysisResult", back_populates="analysis_barrier_failures")
    barrier_failure: Mapped["BarrierFailure"] = relationship("BarrierFailure")
