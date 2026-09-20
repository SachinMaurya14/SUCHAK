"""
SUCHAK Multi-Tenant Organization, Site, Location & Activity Entities
Phase 2 Persistence Layer
"""
import uuid
from typing import List, Optional
from sqlalchemy import String, Text, ForeignKey, UniqueConstraint, Index, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class Organization(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Multi-Tenant Root Entity for SUCHAK.
    Guarantees logical tenant isolation for all downstream safety assets.
    """
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, INACTIVE, SUSPENDED

    # Relationships
    sites: Mapped[List["Site"]] = relationship("Site", back_populates="organization", cascade="all, delete-orphan")
    activities: Mapped[List["Activity"]] = relationship("Activity", back_populates="organization", cascade="all, delete-orphan")
    users: Mapped[List["User"]] = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    settings: Mapped[Optional["OrganizationSetting"]] = relationship("OrganizationSetting", back_populates="organization", uselist=False, cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Organization(id={self.id}, slug='{self.slug}', name='{self.name}')>"


class OrganizationSetting(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Tenant-specific configuration and platform display preferences.
    """
    __tablename__ = "organization_settings"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata", nullable=False)
    risk_display_preferences: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    report_config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    notification_preferences: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="settings")


class Site(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Operational installation, offshore/onshore rig, or refinery asset.
    Belongs to an Organization.
    """
    __tablename__ = "sites"
    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_site_org_code"),
        Index("ix_sites_organization_id", "organization_id"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    site_type: Mapped[str] = mapped_column(String(100), default="DRILLING_RIG", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="sites")
    locations: Mapped[List["Location"]] = relationship("Location", back_populates="site", cascade="all, delete-orphan")


class Location(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Specific physical location, deck, compartment, or quadrant within a Site.
    """
    __tablename__ = "locations"
    __table_args__ = (
        UniqueConstraint("site_id", "code", name="uq_location_site_code"),
        Index("ix_locations_site_id", "site_id"),
    )

    site_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sites.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    site: Mapped["Site"] = relationship("Site", back_populates="locations")


class Activity(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Standard operational activity or work discipline categorized by risk exposure.
    Belongs to an Organization.
    """
    __tablename__ = "activities"
    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_activity_org_code"),
        Index("ix_activities_organization_id", "organization_id"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    risk_level_baseline: Mapped[str] = mapped_column(String(50), default="MEDIUM", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="activities")
