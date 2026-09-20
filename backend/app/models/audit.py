"""
SUCHAK Audit Trail & Compliance Logging Schema
Phase 2 Persistence Layer
"""
import uuid
from typing import Optional
from sqlalchemy import String, ForeignKey, Index, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class AuditLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Immutable compliance audit record.
    Tracks critical entity modifications, status transitions, and review determinations.
    """
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_organization_id", "organization_id"),
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_audit_logs_actor_id", "actor_user_id"),
        Index("ix_audit_logs_created_at", "created_at"),
    )

    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
    )
    actor_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., 'REPORT', 'REVIEW', 'ACTION'
    entity_id: Mapped[str] = mapped_column(String(100), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., 'CREATED', 'STATUS_CHANGED', 'REVIEWED'
    before_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    after_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    organization: Mapped[Optional["Organization"]] = relationship("Organization")
    actor: Mapped[Optional["User"]] = relationship("User")
