"""
SUCHAK Core Report, Attachments & Embedding Metadata Entities
Phase 2 Persistence Layer
"""
import uuid
import enum
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Integer,
    Boolean,
    ForeignKey,
    UniqueConstraint,
    Index,
    JSON,
    Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class ReportType(str, enum.Enum):
    UNSAFE_ACT = "Unsafe Act"
    UNSAFE_CONDITION = "Unsafe Condition"
    NEAR_MISS = "Near Miss"
    INCIDENT = "Incident"


class ProcessingStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    ANALYZED = "ANALYZED"
    ANALYSIS_FAILED = "ANALYSIS_FAILED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    REVIEWED = "REVIEWED"
    ARCHIVED = "ARCHIVED"


class ReviewStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    NEEDS_INFO = "NEEDS_INFO"


class Report(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Core Safety Report Entity for SUCHAK.
    Centralized store for observation logs, near-misses, and incident reports.
    Protected from hard deletion using soft-delete flag to preserve compliance history.
    """
    __tablename__ = "reports"
    __table_args__ = (
        UniqueConstraint("organization_id", "report_number", name="uq_report_org_number"),
        Index("ix_reports_org_id", "organization_id"),
        Index("ix_reports_site_id", "site_id"),
        Index("ix_reports_location_id", "location_id"),
        Index("ix_reports_activity_id", "activity_id"),
        Index("ix_reports_type", "report_type"),
        Index("ix_reports_datetime", "report_datetime"),
        Index("ix_reports_processing_status", "processing_status"),
        Index("ix_reports_review_status", "review_status"),
        Index("ix_reports_created_at", "created_at"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    report_number: Mapped[str] = mapped_column(String(100), nullable=False)
    report_type: Mapped[ReportType] = mapped_column(
        SAEnum(ReportType, name="report_type_enum", native_enum=False),
        nullable=False,
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sites.id", ondelete="RESTRICT"),
        nullable=False,
    )
    location_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True,
    )
    activity_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("activities.id", ondelete="SET NULL"),
        nullable=True,
    )
    report_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    actual_outcome: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Controlled State Machine Lifecycles
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        SAEnum(ProcessingStatus, name="processing_status_enum", native_enum=False),
        default=ProcessingStatus.SUBMITTED,
        nullable=False,
    )
    review_status: Mapped[ReviewStatus] = mapped_column(
        SAEnum(ReviewStatus, name="review_status_enum", native_enum=False),
        default=ReviewStatus.PENDING,
        nullable=False,
    )
    source: Mapped[str] = mapped_column(String(100), default="PORTAL_WEB", nullable=False)
    
    # Audit & Soft Deletion
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    site: Mapped["Site"] = relationship("Site")
    location: Mapped[Optional["Location"]] = relationship("Location")
    activity: Mapped[Optional["Activity"]] = relationship("Activity")
    creator: Mapped[Optional["User"]] = relationship("User")
    attachments: Mapped[List["ReportAttachment"]] = relationship("ReportAttachment", back_populates="report", cascade="all, delete-orphan")
    analysis_results: Mapped[List["AnalysisResult"]] = relationship("AnalysisResult", back_populates="report", cascade="all, delete-orphan")
    rule_mappings: Mapped[List["ReportRuleMapping"]] = relationship("ReportRuleMapping", back_populates="report", cascade="all, delete-orphan")
    embedding: Mapped[Optional["ReportEmbedding"]] = relationship("ReportEmbedding", back_populates="report", uselist=False, cascade="all, delete-orphan")
    reviews: Mapped[List["Review"]] = relationship("Review", back_populates="report", cascade="all, delete-orphan")


class ReportAttachment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Metadata for uploaded attachments (images, PDFs, documents).
    Files reside in object storage; this table stores safe metadata references.
    """
    __tablename__ = "report_attachments"
    __table_args__ = (
        Index("ix_report_attachments_report_id", "report_id"),
    )

    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)

    # Relationships
    report: Mapped["Report"] = relationship("Report", back_populates="attachments")


class ReportEmbedding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Persistence schema for future semantic embeddings and vector index linkages.
    Enables clean association of vector references without forcing specific vector extensions.
    """
    __tablename__ = "report_embeddings"
    __table_args__ = (
        Index("ix_report_embeddings_report_id", "report_id"),
    )

    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    embedding_model: Mapped[str] = mapped_column(String(100), nullable=False)
    dimensions: Mapped[int] = mapped_column(Integer, nullable=False)
    vector_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # FAISS index ID or external vector ID
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    report: Mapped["Report"] = relationship("Report", back_populates="embedding")
