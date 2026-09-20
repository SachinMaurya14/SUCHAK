"""
SUCHAK Human-in-the-Loop HSE Review & Verification Feedback Entities
Phase 2 Persistence Layer
"""
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, utc_now


class Review(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Expert Safety Reviewer verification record.
    Preserves audit trail comparing automated AI classification with human determination.
    """
    __tablename__ = "reviews"
    __table_args__ = (
        Index("ix_reviews_report_id", "report_id"),
        Index("ix_reviews_reviewer_id", "reviewer_id"),
        Index("ix_reviews_reviewed_at", "reviewed_at"),
    )

    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    ai_decision_sif: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    final_sif_decision: Mapped[bool] = mapped_column(Boolean, nullable=False)
    decision_override: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    report: Mapped["Report"] = relationship("Report", back_populates="reviews")
    reviewer: Mapped["User"] = relationship("User")
    feedback: Mapped[List["ReviewFeedback"]] = relationship("ReviewFeedback", back_populates="review", cascade="all, delete-orphan")


class ReviewFeedback(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Continuous improvement feedback on model quality, false positives, or missing signals.
    """
    __tablename__ = "review_feedback"
    __table_args__ = (
        Index("ix_review_feedback_review_id", "review_id"),
    )

    review_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reviews.id", ondelete="CASCADE"),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., 'FALSE_POSITIVE', 'FALSE_NEGATIVE', 'TAXONOMY_MISMATCH'
    feedback_text: Mapped[str] = mapped_column(Text, nullable=False)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-5 rating scale

    # Relationships
    review: Mapped["Review"] = relationship("Review", back_populates="feedback")
