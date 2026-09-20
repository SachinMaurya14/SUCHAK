"""
SUCHAK Persistence Service Layer
Phase 2 Persistence Architecture
Coordinates multi-entity operations, enforces tenant isolation, and writes audit trails.
"""
from typing import Optional, List, Dict, Any, Tuple
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.app.models.organization import Organization, OrganizationSetting, Site, Location, Activity
from backend.app.models.user import User, Role, UserRole
from backend.app.models.report import Report, ReportType, ProcessingStatus, ReviewStatus, ReportAttachment
from backend.app.models.review import Review, ReviewFeedback
from backend.app.models.audit import AuditLog
from backend.app.repositories.repositories import (
    OrganizationRepository,
    UserRepository,
    SiteRepository,
    LocationRepository,
    ActivityRepository,
    ReportRepository,
    ReviewRepository,
    AuditRepository,
)
from backend.app.core.errors import EntityNotFoundError, DuplicateEntityError, TenantIsolationError


class AuditService:
    def __init__(self, session: Session):
        self.session = session
        self.repo = AuditRepository(session)

    def log_event(
        self,
        organization_id: Optional[uuid.UUID],
        actor_user_id: Optional[uuid.UUID],
        entity_type: str,
        entity_id: str,
        action: str,
        before_data: Optional[Dict[str, Any]] = None,
        after_data: Optional[Dict[str, Any]] = None,
        metadata_json: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        return self.repo.record_action(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_data=before_data,
            after_data=after_data,
            metadata_json=metadata_json,
        )


class OrganizationService:
    def __init__(self, session: Session):
        self.session = session
        self.org_repo = OrganizationRepository(session)
        self.site_repo = SiteRepository(session)
        self.activity_repo = ActivityRepository(session)
        self.audit_service = AuditService(session)

    def create_organization(self, name: str, slug: str, status: str = "ACTIVE") -> Organization:
        existing = self.org_repo.get_by_slug(slug)
        if existing:
            raise DuplicateEntityError("Organization", "slug", slug)
        
        org = Organization(name=name, slug=slug, status=status)
        self.org_repo.add(org)
        
        # Provision default settings
        settings = OrganizationSetting(
            organization_id=org.id,
            timezone="Asia/Kolkata",
            risk_display_preferences={"color_scheme": "standard_hse", "show_sif_badges": True},
            report_config={"allow_anonymous_reports": False, "auto_queue_ai": True},
            notification_preferences={"sif_alert_threshold": "HIGH"},
            metadata_json={"provisioned_at_phase": "Phase 2"},
        )
        self.session.add(settings)
        self.session.flush()

        self.audit_service.log_event(
            organization_id=org.id,
            actor_user_id=None,
            entity_type="ORGANIZATION",
            entity_id=str(org.id),
            action="CREATED",
            after_data={"name": name, "slug": slug, "status": status},
        )
        return org

    def create_site(
        self,
        organization_id: uuid.UUID,
        name: str,
        code: str,
        site_type: str = "DRILLING_RIG",
    ) -> Site:
        existing = self.site_repo.get_by_code(organization_id, code)
        if existing:
            raise DuplicateEntityError("Site", "code", code)
        
        site = Site(organization_id=organization_id, name=name, code=code, site_type=site_type)
        self.site_repo.add(site)
        self.audit_service.log_event(
            organization_id=organization_id,
            actor_user_id=None,
            entity_type="SITE",
            entity_id=str(site.id),
            action="CREATED",
            after_data={"name": name, "code": code, "site_type": site_type},
        )
        return site

    def add_location(
        self,
        site_id: uuid.UUID,
        name: str,
        code: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Location:
        site = self.site_repo.get_by_id(site_id)
        if not site:
            raise EntityNotFoundError("Site", site_id)
        
        location = Location(site_id=site_id, name=name, code=code, description=description)
        self.session.add(location)
        self.session.flush()
        return location

    def create_activity(
        self,
        organization_id: uuid.UUID,
        name: str,
        code: str,
        category: Optional[str] = None,
        risk_level_baseline: str = "MEDIUM",
    ) -> Activity:
        existing = self.activity_repo.get_by_code(organization_id, code)
        if existing:
            raise DuplicateEntityError("Activity", "code", code)
        
        activity = Activity(
            organization_id=organization_id,
            name=name,
            code=code,
            category=category,
            risk_level_baseline=risk_level_baseline,
        )
        self.activity_repo.add(activity)
        return activity


class ReportPersistenceService:
    def __init__(self, session: Session):
        self.session = session
        self.report_repo = ReportRepository(session)
        self.site_repo = SiteRepository(session)
        self.location_repo = LocationRepository(session)
        self.activity_repo = ActivityRepository(session)
        self.audit_service = AuditService(session)

    def create_report(
        self,
        organization_id: uuid.UUID,
        report_type: ReportType,
        site_id: uuid.UUID,
        report_datetime: datetime,
        description: str,
        report_number: Optional[str] = None,
        location_id: Optional[uuid.UUID] = None,
        activity_id: Optional[uuid.UUID] = None,
        actual_outcome: Optional[str] = None,
        created_by: Optional[uuid.UUID] = None,
        source: str = "PORTAL_WEB",
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Report:
        # Enforce site belongs to organization
        site = self.site_repo.get_by_id_scoped(site_id, organization_id)
        if not site:
            raise TenantIsolationError("Site does not belong to the target organization.")

        # Enforce location belongs to the site
        if location_id:
            loc = self.session.query(Location).filter_by(id=location_id, site_id=site_id).first()
            if not loc:
                raise TenantIsolationError("Location does not belong to the selected site.")

        # Enforce activity belongs to organization
        if activity_id:
            act = self.activity_repo.get_by_id_scoped(activity_id, organization_id)
            if not act:
                raise TenantIsolationError("Activity does not belong to the target organization.")

        # Auto-generate collision-safe report number if not provided
        if not report_number:
            report_number = self.report_repo.generate_next_report_number(organization_id)

        # Check duplicate report number within organization
        existing = self.report_repo.get_by_number(organization_id, report_number)
        if existing:
            raise DuplicateEntityError("Report", "report_number", report_number)

        report = Report(
            organization_id=organization_id,
            report_number=report_number,
            report_type=report_type,
            site_id=site_id,
            location_id=location_id,
            activity_id=activity_id,
            report_datetime=report_datetime,
            description=description,
            actual_outcome=actual_outcome,
            processing_status=ProcessingStatus.SUBMITTED,
            review_status=ReviewStatus.PENDING,
            source=source,
            created_by=created_by,
        )
        self.report_repo.add(report)

        # Process attachments if present
        if attachments:
            for att_data in attachments:
                att = ReportAttachment(
                    report_id=report.id,
                    filename=att_data["filename"],
                    content_type=att_data["content_type"],
                    size_bytes=att_data["size_bytes"],
                    storage_key=att_data.get("storage_key") or f"attachments/{organization_id}/{report.id}/{uuid.uuid4().hex[:8]}-{att_data['filename']}",
                )
                self.session.add(att)

        self.audit_service.log_event(
            organization_id=organization_id,
            actor_user_id=created_by,
            entity_type="REPORT",
            entity_id=str(report.id),
            action="REPORT_CREATED",
            after_data={
                "report_number": report_number,
                "report_type": report_type.value,
                "site_id": str(site_id),
                "location_id": str(location_id) if location_id else None,
                "activity_id": str(activity_id) if activity_id else None,
                "processing_status": report.processing_status.value,
            },
        )
        return report

    def update_report(
        self,
        report_id: uuid.UUID,
        organization_id: uuid.UUID,
        update_data: Dict[str, Any],
        actor_user_id: Optional[uuid.UUID] = None,
    ) -> Report:
        """
        Updates an existing report with relationship validation and audit trail logging.
        Guarantees tenant isolation and preserves immutable fields.
        """
        report = self.report_repo.get_by_id_scoped(report_id, organization_id)
        if not report:
            raise EntityNotFoundError("Report", report_id)

        # Prevent modification of immutable fields
        for forbidden_field in ["id", "organization_id", "report_number", "created_at"]:
            if forbidden_field in update_data:
                raise TenantIsolationError(f"Field '{forbidden_field}' cannot be modified.")

        before_data = {
            "report_type": report.report_type.value if hasattr(report.report_type, "value") else str(report.report_type),
            "site_id": str(report.site_id),
            "location_id": str(report.location_id) if report.location_id else None,
            "activity_id": str(report.activity_id) if report.activity_id else None,
            "description": report.description,
            "actual_outcome": report.actual_outcome,
            "report_datetime": report.report_datetime.isoformat(),
        }

        # Validate target site if changed
        target_site_id = update_data.get("site_id", report.site_id)
        if "site_id" in update_data:
            site = self.site_repo.get_by_id_scoped(target_site_id, organization_id)
            if not site:
                raise TenantIsolationError("Site does not belong to the target organization.")
            report.site_id = target_site_id

        # Validate target location
        if "location_id" in update_data:
            loc_id = update_data["location_id"]
            if loc_id is not None:
                loc = self.session.query(Location).filter_by(id=loc_id, site_id=target_site_id).first()
                if not loc:
                    raise TenantIsolationError("Location does not belong to the selected site.")
            report.location_id = loc_id

        # Validate target activity
        if "activity_id" in update_data:
            act_id = update_data["activity_id"]
            if act_id is not None:
                act = self.activity_repo.get_by_id_scoped(act_id, organization_id)
                if not act:
                    raise TenantIsolationError("Activity does not belong to the target organization.")
            report.activity_id = act_id

        if "report_type" in update_data and update_data["report_type"] is not None:
            report.report_type = update_data["report_type"]

        if "report_datetime" in update_data and update_data["report_datetime"] is not None:
            report.report_datetime = update_data["report_datetime"]

        if "description" in update_data and update_data["description"] is not None:
            report.description = update_data["description"]

        if "actual_outcome" in update_data:
            report.actual_outcome = update_data["actual_outcome"]

        report.updated_at = datetime.now(timezone.utc)
        self.session.flush()

        after_data = {
            "report_type": report.report_type.value if hasattr(report.report_type, "value") else str(report.report_type),
            "site_id": str(report.site_id),
            "location_id": str(report.location_id) if report.location_id else None,
            "activity_id": str(report.activity_id) if report.activity_id else None,
            "description": report.description,
            "actual_outcome": report.actual_outcome,
            "report_datetime": report.report_datetime.isoformat(),
        }

        self.audit_service.log_event(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            entity_type="REPORT",
            entity_id=str(report.id),
            action="REPORT_UPDATED",
            before_data=before_data,
            after_data=after_data,
        )
        return report

    def get_report_detail(self, identifier: str, organization_id: uuid.UUID) -> Optional[Report]:
        return self.report_repo.get_by_id_or_number(identifier, organization_id)

    def update_processing_status(
        self,
        report_id: uuid.UUID,
        organization_id: uuid.UUID,
        new_status: ProcessingStatus,
        actor_user_id: Optional[uuid.UUID] = None,
    ) -> Report:
        report = self.report_repo.get_by_id_scoped(report_id, organization_id)
        if not report:
            raise EntityNotFoundError("Report", report_id)
        
        old_status = report.processing_status.value
        report.processing_status = new_status
        self.session.flush()

        self.audit_service.log_event(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            entity_type="REPORT",
            entity_id=str(report.id),
            action="STATUS_CHANGED",
            before_data={"processing_status": old_status},
            after_data={"processing_status": new_status.value},
        )
        return report

    def attach_file_metadata(
        self,
        report_id: uuid.UUID,
        organization_id: uuid.UUID,
        filename: str,
        content_type: str,
        size_bytes: int,
        storage_key: Optional[str] = None,
        actor_user_id: Optional[uuid.UUID] = None,
    ) -> ReportAttachment:
        report = self.report_repo.get_by_id_scoped(report_id, organization_id)
        if not report:
            raise EntityNotFoundError("Report", report_id)
        
        resolved_key = storage_key or f"attachments/{organization_id}/{report_id}/{uuid.uuid4().hex[:8]}-{filename}"

        attachment = ReportAttachment(
            report_id=report_id,
            filename=filename,
            content_type=content_type,
            size_bytes=size_bytes,
            storage_key=resolved_key,
        )
        self.session.add(attachment)
        self.session.flush()

        self.audit_service.log_event(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            entity_type="REPORT",
            entity_id=str(report.id),
            action="ATTACHMENT_ADDED",
            after_data={
                "attachment_id": str(attachment.id),
                "filename": filename,
                "size_bytes": size_bytes,
            },
        )
        return attachment


class ReviewPersistenceService:
    def __init__(self, session: Session):
        self.session = session
        self.review_repo = ReviewRepository(session)
        self.report_repo = ReportRepository(session)
        self.audit_service = AuditService(session)

    def record_review(
        self,
        report_id: uuid.UUID,
        organization_id: uuid.UUID,
        reviewer_id: uuid.UUID,
        final_sif_decision: bool,
        ai_decision_sif: Optional[bool] = None,
        comment: Optional[str] = None,
        feedback_category: Optional[str] = None,
        feedback_text: Optional[str] = None,
    ) -> Review:
        report = self.report_repo.get_by_id_scoped(report_id, organization_id)
        if not report:
            raise EntityNotFoundError("Report", report_id)
        
        override = (ai_decision_sif is not None) and (ai_decision_sif != final_sif_decision)

        review = Review(
            report_id=report_id,
            reviewer_id=reviewer_id,
            ai_decision_sif=ai_decision_sif,
            final_sif_decision=final_sif_decision,
            decision_override=override,
            comment=comment,
        )
        self.review_repo.add(review)

        if feedback_category and feedback_text:
            feedback = ReviewFeedback(
                review_id=review.id,
                category=feedback_category,
                feedback_text=feedback_text,
            )
            self.session.add(feedback)

        report.review_status = ReviewStatus.APPROVED if final_sif_decision else ReviewStatus.APPROVED
        report.processing_status = ProcessingStatus.REVIEWED
        self.session.flush()

        self.audit_service.log_event(
            organization_id=organization_id,
            actor_user_id=reviewer_id,
            entity_type="REVIEW",
            entity_id=str(review.id),
            action="REVIEWED",
            after_data={
                "report_id": str(report_id),
                "final_sif_decision": final_sif_decision,
                "decision_override": override,
            },
        )
        return review
