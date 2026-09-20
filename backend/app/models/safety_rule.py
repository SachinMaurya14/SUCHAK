"""
SUCHAK Life-Saving Rules (IOGP Reference Framework) & Report Mappings
Phase 2 Persistence Layer
"""
import uuid
from typing import Optional
from sqlalchemy import String, Text, Float, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class LifeSavingRule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Life-Saving Rule reference entity (e.g. Energy Isolation, Line of Fire, Confined Space).
    Structured repository for standard safety rules and protocols.
    """
    __tablename__ = "life_saving_rules"

    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)
    source_reference: Mapped[str] = mapped_column(String(100), default="IOGP Report 459 (Prototype Reference)", nullable=False)
    version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)

    # Relationships
    report_mappings: Mapped[list["ReportRuleMapping"]] = relationship(
        "ReportRuleMapping", back_populates="rule", cascade="all, delete-orphan"
    )


class ReportRuleMapping(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Many-to-many mapping connecting Reports to applicable Life-Saving Rules.
    Captures mapping provenance (AI suggested vs Human confirmed) and confidence score.
    """
    __tablename__ = "report_rule_mappings"
    __table_args__ = (
        UniqueConstraint("report_id", "rule_id", name="uq_report_rule_mapping"),
        Index("ix_report_rule_mappings_report_id", "report_id"),
        Index("ix_report_rule_mappings_rule_id", "rule_id"),
    )

    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    rule_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("life_saving_rules.id", ondelete="CASCADE"),
        nullable=False,
    )
    mapping_type: Mapped[str] = mapped_column(String(50), default="AI_SUGGESTED", nullable=False)  # AI_SUGGESTED, HUMAN_CONFIRMED, OVERRIDDEN
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    report: Mapped["Report"] = relationship("Report", back_populates="rule_mappings")
    rule: Mapped["LifeSavingRule"] = relationship("LifeSavingRule", back_populates="report_mappings")
