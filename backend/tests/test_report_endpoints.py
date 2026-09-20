"""
SUCHAK Safety Report Management Endpoints Integration Tests
Tests reference data, report ingestion, list/search/filters, detail retrieval,
updates, attachments, and bulk CSV validation/commit.
"""
import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.app.models.organization import Organization, Site, Location, Activity
from backend.app.models.report import Report, ReportType, ProcessingStatus, ReviewStatus


def test_reference_data_endpoints(client: TestClient, db_session, org_factory):
    org = org_factory(name="DeepWater Offshore Ltd", slug="deepwater-offshore")
    
    # Create sites, locations, and activities
    site1 = Site(organization_id=org.id, name="Rig Sagar Vijay", code="RIG-SV", site_type="DRILLING_RIG")
    site2 = Site(organization_id=org.id, name="Platform Alpha", code="PLT-ALP", site_type="PRODUCTION_PLATFORM")
    db_session.add_all([site1, site2])
    db_session.flush()

    loc1 = Location(site_id=site1.id, name="Drill Floor", code="DF-01")
    loc2 = Location(site_id=site1.id, name="Mud Pump Room", code="MPR-01")
    act1 = Activity(organization_id=org.id, name="Tripping Pipe", code="ACT-TRIP", risk_level_baseline="HIGH")
    db_session.add_all([loc1, loc2, act1])
    db_session.commit()

    headers = {"X-Organization-Slug": "deepwater-offshore"}

    # 1. Test GET /sites
    resp = client.get("/api/v1/sites", headers=headers)
    assert resp.status_code == 200
    sites = resp.json()
    assert len(sites) >= 2
    site_codes = [s["code"] for s in sites]
    assert "RIG-SV" in site_codes
    assert "PLT-ALP" in site_codes

    # 2. Test GET /sites/{id}/locations
    resp = client.get(f"/api/v1/sites/{site1.id}/locations", headers=headers)
    assert resp.status_code == 200
    locs = resp.json()
    assert len(locs) == 2
    loc_names = [l["name"] for l in locs]
    assert "Drill Floor" in loc_names
    assert "Mud Pump Room" in loc_names

    # 3. Test GET /activities
    resp = client.get("/api/v1/activities", headers=headers)
    assert resp.status_code == 200
    acts = resp.json()
    assert any(a["code"] == "ACT-TRIP" for a in acts)

    # 4. Test GET /report-types
    resp = client.get("/api/v1/report-types", headers=headers)
    assert resp.status_code == 200
    types = resp.json()
    assert len(types) == 4
    type_vals = [t["value"] for t in types]
    assert "Unsafe Act" in type_vals
    assert "Incident" in type_vals


def test_create_and_get_report(client: TestClient, db_session, org_factory):
    org = org_factory(name="Titan Petrochemicals", slug="titan-petro")
    site = Site(organization_id=org.id, name="Refinery Alpha", code="REF-ALP", site_type="REFINERY")
    db_session.add(site)
    db_session.flush()

    loc = Location(site_id=site.id, name="Catalytic Cracking Unit", code="CCU-01")
    act = Activity(organization_id=org.id, name="Welding Inspection", code="WELD-01", risk_level_baseline="MEDIUM")
    db_session.add_all([loc, act])
    db_session.commit()

    headers = {"X-Organization-Id": str(org.id)}

    # 1. Create Report
    now_str = datetime.now(timezone.utc).isoformat()
    payload = {
        "report_type": "UNSAFE_CONDITION",
        "site_id": str(site.id),
        "location_id": str(loc.id),
        "activity_id": str(act.id),
        "report_datetime": now_str,
        "description": "High-pressure flange shows signs of minor vapor leakage during routine shift rounds.",
        "actual_outcome": "Area barricaded with warning tape and maintenance tagged out.",
        "source": "PORTAL_WEB",
        "attachments": [
            {
                "filename": "flange_inspection_photo.jpg",
                "content_type": "image/jpeg",
                "size_bytes": 1048576,
            }
        ]
    }

    create_resp = client.post("/api/v1/reports", json=payload, headers=headers)
    assert create_resp.status_code == 201
    data = create_resp.json()
    assert data["report_number"].startswith("REP-")
    assert data["processing_status"] == "SUBMITTED"
    assert data["site"]["name"] == "Refinery Alpha"
    assert data["location"]["name"] == "Catalytic Cracking Unit"
    assert data["activity"]["name"] == "Welding Inspection"
    report_id = data["id"]
    report_number = data["report_number"]

    # 2. Get Report By UUID
    get_resp = client.get(f"/api/v1/reports/{report_id}", headers=headers)
    assert get_resp.status_code == 200
    detail = get_resp.json()
    assert detail["id"] == report_id
    assert len(detail["attachments"]) == 1
    assert detail["attachments"][0]["filename"] == "flange_inspection_photo.jpg"
    assert len(detail["history"]) >= 1
    assert any(h["action"] == "REPORT_CREATED" for h in detail["history"])

    # 3. Get Report By Report Number
    get_by_num_resp = client.get(f"/api/v1/reports/{report_number}", headers=headers)
    assert get_by_num_resp.status_code == 200
    assert get_by_num_resp.json()["id"] == report_id

    # 4. Cross-Tenant Protection
    other_org = org_factory(name="Other Tenant Corp", slug="other-tenant")
    other_headers = {"X-Organization-Id": str(other_org.id)}
    unauth_resp = client.get(f"/api/v1/reports/{report_id}", headers=other_headers)
    assert unauth_resp.status_code == 404


def test_list_reports_with_filters(client: TestClient, db_session, org_factory):
    org = org_factory(name="Summit Drilling Corp", slug="summit-drilling")
    site_a = Site(organization_id=org.id, name="Rig Bravo", code="RIG-B", site_type="DRILLING_RIG")
    site_b = Site(organization_id=org.id, name="Rig Charlie", code="RIG-C", site_type="DRILLING_RIG")
    db_session.add_all([site_a, site_b])
    db_session.flush()

    headers = {"X-Organization-Id": str(org.id)}
    base_time = datetime.now(timezone.utc) - timedelta(days=2)

    # Ingest 3 reports
    reports = [
        Report(
            organization_id=org.id,
            report_number="REP-2026-000101",
            report_type=ReportType.UNSAFE_ACT,
            site_id=site_a.id,
            report_datetime=base_time,
            description="Operator failed to secure harness lanyard on derrick board.",
            processing_status=ProcessingStatus.SUBMITTED,
            review_status=ReviewStatus.PENDING,
            source="PORTAL_WEB",
        ),
        Report(
            organization_id=org.id,
            report_number="REP-2026-000102",
            report_type=ReportType.NEAR_MISS,
            site_id=site_a.id,
            report_datetime=base_time + timedelta(hours=6),
            description="Dropped hand wrench fell 10 meters, landing 2 meters from roustabout.",
            processing_status=ProcessingStatus.REVIEWED,
            review_status=ReviewStatus.APPROVED,
            source="PORTAL_WEB",
        ),
        Report(
            organization_id=org.id,
            report_number="REP-2026-000103",
            report_type=ReportType.INCIDENT,
            site_id=site_b.id,
            report_datetime=base_time + timedelta(days=1),
            description="Hydraulic hose rupture caused minor splash onto worker's protective gloves.",
            processing_status=ProcessingStatus.SUBMITTED,
            review_status=ReviewStatus.PENDING,
            source="PORTAL_WEB",
        ),
    ]
    db_session.add_all(reports)
    db_session.commit()

    # 1. Test Search
    resp = client.get("/api/v1/reports?search=wrench", headers=headers)
    assert resp.status_code == 200
    res = resp.json()
    assert res["total"] == 1
    assert res["items"][0]["report_number"] == "REP-2026-000102"

    # 2. Test Filter by Site
    resp = client.get(f"/api/v1/reports?site_id={site_b.id}", headers=headers)
    assert resp.status_code == 200
    res = resp.json()
    assert res["total"] == 1
    assert res["items"][0]["report_number"] == "REP-2026-000103"

    # 3. Test Filter by Report Type
    resp = client.get("/api/v1/reports?report_type=NEAR_MISS", headers=headers)
    assert resp.status_code == 200
    res = resp.json()
    assert res["total"] == 1
    assert res["items"][0]["report_number"] == "REP-2026-000102"

    # 4. Test Pagination
    resp = client.get("/api/v1/reports?page=1&page_size=2", headers=headers)
    assert resp.status_code == 200
    res = resp.json()
    assert res["total"] == 3
    assert len(res["items"]) == 2
    assert res["total_pages"] == 2


def test_update_report_and_attachment(client: TestClient, db_session, org_factory):
    org = org_factory(name="Vertex Energy", slug="vertex-energy")
    site = Site(organization_id=org.id, name="FPSO Ocean Queen", code="FPSO-OQ", site_type="FPSO")
    db_session.add(site)
    db_session.flush()

    report = Report(
        organization_id=org.id,
        report_number="REP-2026-000201",
        report_type=ReportType.UNSAFE_CONDITION,
        site_id=site.id,
        report_datetime=datetime.now(timezone.utc),
        description="Corroded handrail identified on deck 3 port side.",
        processing_status=ProcessingStatus.SUBMITTED,
        review_status=ReviewStatus.PENDING,
        source="PORTAL_WEB",
    )
    db_session.add(report)
    db_session.commit()

    headers = {"X-Organization-Id": str(org.id)}

    # 1. Update Description and Actual Outcome
    patch_payload = {
        "description": "Corroded handrail replaced with galvanized scaffolding until drydock.",
        "actual_outcome": "Immediate temporary barrier erected and replacement pipe fabricated.",
    }
    resp = client.patch(f"/api/v1/reports/{report.id}", json=patch_payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "replaced with galvanized" in data["description"]
    assert "fabricated" in data["actual_outcome"]

    # 2. Add Attachment
    att_payload = {
        "filename": "deck_handrail_repair.pdf",
        "content_type": "application/pdf",
        "size_bytes": 204800,
    }
    resp = client.post(f"/api/v1/reports/{report.id}/attachments", json=att_payload, headers=headers)
    assert resp.status_code == 201
    att_data = resp.json()
    assert att_data["filename"] == "deck_handrail_repair.pdf"

    # Verify Detail has the attachment and audit logs
    detail_resp = client.get(f"/api/v1/reports/{report.id}", headers=headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert len(detail["attachments"]) == 1
    assert any(h["action"] == "REPORT_UPDATED" for h in detail["history"])
    assert any(h["action"] == "ATTACHMENT_ADDED" for h in detail["history"])


def test_bulk_csv_validate_and_commit(client: TestClient, db_session, org_factory):
    org = org_factory(name="Global Offshore Ops", slug="global-offshore")
    site = Site(organization_id=org.id, name="Rig North Star", code="RIG-NS", site_type="DRILLING_RIG")
    db_session.add(site)
    db_session.flush()

    loc = Location(site_id=site.id, name="Drill Floor", code="DF-01")
    act = Activity(organization_id=org.id, name="Casing Running", code="ACT-CASE", risk_level_baseline="HIGH")
    db_session.add_all([loc, act])
    db_session.commit()

    headers = {"X-Organization-Id": str(org.id)}

    csv_data = """report_type,site,location,activity,report_datetime,description,actual_outcome
Unsafe Act,RIG-NS,Drill Floor,ACT-CASE,2026-03-15 14:30:00,Floorman standing within red zone while casing elevator in motion,Supervisor intervened immediately
Near Miss,Rig North Star,Drill Floor,Casing Running,2026-03-16 09:15:00,Casing tong slipped off pipe collar due to worn dies,No injury tong swung clear
Invalid Type,NONEXISTENT_SITE,Unknown Loc,ACT-CASE,2026-03-17 11:00:00,Bad,None
"""

    # 1. Validate CSV
    resp = client.post(
        "/api/v1/reports/bulk-upload/validate",
        json={"csv_content": csv_data},
        headers=headers,
    )
    assert resp.status_code == 200
    val_res = resp.json()
    assert val_res["total_rows"] == 3
    assert val_res["valid_rows"] == 2
    assert val_res["invalid_rows"] == 1
    assert val_res["rows"][0]["is_valid"] is True
    assert val_res["rows"][1]["is_valid"] is True
    assert val_res["rows"][2]["is_valid"] is False
    assert len(val_res["rows"][2]["errors"]) >= 1

    # 2. Commit CSV Valid Rows
    valid_rows = [r for r in val_res["rows"] if r["is_valid"]]
    commit_payload = {
        "rows": valid_rows,
        "skip_duplicates": True,
    }
    commit_resp = client.post(
        "/api/v1/reports/bulk-upload/commit",
        json=commit_payload,
        headers=headers,
    )
    assert commit_resp.status_code == 200
    commit_res = commit_resp.json()
    assert commit_res["imported_count"] == 2
    assert commit_res["failed_count"] == 0
    assert len(commit_res["created_reports"]) == 2

    # 3. Verify they exist in reports list
    list_resp = client.get("/api/v1/reports?site_id=" + str(site.id), headers=headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 2
