"""
SUCHAK Specialized Repository Implementations
Phase 2 Persistence Architecture
"""
from typing import Optional, List, Any, Dict, Tuple
import uuid
import re
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, and_, or_

from backend.app.models.organization import Organization, OrganizationSetting, Site, Location, Activity
from backend.app.models.user import User, Role, Permission, UserRole
from backend.app.models.report import Report, ReportAttachment, ReportEmbedding, ReportType, ProcessingStatus, ReviewStatus
from backend.app.models.audit import AuditLog
from backend.app.models.analysis import (
    AnalysisResult,
    ModelVersion,
    Hazard,
    Precursor,
    BarrierFailure,
    AnalysisHazard,
    AnalysisPrecursor,
    AnalysisBarrierFailure,
)
from backend.app.models.safety_rule import LifeSavingRule, ReportRuleMapping
from backend.app.models.review import Review, ReviewFeedback
from backend.app.models.action import Action, ActionStatus, Alert
from backend.app.models.audit import AuditLog
from backend.app.repositories.base_repository import BaseRepository
from backend.app.core.errors import EntityNotFoundError, DuplicateEntityError


class OrganizationRepository(BaseRepository[Organization]):
    def __init__(self, session: Session):
        super().__init__(Organization, session)

    def get_by_slug(self, slug: str) -> Optional[Organization]:
        stmt = select(Organization).where(Organization.slug == slug)
        return self.session.execute(stmt).scalar_one_or_none()

    def list_active(self) -> List[Organization]:
        stmt = select(Organization).where(Organization.status == "ACTIVE")
        return list(self.session.execute(stmt).scalars().all())

    def get_settings(self, organization_id: uuid.UUID) -> Optional[OrganizationSetting]:
        stmt = select(OrganizationSetting).where(OrganizationSetting.organization_id == organization_id)
        return self.session.execute(stmt).scalar_one_or_none()


class UserRepository(BaseRepository[User]):
    def __init__(self, session: Session):
        super().__init__(User, session)

    def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email)
        return self.session.execute(stmt).scalar_one_or_none()

    def get_user_roles(self, user_id: uuid.UUID, organization_id: uuid.UUID) -> List[Role]:
        stmt = (
            select(Role)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user_id, UserRole.organization_id == organization_id)
        )
        return list(self.session.execute(stmt).scalars().all())

    def assign_role(self, user_id: uuid.UUID, role_id: uuid.UUID, organization_id: uuid.UUID) -> UserRole:
        # Check existing
        stmt = select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id,
            UserRole.organization_id == organization_id,
        )
        existing = self.session.execute(stmt).scalar_one_or_none()
        if existing:
            return existing
        assignment = UserRole(user_id=user_id, role_id=role_id, organization_id=organization_id)
        self.session.add(assignment)
        self.session.flush()
        return assignment


class SiteRepository(BaseRepository[Site]):
    def __init__(self, session: Session):
        super().__init__(Site, session)

    def get_by_code(self, organization_id: uuid.UUID, code: str) -> Optional[Site]:
        stmt = select(Site).where(Site.organization_id == organization_id, Site.code == code)
        return self.session.execute(stmt).scalar_one_or_none()

    def get_by_name_or_code(self, organization_id: uuid.UUID, identifier: str) -> Optional[Site]:
        clean = identifier.strip()
        stmt = select(Site).where(
            Site.organization_id == organization_id,
            (Site.code.ilike(clean)) | (Site.name.ilike(clean)),
        )
        return self.session.execute(stmt).scalars().first()

    def list_active(self, organization_id: uuid.UUID) -> List[Site]:
        stmt = (
            select(Site)
            .where(Site.organization_id == organization_id, Site.status == "ACTIVE")
            .order_by(Site.name.asc())
        )
        return list(self.session.execute(stmt).scalars().all())

    def list_locations(self, site_id: uuid.UUID) -> List[Location]:
        stmt = select(Location).where(Location.site_id == site_id).order_by(Location.name.asc())
        return list(self.session.execute(stmt).scalars().all())


class LocationRepository(BaseRepository[Location]):
    def __init__(self, session: Session):
        super().__init__(Location, session)

    def get_by_name_or_code_for_site(self, site_id: uuid.UUID, identifier: str) -> Optional[Location]:
        clean = identifier.strip()
        stmt = select(Location).where(
            Location.site_id == site_id,
            (Location.name.ilike(clean)) | (Location.code.ilike(clean)),
        )
        return self.session.execute(stmt).scalars().first()


class ActivityRepository(BaseRepository[Activity]):
    def __init__(self, session: Session):
        super().__init__(Activity, session)

    def get_by_code(self, organization_id: uuid.UUID, code: str) -> Optional[Activity]:
        stmt = select(Activity).where(Activity.organization_id == organization_id, Activity.code == code)
        return self.session.execute(stmt).scalar_one_or_none()

    def get_by_name_or_code(self, organization_id: uuid.UUID, identifier: str) -> Optional[Activity]:
        clean = identifier.strip()
        stmt = select(Activity).where(
            Activity.organization_id == organization_id,
            (Activity.code.ilike(clean)) | (Activity.name.ilike(clean)),
        )
        return self.session.execute(stmt).scalars().first()

    def list_active(self, organization_id: uuid.UUID) -> List[Activity]:
        stmt = (
            select(Activity)
            .where(Activity.organization_id == organization_id, Activity.status == "ACTIVE")
            .order_by(Activity.name.asc())
        )
        return list(self.session.execute(stmt).scalars().all())


class ReportRepository(BaseRepository[Report]):
    def __init__(self, session: Session):
        super().__init__(Report, session)

    def generate_next_report_number(self, organization_id: uuid.UUID, year: Optional[int] = None) -> str:
        """
        Generates a collision-safe, atomic-style, tenant-scoped report sequence identifier:
        REP-YYYY-XXXXXX
        """
        if year is None:
            year = datetime.now(timezone.utc).year
        prefix = f"REP-{year}-"
        
        # Query existing report numbers starting with prefix for this org
        stmt = select(Report.report_number).where(
            Report.organization_id == organization_id,
            Report.report_number.like(f"{prefix}%"),
        )
        existing_numbers = self.session.execute(stmt).scalars().all()
        highest_seq = 0
        for num in existing_numbers:
            try:
                suffix = num[len(prefix):]
                seq = int(suffix)
                if seq > highest_seq:
                    highest_seq = seq
            except ValueError:
                pass

        candidate_seq = highest_seq + 1
        while True:
            candidate = f"REP-{year}-{candidate_seq:06d}"
            check = self.get_by_number(organization_id, candidate)
            if not check:
                return candidate
            candidate_seq += 1

    def get_by_number(self, organization_id: uuid.UUID, report_number: str) -> Optional[Report]:
        stmt = select(Report).where(
            Report.organization_id == organization_id,
            Report.report_number == report_number,
            Report.is_deleted == False,
        )
        return self.session.execute(stmt).scalar_one_or_none()

    def get_by_id_or_number(self, identifier: str, organization_id: uuid.UUID) -> Optional[Report]:
        """Looks up a report by either its UUID or human-readable report_number."""
        conds = [
            Report.organization_id == organization_id,
            Report.is_deleted == False,
        ]
        try:
            val_uuid = uuid.UUID(identifier)
            query_cond = and_(*conds, Report.id == val_uuid)
        except ValueError:
            query_cond = and_(*conds, Report.report_number == identifier)

        stmt = (
            select(Report)
            .options(
                joinedload(Report.site),
                joinedload(Report.location),
                joinedload(Report.activity),
                joinedload(Report.attachments),
            )
            .where(query_cond)
        )
        return self.session.execute(stmt).unique().scalar_one_or_none()

    def get_with_details(self, report_id: uuid.UUID, organization_id: uuid.UUID) -> Optional[Report]:
        stmt = (
            select(Report)
            .options(
                joinedload(Report.site),
                joinedload(Report.location),
                joinedload(Report.activity),
                joinedload(Report.attachments),
                joinedload(Report.rule_mappings).joinedload(ReportRuleMapping.rule),
            )
            .where(
                Report.id == report_id,
                Report.organization_id == organization_id,
                Report.is_deleted == False,
            )
        )
        return self.session.execute(stmt).unique().scalar_one_or_none()

    def search_and_list_reports(
        self,
        organization_id: uuid.UUID,
        search: Optional[str] = None,
        site_id: Optional[uuid.UUID] = None,
        report_type: Optional[ReportType] = None,
        activity_id: Optional[uuid.UUID] = None,
        processing_status: Optional[ProcessingStatus] = None,
        review_status: Optional[ReviewStatus] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        sort_by: str = "newest",
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Report], int]:
        """
        Database-backed search, multi-field filtering, allowlisted sorting,
        and bounded pagination with total record count.
        """
        conditions = [
            Report.organization_id == organization_id,
            Report.is_deleted == False,
        ]

        if site_id:
            conditions.append(Report.site_id == site_id)
        if report_type:
            conditions.append(Report.report_type == report_type)
        if activity_id:
            conditions.append(Report.activity_id == activity_id)
        if processing_status:
            conditions.append(Report.processing_status == processing_status)
        if review_status:
            conditions.append(Report.review_status == review_status)
        if date_from:
            conditions.append(Report.report_datetime >= date_from)
        if date_to:
            conditions.append(Report.report_datetime <= date_to)

        base_query = (
            select(Report)
            .outerjoin(Site, Report.site_id == Site.id)
            .outerjoin(Activity, Report.activity_id == Activity.id)
            .where(and_(*conditions))
        )

        if search and search.strip():
            term = f"%{search.strip()}%"
            search_clause = or_(
                Report.report_number.ilike(term),
                Report.description.ilike(term),
                Report.actual_outcome.ilike(term),
                Site.name.ilike(term),
                Site.code.ilike(term),
                Activity.name.ilike(term),
                Activity.code.ilike(term),
            )
            base_query = base_query.where(search_clause)

        # Efficient total record count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        total = self.session.execute(count_stmt).scalar() or 0

        # Safe sorting allowlist
        order_clauses = []
        if sort_by == "oldest":
            order_clauses = [Report.report_datetime.asc(), Report.created_at.asc()]
        elif sort_by == "report_number_asc":
            order_clauses = [Report.report_number.asc()]
        elif sort_by == "report_number_desc":
            order_clauses = [Report.report_number.desc()]
        elif sort_by == "site_asc":
            order_clauses = [Site.name.asc(), Report.report_datetime.desc()]
        elif sort_by == "site_desc":
            order_clauses = [Site.name.desc(), Report.report_datetime.desc()]
        elif sort_by == "status_asc":
            order_clauses = [Report.processing_status.asc(), Report.report_datetime.desc()]
        elif sort_by == "status_desc":
            order_clauses = [Report.processing_status.desc(), Report.report_datetime.desc()]
        else:  # newest
            order_clauses = [Report.report_datetime.desc(), Report.created_at.desc()]

        stmt = (
            base_query.options(
                joinedload(Report.site),
                joinedload(Report.location),
                joinedload(Report.activity),
                joinedload(Report.attachments),
            )
            .order_by(*order_clauses)
            .offset(skip)
            .limit(limit)
        )
        items = list(self.session.execute(stmt).unique().scalars().all())
        return items, total

    def list_reports(
        self,
        organization_id: uuid.UUID,
        site_id: Optional[uuid.UUID] = None,
        processing_status: Optional[ProcessingStatus] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Report]:
        conditions = [
            Report.organization_id == organization_id,
            Report.is_deleted == False,
        ]
        if site_id:
            conditions.append(Report.site_id == site_id)
        if processing_status:
            conditions.append(Report.processing_status == processing_status)

        stmt = select(Report).where(and_(*conditions)).order_by(Report.report_datetime.desc()).offset(skip).limit(limit)
        return list(self.session.execute(stmt).scalars().all())

    def check_duplicate(
        self,
        organization_id: uuid.UUID,
        site_id: uuid.UUID,
        report_datetime: datetime,
        description: str,
        window_hours: int = 24,
    ) -> Optional[Report]:
        """
        Duplicate detection using organization, site, datetime window, and normalized text.
        """
        start_win = report_datetime - timedelta(hours=window_hours)
        end_win = report_datetime + timedelta(hours=window_hours)
        clean_desc = re.sub(r'\s+', ' ', description.strip().lower())

        stmt = select(Report).where(
            Report.organization_id == organization_id,
            Report.site_id == site_id,
            Report.report_datetime >= start_win,
            Report.report_datetime <= end_win,
            Report.is_deleted == False,
        )
        candidates = self.session.execute(stmt).scalars().all()
        for cand in candidates:
            cand_clean = re.sub(r'\s+', ' ', cand.description.strip().lower())
            if cand_clean == clean_desc:
                return cand
        return None

    def get_audit_history(self, report_id: uuid.UUID, organization_id: uuid.UUID) -> List[AuditLog]:
        stmt = (
            select(AuditLog)
            .where(
                AuditLog.organization_id == organization_id,
                AuditLog.entity_type == "REPORT",
                AuditLog.entity_id == str(report_id),
            )
            .order_by(AuditLog.created_at.asc())
        )
        return list(self.session.execute(stmt).scalars().all())

    def soft_delete(self, report_id: uuid.UUID, organization_id: uuid.UUID) -> bool:
        report = self.get_by_id_scoped(report_id, organization_id)
        if report:
            report.is_deleted = True
            self.session.flush()
            return True
        return False


class HazardRepository(BaseRepository[Hazard]):
    def __init__(self, session: Session):
        super().__init__(Hazard, session)

    def get_by_name(self, name: str) -> Optional[Hazard]:
        stmt = select(Hazard).where(Hazard.name == name)
        return self.session.execute(stmt).scalars().first()

    def list_all(self) -> List[Hazard]:
        stmt = select(Hazard).order_by(Hazard.category.asc(), Hazard.name.asc())
        return list(self.session.execute(stmt).scalars().all())


class ModelVersionRepository(BaseRepository[ModelVersion]):
    def __init__(self, session: Session):
        super().__init__(ModelVersion, session)

    def get_or_create(
        self,
        model_name: str,
        version: str,
        model_type: str = "SIF_CLASSIFIER",
        status: str = "ACTIVE",
        metadata_json: Optional[Dict[str, Any]] = None,
    ) -> ModelVersion:
        stmt = select(ModelVersion).where(
            ModelVersion.model_name == model_name,
            ModelVersion.version == version,
        )
        existing = self.session.execute(stmt).scalar_one_or_none()
        if existing:
            return existing

        new_mv = ModelVersion(
            model_name=model_name,
            version=version,
            model_type=model_type,
            status=status,
            metadata_json=metadata_json or {},
        )
        self.session.add(new_mv)
        self.session.flush()
        return new_mv


class AnalysisRepository(BaseRepository[AnalysisResult]):
    def __init__(self, session: Session):
        super().__init__(AnalysisResult, session)

    def get_by_report(self, report_id: uuid.UUID) -> Optional[AnalysisResult]:
        stmt = (
            select(AnalysisResult)
            .options(
                joinedload(AnalysisResult.model_version),
                joinedload(AnalysisResult.analysis_hazards).joinedload(AnalysisHazard.hazard),
                joinedload(AnalysisResult.analysis_precursors).joinedload(AnalysisPrecursor.precursor),
                joinedload(AnalysisResult.analysis_barrier_failures).joinedload(AnalysisBarrierFailure.barrier_failure),
            )
            .where(AnalysisResult.report_id == report_id)
            .order_by(AnalysisResult.created_at.desc())
        )
        return self.session.execute(stmt).unique().scalars().first()

    def list_by_report(self, report_id: uuid.UUID) -> List[AnalysisResult]:
        stmt = (
            select(AnalysisResult)
            .options(
                joinedload(AnalysisResult.model_version),
                joinedload(AnalysisResult.analysis_hazards).joinedload(AnalysisHazard.hazard),
                joinedload(AnalysisResult.analysis_precursors).joinedload(AnalysisPrecursor.precursor),
                joinedload(AnalysisResult.analysis_barrier_failures).joinedload(AnalysisBarrierFailure.barrier_failure),
            )
            .where(AnalysisResult.report_id == report_id)
            .order_by(AnalysisResult.created_at.desc())
        )
        return list(self.session.execute(stmt).unique().scalars().all())


class ReviewRepository(BaseRepository[Review]):
    def __init__(self, session: Session):
        super().__init__(Review, session)

    def get_by_report(self, report_id: uuid.UUID) -> Optional[Review]:
        stmt = (
            select(Review)
            .options(joinedload(Review.feedback))
            .where(Review.report_id == report_id)
        )
        return self.session.execute(stmt).unique().scalar_one_or_none()


class ActionRepository(BaseRepository[Action]):
    def __init__(self, session: Session):
        super().__init__(Action, session)

    def list_by_status(
        self,
        organization_id: uuid.UUID,
        status: Optional[ActionStatus] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Action]:
        conditions = [Action.organization_id == organization_id]
        if status:
            conditions.append(Action.status == status)
        stmt = select(Action).where(and_(*conditions)).order_by(Action.due_at.asc()).offset(skip).limit(limit)
        return list(self.session.execute(stmt).scalars().all())


class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self, session: Session):
        super().__init__(AuditLog, session)

    def record_action(
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
        log_entry = AuditLog(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            entity_type=entity_type,
            entity_id=str(entity_id),
            action=action,
            before_data=before_data or {},
            after_data=after_data or {},
            metadata_json=metadata_json or {},
        )
        self.session.add(log_entry)
        self.session.flush()
        return log_entry
