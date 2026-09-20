"""
SUCHAK Controlled Seed Data Architecture
Phase 2 Persistence Layer

IMPORTANT NOTICE:
All records seeded by this module represent SYNTHETIC PROTOTYPE DEMO DATA ONLY.
They are explicitly tagged with '[SYNTHETIC DEMO]' or 'DEMO-' prefixes and do NOT
represent actual Oil India Limited (OIL) operational or proprietary incident data.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from sqlalchemy.orm import Session

from backend.app.models.organization import Organization, OrganizationSetting, Site, Location, Activity
from backend.app.models.user import User, Role, Permission, RolePermission, UserRole
from backend.app.models.safety_rule import LifeSavingRule
from backend.app.models.report import Report, ReportType, ProcessingStatus, ReviewStatus
from backend.app.models.analysis import Hazard, Precursor, BarrierFailure, ModelVersion


def seed_database(session: Session) -> Dict[str, Any]:
    """
    Executes controlled seeding of prototype demonstration entities.
    Idempotent: checks for existing records before insertion.
    """
    results = {
        "organizations": 0,
        "roles": 0,
        "permissions": 0,
        "users": 0,
        "sites": 0,
        "locations": 0,
        "activities": 0,
        "life_saving_rules": 0,
        "hazards": 0,
        "precursors": 0,
        "barrier_failures": 0,
        "model_versions": 0,
        "demo_reports": 0,
    }

    # 1. Standard Roles & Permissions
    roles_data = [
        {"code": "OrgAdmin", "name": "Organization Administrator", "description": "Tenant administrator managing users and settings."},
        {"code": "HSEOfficer", "name": "HSE Safety Officer", "description": "HSE professional managing hazard logs and alerts."},
        {"code": "SafetyReviewer", "name": "Senior Safety Reviewer", "description": "Domain expert verifying SIF classifications."},
        {"code": "SiteManager", "name": "Installation Site Manager", "description": "Operational leader executing site safety actions."},
    ]
    role_map = {}
    for r in roles_data:
        existing = session.query(Role).filter_by(code=r["code"]).first()
        if not existing:
            role = Role(code=r["code"], name=r["name"], description=r["description"])
            session.add(role)
            session.flush()
            role_map[r["code"]] = role
            results["roles"] += 1
        else:
            role_map[r["code"]] = existing

    # 2. Demo Organization
    demo_slug = "oil-india-demo"
    org = session.query(Organization).filter_by(slug=demo_slug).first()
    if not org:
        org = Organization(
            name="Oil India Demonstration Asset [SYNTHETIC DEMO]",
            slug=demo_slug,
            status="ACTIVE",
        )
        session.add(org)
        session.flush()

        settings = OrganizationSetting(
            organization_id=org.id,
            timezone="Asia/Kolkata",
            risk_display_preferences={"theme": "high_contrast", "sif_threshold": 0.75},
            report_config={"require_location": True, "enable_precursors": True},
            notification_preferences={"digest_frequency": "DAILY"},
            metadata_json={"is_demo": True, "notice": "Prototype Demonstration Environment"},
        )
        session.add(settings)
        session.flush()
        results["organizations"] += 1

    # 3. Demo Users
    users_data = [
        {"email": "admin.demo@suchak.safety.local", "name": "Ananya Sharma (Admin)", "role": "OrgAdmin"},
        {"email": "hse.officer@suchak.safety.local", "name": "Rajesh Baruah (HSE Officer)", "role": "HSEOfficer"},
        {"email": "reviewer.demo@suchak.safety.local", "name": "Dr. Pradip Gogoi (Safety Reviewer)", "role": "SafetyReviewer"},
        {"email": "site.manager@suchak.safety.local", "name": "Bikash Saikia (Site Manager)", "role": "SiteManager"},
    ]
    user_map = {}
    for u in users_data:
        user = session.query(User).filter_by(email=u["email"]).first()
        if not user:
            user = User(
                organization_id=org.id,
                email=u["email"],
                full_name=u["name"],
                is_active=True,
            )
            session.add(user)
            session.flush()
            
            # Map role
            target_role = role_map.get(u["role"])
            if target_role:
                ur = UserRole(user_id=user.id, role_id=target_role.id, organization_id=org.id)
                session.add(ur)
            results["users"] += 1
            user_map[u["role"]] = user
        else:
            user_map[u["role"]] = user

    # 4. Demo Sites & Locations
    sites_data = [
        {
            "code": "RIG-DIGBOI-04",
            "name": "Digboi Central Rig #4 [SYNTHETIC DEMO]",
            "site_type": "DRILLING_RIG",
            "locations": ["Drill Floor / Rotary Table", "Substructure / Blowout Preventer Stack", "Mud Tank & Chemical Handling Area"],
        },
        {
            "code": "SITE-MORAN-A",
            "name": "Moran Drilling Site A [SYNTHETIC DEMO]",
            "site_type": "DRILLING_RIG",
            "locations": ["Main Pipe Deck", "Crane Lifting Corridor", "Catwalk & V-Door"],
        },
        {
            "code": "GGS-DULIAJAN",
            "name": "Duliajan Gas Gathering Station [SYNTHETIC DEMO]",
            "site_type": "PRODUCTION_FACILITY",
            "locations": ["High Pressure Separator Bank", "Compressor Shed 2", "Flange Manifold Quadrant B"],
        },
    ]
    site_map = {}
    location_map = {}
    for s in sites_data:
        site = session.query(Site).filter_by(organization_id=org.id, code=s["code"]).first()
        if not site:
            site = Site(
                organization_id=org.id,
                name=s["name"],
                code=s["code"],
                site_type=s["site_type"],
                status="ACTIVE",
            )
            session.add(site)
            session.flush()
            results["sites"] += 1

            for loc_name in s["locations"]:
                loc = Location(
                    site_id=site.id,
                    name=loc_name,
                    code=loc_name.split()[0].upper(),
                    description=f"Synthetic demonstration location: {loc_name}",
                )
                session.add(loc)
                session.flush()
                results["locations"] += 1
                location_map[f"{s['code']}:{loc_name}"] = loc
        site_map[s["code"]] = site

    # 5. Demo Activities
    activities_data = [
        {"code": "ACT-DRILL", "name": "Drilling & Well Operations", "category": "DRILLING", "risk": "CRITICAL"},
        {"code": "ACT-RIGGING", "name": "Heavy Lifting & Rigging", "category": "LOGISTICS", "risk": "HIGH"},
        {"code": "ACT-CONFINED", "name": "Confined Space & Flange Work", "category": "MAINTENANCE", "risk": "HIGH"},
        {"code": "ACT-HOTWORK", "name": "Hot Work & Welding", "category": "MAINTENANCE", "risk": "MEDIUM"},
    ]
    activity_map = {}
    for a in activities_data:
        activity = session.query(Activity).filter_by(organization_id=org.id, code=a["code"]).first()
        if not activity:
            activity = Activity(
                organization_id=org.id,
                code=a["code"],
                name=a["name"],
                category=a["category"],
                risk_level_baseline=a["risk"],
                status="ACTIVE",
            )
            session.add(activity)
            session.flush()
            results["activities"] += 1
        activity_map[a["code"]] = activity

    # 6. Prototype Life-Saving Rules (IOGP Reference Framework)
    rules_data = [
        {"code": "LSR-01", "name": "Energy Isolation", "description": "Verify isolation and zero energy state before work begins."},
        {"code": "LSR-02", "name": "Line of Fire", "description": "Position yourself and others out of the line of fire of energized hazards."},
        {"code": "LSR-03", "name": "Confined Space", "description": "Obtain authorization and verify atmospheric safety before entering confined spaces."},
        {"code": "LSR-04", "name": "Hot Work", "description": "Identify and control flammables before initiating spark-producing hot work."},
        {"code": "LSR-05", "name": "Work at Height", "description": "Protect yourself against falling when working outside protective guardrails."},
        {"code": "LSR-06", "name": "Bypass Safety Controls", "description": "Obtain authorization before overriding or disabling critical safety devices."},
    ]
    for r in rules_data:
        rule = session.query(LifeSavingRule).filter_by(code=r["code"]).first()
        if not rule:
            rule = LifeSavingRule(
                code=r["code"],
                name=r["name"],
                description=r["description"],
                source_reference="IOGP Report 459 [Prototype Reference Only]",
                status="ACTIVE",
            )
            session.add(rule)
            results["life_saving_rules"] += 1

    # 7. Normalized Hazards & Precursors Foundation (Seed)
    hazards_data = [
        {"name": "Pressurized Well Fluid / Gas Kick", "category": "PRESSURE", "desc": "Subsurface high-pressure hydrocarbons."},
        {"name": "Suspended Tubular Load", "category": "GRAVITY", "desc": "Drill collars or casing suspended by travelling block."},
        {"name": "Toxic Hydrogen Sulfide (H2S)", "category": "CHEMICAL", "desc": "Atmospheric toxic and flammable gas accumulation."},
    ]
    hazard_map = {}
    for h in hazards_data:
        hazard = session.query(Hazard).filter_by(name=h["name"]).first()
        if not hazard:
            hazard = Hazard(name=h["name"], category=h["category"], description=h["desc"])
            session.add(hazard)
            session.flush()
            results["hazards"] += 1
        hazard_map[h["name"]] = hazard

    precursors_data = [
        {"hazard": "Pressurized Well Fluid / Gas Kick", "name": "Drilling Break / Pit Gain Anomaly", "cat": "PRESSURE"},
        {"hazard": "Suspended Tubular Load", "name": "Personnel Standing Under Unlatched Elevator", "cat": "LINE_OF_FIRE"},
        {"hazard": "Toxic Hydrogen Sulfide (H2S)", "name": "Gas Detector Alarm Delayed / Bypassed", "cat": "ATMOSPHERIC"},
    ]
    for p in precursors_data:
        precursor = session.query(Precursor).filter_by(name=p["name"]).first()
        if not precursor:
            hz = hazard_map.get(p["hazard"])
            precursor = Precursor(
                hazard_id=hz.id if hz else None,
                name=p["name"],
                category=p["cat"],
                precursor_type="LEADING_INDICATOR",
            )
            session.add(precursor)
            results["precursors"] += 1

    # 8. Model Versions Registry Seed
    mv = session.query(ModelVersion).filter_by(model_name="SUCHAK-SIF-Classifier-v1").first()
    if not mv:
        mv = ModelVersion(
            model_name="SUCHAK-SIF-Classifier-v1",
            model_type="SIF_CLASSIFIER",
            version="1.0.0-prototype",
            status="ACTIVE",
            metadata_json={"note": "Prototype reference registry entry - no model weights deployed in Phase 2"},
        )
        session.add(mv)
        results["model_versions"] += 1

    # 9. Small Set of Clearly Labeled Demo Reports
    demo_reports = [
        {
            "report_number": "DEMO-RPT-2026-001",
            "report_type": ReportType.NEAR_MISS,
            "site_code": "RIG-DIGBOI-04",
            "activity_code": "ACT-DRILL",
            "days_ago": 2,
            "description": "[SYNTHETIC DEMO] During tripping in hole, travelling block was lowered while floor hand was securing slips. Winch line snagged momentarily near rotary table.",
            "actual_outcome": "No physical contact occurred. Floor hand stepped clear. Work paused for tailgate briefing.",
            "processing_status": ProcessingStatus.ANALYZED,
            "review_status": ReviewStatus.PENDING,
        },
        {
            "report_number": "DEMO-RPT-2026-002",
            "report_type": ReportType.UNSAFE_CONDITION,
            "site_code": "GGS-DULIAJAN",
            "activity_code": "ACT-CONFINED",
            "days_ago": 4,
            "description": "[SYNTHETIC DEMO] Pressure bleed-off valve manifold handle showed severe corrosion and was stuck in half-open position during morning line check.",
            "actual_outcome": "Line pressure was routed to secondary bypass header. Tagout applied immediately.",
            "processing_status": ProcessingStatus.SUBMITTED,
            "review_status": ReviewStatus.PENDING,
        },
        {
            "report_number": "DEMO-RPT-2026-003",
            "report_type": ReportType.UNSAFE_ACT,
            "site_code": "SITE-MORAN-A",
            "activity_code": "ACT-RIGGING",
            "days_ago": 5,
            "description": "[SYNTHETIC DEMO] Tagline was not utilized while swinging 10-inch drill collar from catwalk to pipe rack. Load swung within 1.5m of muster path.",
            "actual_outcome": "Crane operator halted swing motion upon whistle signal from banksman. Tagline attached before resumption.",
            "processing_status": ProcessingStatus.REVIEWED,
            "review_status": ReviewStatus.APPROVED,
        },
    ]

    for dr in demo_reports:
        rpt = session.query(Report).filter_by(organization_id=org.id, report_number=dr["report_number"]).first()
        if not rpt:
            st = site_map.get(dr["site_code"])
            act = activity_map.get(dr["activity_code"])
            now = datetime.now(timezone.utc)
            rpt_dt = now - timedelta(days=dr["days_ago"])
            
            rpt = Report(
                organization_id=org.id,
                report_number=dr["report_number"],
                report_type=dr["report_type"],
                site_id=st.id if st else site_map["RIG-DIGBOI-04"].id,
                activity_id=act.id if act else None,
                report_datetime=rpt_dt,
                description=dr["description"],
                actual_outcome=dr["actual_outcome"],
                processing_status=dr["processing_status"],
                review_status=dr["review_status"],
                source="PORTAL_WEB_DEMO",
                created_by=user_map.get("HSEOfficer", None).id if user_map.get("HSEOfficer") else None,
            )
            session.add(rpt)
            results["demo_reports"] += 1

    session.flush()
    return results
