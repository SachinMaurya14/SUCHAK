"""
SUCHAK Bulk Ingestion & Validation Service
Phase 3 Core Implementation
Handles parsing, row-level validation, relation resolution, duplicate detection,
and transactional batch ingestion.
"""
import io
import csv
import re
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.models.report import Report, ReportType, ProcessingStatus, ReviewStatus
from backend.app.models.organization import Site, Location, Activity
from backend.app.repositories.repositories import (
    ReportRepository,
    SiteRepository,
    LocationRepository,
    ActivityRepository,
)
from backend.app.services.services import AuditService
from backend.app.schemas.bulk_upload import (
    BulkUploadRowValidation,
    BulkUploadValidateResponse,
    BulkUploadCommitResponse,
)


def parse_datetime_flexible(dt_str: str) -> Optional[datetime]:
    """Tries various common datetime formats to parse report date/time."""
    dt_str = dt_str.strip()
    if not dt_str:
        return None

    formats = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(dt_str, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    try:
        # Fallback to ISO fromisoformat
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def normalize_report_type(raw_val: str) -> Optional[ReportType]:
    """Normalizes raw input to ReportType enum."""
    val = raw_val.strip().lower()
    mapping = {
        "unsafe act": ReportType.UNSAFE_ACT,
        "unsafe_act": ReportType.UNSAFE_ACT,
        "act": ReportType.UNSAFE_ACT,
        "unsafe condition": ReportType.UNSAFE_CONDITION,
        "unsafe_condition": ReportType.UNSAFE_CONDITION,
        "condition": ReportType.UNSAFE_CONDITION,
        "near miss": ReportType.NEAR_MISS,
        "near-miss": ReportType.NEAR_MISS,
        "near_miss": ReportType.NEAR_MISS,
        "incident": ReportType.INCIDENT,
        "accident": ReportType.INCIDENT,
    }
    return mapping.get(val)


class BulkUploadService:
    def __init__(self, session: Session):
        self.session = session
        self.report_repo = ReportRepository(session)
        self.site_repo = SiteRepository(session)
        self.location_repo = LocationRepository(session)
        self.activity_repo = ActivityRepository(session)
        self.audit_service = AuditService(session)

    def validate_csv(self, organization_id: uuid.UUID, csv_content: str) -> BulkUploadValidateResponse:
        """
        Parses CSV, checks header columns, validates all rows, resolves entity relations,
        and identifies duplicates without persisting.
        """
        # Strip BOM if present
        if csv_content.startswith("\ufeff"):
            csv_content = csv_content[1:]

        f = io.StringIO(csv_content)
        reader = csv.reader(f)
        header_row = next(reader, None)
        if not header_row:
            return BulkUploadValidateResponse(
                total_rows=0, valid_rows=0, invalid_rows=0, duplicate_rows=0, rows=[]
            )

        # Normalize headers
        header_map: Dict[str, int] = {}
        for idx, col in enumerate(header_row):
            clean_col = re.sub(r'[^a-z0-9]', '', col.lower())
            header_map[clean_col] = idx

        # Helper to find column index from synonyms
        def get_col_val(row: List[str], *synonyms: str) -> str:
            for syn in synonyms:
                clean_syn = re.sub(r'[^a-z0-9]', '', syn.lower())
                if clean_syn in header_map and header_map[clean_syn] < len(row):
                    return row[header_map[clean_syn]].strip()
            return ""

        # Pre-cache organization active reference sets for fast lookup
        sites = self.site_repo.list_active(organization_id)
        site_by_code = {s.code.lower(): s for s in sites}
        site_by_name = {s.name.lower(): s for s in sites}

        activities = self.activity_repo.list_active(organization_id)
        act_by_code = {a.code.lower(): a for a in activities}
        act_by_name = {a.name.lower(): a for a in activities}

        validated_rows: List[BulkUploadRowValidation] = []
        valid_count = 0
        invalid_count = 0
        duplicate_count = 0

        batch_seen_fingerprints = set()

        row_num = 1
        for row in reader:
            if not row or all(not cell.strip() for cell in row):
                continue
            row_num += 1

            errors: List[str] = []
            warnings: List[str] = []
            is_dup = False

            raw_type = get_col_val(row, "report_type", "observation_type", "type", "category")
            raw_site = get_col_val(row, "site", "site_code", "site_name", "rig", "facility")
            raw_location = get_col_val(row, "location", "location_name", "location_code", "area")
            raw_activity = get_col_val(row, "activity", "activity_code", "activity_name", "operation")
            raw_datetime = get_col_val(row, "report_datetime", "datetime", "date", "date_time", "timestamp")
            raw_desc = get_col_val(row, "description", "narrative", "observation", "details", "summary")
            raw_outcome = get_col_val(row, "actual_outcome", "outcome", "consequence", "impact")

            # 1. Validate Report Type
            norm_type = normalize_report_type(raw_type)
            if not norm_type:
                errors.append(f"Invalid report type '{raw_type}'. Must be Unsafe Act, Unsafe Condition, Near Miss, or Incident.")

            # 2. Validate Description
            if not raw_desc or len(raw_desc.strip()) < 5:
                errors.append("Description is required and must contain at least 5 characters.")

            # 3. Validate Date/Time
            parsed_dt = parse_datetime_flexible(raw_datetime) if raw_datetime else None
            if not parsed_dt:
                errors.append(f"Invalid or missing date/time '{raw_datetime}'. Standard format YYYY-MM-DD HH:MM required.")
            else:
                now = datetime.now(timezone.utc)
                if (parsed_dt - now).total_seconds() > 86400:
                    errors.append("Report date/time cannot be in the future.")

            # 4. Resolve Site
            resolved_site: Optional[Site] = None
            if not raw_site:
                errors.append("Site is required.")
            else:
                site_key = raw_site.lower()
                resolved_site = site_by_code.get(site_key) or site_by_name.get(site_key)
                if not resolved_site:
                    # Fuzzy match fallback
                    for s in sites:
                        if site_key in s.name.lower() or site_key in s.code.lower():
                            resolved_site = s
                            warnings.append(f"Site '{raw_site}' matched to '{s.name}' ({s.code})")
                            break
                if not resolved_site:
                    errors.append(f"Site '{raw_site}' could not be resolved for this organization.")

            # 5. Resolve Location (Scoped to Site!)
            resolved_loc: Optional[Location] = None
            if raw_location and resolved_site:
                site_locations = self.site_repo.list_locations(resolved_site.id)
                loc_key = raw_location.lower()
                for loc in site_locations:
                    if loc.name.lower() == loc_key or (loc.code and loc.code.lower() == loc_key):
                        resolved_loc = loc
                        break
                if not resolved_loc:
                    for loc in site_locations:
                        if loc_key in loc.name.lower():
                            resolved_loc = loc
                            warnings.append(f"Location '{raw_location}' matched to '{loc.name}'")
                            break
                if not resolved_loc:
                    warnings.append(f"Location '{raw_location}' is not a registered location for site '{resolved_site.name}'. It will be omitted.")
            elif raw_location and not resolved_site:
                warnings.append(f"Cannot resolve location '{raw_location}' without valid site.")

            # 6. Resolve Activity
            resolved_act: Optional[Activity] = None
            if raw_activity:
                act_key = raw_activity.lower()
                resolved_act = act_by_code.get(act_key) or act_by_name.get(act_key)
                if not resolved_act:
                    for act in activities:
                        if act_key in act.name.lower() or act_key in act.code.lower():
                            resolved_act = act
                            warnings.append(f"Activity '{raw_activity}' matched to '{act.name}'")
                            break
                if not resolved_act:
                    warnings.append(f"Activity '{raw_activity}' not recognized. It will be omitted.")

            # 7. Duplicate Detection
            resolved_payload = None
            if len(errors) == 0 and resolved_site and parsed_dt:
                # Check within current batch
                fp = f"{resolved_site.id}:{parsed_dt.strftime('%Y-%m-%d')}:{raw_desc.strip().lower()[:100]}"
                if fp in batch_seen_fingerprints:
                    is_dup = True
                    warnings.append("Potential duplicate: Identical observation found earlier in this CSV file.")
                else:
                    batch_seen_fingerprints.add(fp)

                # Check against database
                db_dup = self.report_repo.check_duplicate(
                    organization_id=organization_id,
                    site_id=resolved_site.id,
                    report_datetime=parsed_dt,
                    description=raw_desc,
                    window_hours=24,
                )
                if db_dup:
                    is_dup = True
                    warnings.append(f"Potential duplicate: Matches existing report {db_dup.report_number} in system.")

                resolved_payload = {
                    "report_type": norm_type.value if norm_type else None,
                    "site_id": str(resolved_site.id),
                    "site_name": resolved_site.name,
                    "site_code": resolved_site.code,
                    "location_id": str(resolved_loc.id) if resolved_loc else None,
                    "location_name": resolved_loc.name if resolved_loc else None,
                    "activity_id": str(resolved_act.id) if resolved_act else None,
                    "activity_name": resolved_act.name if resolved_act else None,
                    "report_datetime": parsed_dt.isoformat(),
                    "description": raw_desc.strip(),
                    "actual_outcome": raw_outcome.strip() if raw_outcome else None,
                }

            is_valid = len(errors) == 0
            if is_valid:
                valid_count += 1
                if is_dup:
                    duplicate_count += 1
            else:
                invalid_count += 1

            validated_rows.append(
                BulkUploadRowValidation(
                    row_number=row_num,
                    raw_data={
                        "report_type": raw_type,
                        "site": raw_site,
                        "location": raw_location,
                        "activity": raw_activity,
                        "report_datetime": raw_datetime,
                        "description": raw_desc,
                        "actual_outcome": raw_outcome,
                    },
                    is_valid=is_valid,
                    is_duplicate=is_dup,
                    errors=errors,
                    warnings=warnings,
                    resolved=resolved_payload,
                )
            )

        return BulkUploadValidateResponse(
            total_rows=len(validated_rows),
            valid_rows=valid_count,
            invalid_rows=invalid_count,
            duplicate_rows=duplicate_count,
            rows=validated_rows,
        )

    def commit_bulk(
        self,
        organization_id: uuid.UUID,
        rows_to_import: List[Dict[str, Any]],
        skip_duplicates: bool = True,
        actor_user_id: Optional[uuid.UUID] = None,
    ) -> BulkUploadCommitResponse:
        """
        Commits validated rows in safe bounded batches (50 records per batch).
        Ensures tenant isolation, collision-safe report number generation, and audit trail logging.
        """
        imported = 0
        skipped = 0
        duplicate_count = 0
        failed = 0
        created_reports: List[Dict[str, Any]] = []
        errors: List[str] = []

        batch_size = 50
        current_year = datetime.now(timezone.utc).year

        for i in range(0, len(rows_to_import), batch_size):
            batch = rows_to_import[i : i + batch_size]
            try:
                for row_data in batch:
                    # Check if duplicate skipping requested
                    if row_data.get("is_duplicate") and skip_duplicates:
                        skipped += 1
                        duplicate_count += 1
                        continue

                    res = row_data.get("resolved")
                    if not res:
                        failed += 1
                        errors.append(f"Row {row_data.get('row_number', '?')} lacks resolved payload.")
                        continue

                    # Safe parsing
                    site_id = uuid.UUID(res["site_id"])
                    loc_id = uuid.UUID(res["location_id"]) if res.get("location_id") else None
                    act_id = uuid.UUID(res["activity_id"]) if res.get("activity_id") else None
                    dt = datetime.fromisoformat(res["report_datetime"])
                    rtype = ReportType(res["report_type"])

                    # Generate collision-safe report number
                    rpt_number = self.report_repo.generate_next_report_number(organization_id, current_year)

                    report = Report(
                        organization_id=organization_id,
                        report_number=rpt_number,
                        report_type=rtype,
                        site_id=site_id,
                        location_id=loc_id,
                        activity_id=act_id,
                        report_datetime=dt,
                        description=res["description"],
                        actual_outcome=res.get("actual_outcome"),
                        processing_status=ProcessingStatus.SUBMITTED,
                        review_status=ReviewStatus.PENDING,
                        source="CSV_BULK_INGESTION",
                        created_by=actor_user_id,
                    )
                    self.session.add(report)
                    self.session.flush()

                    created_reports.append({"id": str(report.id), "report_number": rpt_number})
                    imported += 1

                self.session.commit()
            except Exception as e:
                self.session.rollback()
                failed += len(batch)
                errors.append(f"Batch transaction error: {str(e)}")

        # Emit audit log for the bulk ingestion
        if imported > 0:
            try:
                self.audit_service.log_event(
                    organization_id=organization_id,
                    actor_user_id=actor_user_id,
                    entity_type="REPORT_BATCH",
                    entity_id=f"BATCH-{uuid.uuid4().hex[:8]}",
                    action="BULK_IMPORTED",
                    after_data={
                        "imported_count": imported,
                        "skipped_count": skipped,
                        "duplicate_count": duplicate_count,
                        "failed_count": failed,
                    },
                )
                self.session.commit()
            except Exception:
                pass

        return BulkUploadCommitResponse(
            imported_count=imported,
            skipped_count=skipped,
            duplicate_count=duplicate_count,
            failed_count=failed,
            created_reports=created_reports,
            errors=errors,
        )
