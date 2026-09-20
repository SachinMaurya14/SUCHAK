"""
SUCHAK Recurring Precursor Patterns & Cluster Membership Schema
Phase 2 Persistence Layer
"""
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, UniqueConstraint, Index, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class Pattern(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Identified pattern or cluster of recurring precursor signals across operational sites.
    Provides persistence for future pattern detection algorithms.
    """
    __tablename__ = "patterns"
    __table_args__ = (
        Index("ix_patterns_organization_id", "organization_id"),
        Index("ix_patterns_status", "status"),
        Index("ix_patterns_created_at", "created_at"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, MITIGATED, ARCHIVED
    occurrence_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    members: Mapped[List["PatternMember"]] = relationship("PatternMember", back_populates="pattern", cascade="all, delete-orphan")


class PatternMember(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Membership linking individual safety reports to a recognized pattern.
    """
    __tablename__ = "pattern_members"
    __table_args__ = (
        UniqueConstraint("pattern_id", "report_id", name="uq_pattern_member"),
        Index("ix_pattern_members_pattern_id", "pattern_id"),
        Index("ix_pattern_members_report_id", "report_id"),
    )

    pattern_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patterns.id", ondelete="CASCADE"),
        nullable=False,
    )
    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    confidence_score: Mapped[Optional[float]] = mapped_column(nullable=True)

    # Relationships
    pattern: Mapped["Pattern"] = relationship("Pattern", back_populates="members")
    report: Mapped["Report"] = relationship("Report")
