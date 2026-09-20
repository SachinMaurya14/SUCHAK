"""
SUCHAK HSE Corrective Actions & Alert Notification Entities
Phase 2 Persistence Layer
"""
import uuid
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    Index,
    Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class ActionStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Action(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Corrective/Preventative Action (CAPA) assigned to resolve precursors, barrier degradations, or near-misses.
    """
    __tablename__ = "actions"
    __table_args__ = (
        Index("ix_actions_org_id", "organization_id"),
        Index("ix_actions_report_id", "report_id"),
        Index("ix_actions_status", "status"),
        Index("ix_actions_assigned_to", "assigned_to"),
        Index("ix_actions_due_at", "due_at"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    report_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("reports.id", ondelete="SET NULL"),
        nullable=True,
    )
    pattern_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("patterns.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[ActionStatus] = mapped_column(
        SAEnum(ActionStatus, name="action_status_enum", native_enum=False),
        default=ActionStatus.OPEN,
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    report: Mapped[Optional["Report"]] = relationship("Report")
    pattern: Mapped[Optional["Pattern"]] = relationship("Pattern")
    assignee: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_to])
    creator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by])


class Alert(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    HSE notifications and early-warning trigger alerts.
    """
    __tablename__ = "alerts"
    __table_args__ = (
        Index("ix_alerts_organization_id", "organization_id"),
        Index("ix_alerts_user_id", "user_id"),
        Index("ix_alerts_severity", "severity"),
        Index("ix_alerts_created_at", "created_at"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
    )
    alert_type: Mapped[str] = mapped_column(String(100), default="SIF_PRECURSOR_DETECTED", nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[AlertSeverity] = mapped_column(
        SAEnum(AlertSeverity, name="alert_severity_enum", native_enum=False),
        default=AlertSeverity.MEDIUM,
        nullable=False,
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    user: Mapped[Optional["User"]] = relationship("User")
