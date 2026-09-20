# SUCHAK Database Architecture & Persistence Specification
**Phase 2: Database, Data Model & Persistence Foundation**

---

## 1. Architectural Overview

SUCHAK is an enterprise HSE Safety Intelligence and Early-Warning Platform built for heavy industrial operations (such as upstream exploration, drilling, and production assets). Phase 2 establishes the production-grade persistence foundation required for all downstream analytical, classification, and workflow components.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Application Tier                        │
│             (/api/v1/health/db, /api/v1/reports, etc.)                │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                 ┌───────────────────▼───────────────────┐
                 │        Persistence Service Layer      │
                 │ (OrgService, ReportService, Review)   │
                 └───────────────────┬───────────────────┘
                                     │
                 ┌───────────────────▼───────────────────┐
                 │       Repository Access Layer         │
                 │     (Enforces Tenant Isolation)       │
                 └───────────────────┬───────────────────┘
                                     │
                 ┌───────────────────▼───────────────────┐
                 │       SQLAlchemy 2.x Declarative      │
                 │   (Mapped, mapped_column, Base)       │
                 └───────────────────┬───────────────────┘
                                     │
        ┌────────────────────────────┴────────────────────────────┐
        │                                                         │
┌───────▼────────────────┐                              ┌─────────▼──────────────┐
│  PostgreSQL Production │                              │ SQLite In-Memory Test  │
│ Connection QueuePool   │                              │ StaticPool / NullPool  │
│ (pre-ping, recycle)    │                              │ (Fast CI/CD Unit Test) │
└────────────────────────┘                              └────────────────────────┘
```

### Core Technologies
- **RDBMS**: PostgreSQL (with JSONB/JSON and UUID support).
- **ORM**: SQLAlchemy 2.x utilizing modern `Mapped` and `mapped_column` type annotations.
- **Migration Engine**: Alembic with forward (`upgrade head`) and rollback (`downgrade base`) reproducibility.
- **Connection Management**: `QueuePool` with health `pool_pre_ping=True`, configurable pool sizes (`DB_POOL_SIZE=10`, `DB_MAX_OVERFLOW=20`), timeout (`DB_POOL_TIMEOUT=30s`), and recycling (`DB_POOL_RECYCLE=1800s`).
- **Primary Keys**: Standardized RFC 4122 Version 4 UUIDs across all entities.

---

## 2. Schema Architecture & Entity-Relationship Model

The relational schema is partitioned into 9 logical domains encompassing 30 tables and association entities:

### 2.1 Multi-Tenant Organization & Operational Hierarchy
- `organizations`: Root tenant entity. Fields: `id`, `name`, `slug` (unique), `status`, timestamps.
- `organization_settings`: Tenant-specific operational preferences, timezones, notification thresholds, and feature flags.
- `sites`: Operational installations (e.g., drilling rigs, gas gathering stations, production facilities). Scoped to `organization_id`.
- `locations`: Micro-locations within a site (e.g., Drill Floor, Mud Tanks, Flange Manifold Quadrant B).
- `activities`: High-risk industrial operations (e.g., Drilling & Well Operations, Heavy Lifting & Rigging, Confined Space Entry).

### 2.2 Access Control & Identity (RBAC)
- `users`: Operational users scoped to tenant organization.
- `roles`: Role definitions (`OrgAdmin`, `HSEOfficer`, `SafetyReviewer`, `SiteManager`).
- `permissions`: Granular capability flags (e.g., `REPORTS_WRITE`, `REVIEWS_EXECUTE`).
- `role_permissions`: Role-to-permission mapping.
- `user_roles`: User-to-role tenant-scoped assignment.

### 2.3 Incident & Safety Observation Reporting
- `reports`: Core safety report ingestion entity:
  - Supports types: `NEAR_MISS`, `UNSAFE_ACT`, `UNSAFE_CONDITION`, `INCIDENT`.
  - Workflow status: `processing_status` (`SUBMITTED`, `QUEUED`, `ANALYZING`, `ANALYZED`, `REVIEWED`, `FAILED`).
  - Human review status: `review_status` (`PENDING`, `IN_REVIEW`, `APPROVED`, `REJECTED`).
  - Soft-deletion: `is_deleted` boolean flag.
  - Foreign keys: `organization_id`, `site_id`, `location_id`, `activity_id`, `created_by`.
- `report_attachments`: Metadata for attached photos, witness statements, and documents.
- `report_embeddings`: Vector representation persistence for semantic search (embedding vectors stored as JSON array in Phase 2).

### 2.4 AI Analysis & Analytical Contracts (Phase 3 Enablers)
- `model_versions`: Audit registry tracking NLP classifiers, rule engine weights, and deployment state (`ACTIVE`, `DEPRECATED`, `CANDIDATE`).
- `hazards`: Normalized taxonomy of energy sources and operational dangers (e.g., Pressurized Well Fluid, Suspended Load, Toxic H2S).
- `precursors`: Leading indicators and early warning triggers mapped to hazards.
- `barrier_failures`: Degraded or bypassed safety barriers (e.g., Hardware, Human/Operational, Administrative).
- `analysis_results`: Analysis output contract:
  - `sif_potential` (boolean)
  - `confidence` (float 0.0 - 1.0)
  - `priority` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - `sif_score` (float 0.0 - 1.0)
  - `explanation` (textual summary)
  - `evidence_json` (structured reasoning artifacts)
- `analysis_hazards`, `analysis_precursors`, `analysis_barrier_failures`: Normalized junction tables linking analysis runs to catalogued taxonomies.

### 2.5 Safety Rules & Framework Compliance
- `life_saving_rules`: International and industry safety rules (e.g., IOGP Report 459 standard categories).
- `report_rule_mappings`: Links reports to triggered life-saving rule violations.

### 2.6 Recurring Pattern Discovery Foundation
- `patterns`: Identified cluster or recurring signal entity (`ACTIVE`, `MITIGATED`, `ARCHIVED`).
- `pattern_members`: Junction table connecting reports to an identified cluster with confidence scores.

### 2.7 Human-in-the-Loop HSE Review & Verification
- `reviews`: Audit record preserving expert determination:
  - `ai_decision_sif`: Machine classification.
  - `final_sif_decision`: Human reviewer decision.
  - `decision_override`: Flagged when human decision differs from AI prediction.
  - `reviewed_at`: Timestamp of sign-off.
- `review_feedback`: Quality feedback loops for active learning.

### 2.8 Corrective Actions & Alerts
- `actions`: Corrective and Preventative Actions (CAPA) with status (`OPEN`, `IN_PROGRESS`, `COMPLETED`, `OVERDUE`).
- `alerts`: Early warning notifications with severity (`INFO`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

### 2.9 Compliance & Audit Trail
- `audit_logs`: Immutable security log tracking all entity state transitions (`before_data`, `after_data`, `actor_user_id`).

---

## 3. Indexing Strategy

To guarantee sub-10ms response times at scale and enforce data integrity:
1. **Tenant Isolation Indexes**: Every multi-tenant table includes a B-Tree index on `organization_id` (e.g., `ix_reports_org_id`, `ix_sites_organization_id`).
2. **Compound Filter Indexes**:
   - `reports`: (`organization_id`, `report_datetime`), (`organization_id`, `processing_status`), (`organization_id`, `site_id`).
   - `actions`: (`organization_id`, `status`), (`assigned_to`, `due_at`).
   - `reviews`: (`report_id`), (`reviewer_id`, `reviewed_at`).
3. **Unique Natural Keys**:
   - `organizations.slug`
   - (`sites.organization_id`, `sites.code`)
   - (`reports.organization_id`, `reports.report_number`)
   - (`life_saving_rules.code`)

---

## 4. Multi-Tenant Data Isolation Architecture

SUCHAK implements **Logical Tenant Isolation** via software repository enforcement:
- **BaseRepository**: Provides `get_by_id_scoped(entity_id, organization_id)`, `list_scoped(organization_id)`, and `count_scoped(organization_id)`.
- **Foreign Key Cascading**: Child records (sites, locations, reports, analysis results) strictly cascade within their tenant boundary.
- **Cross-Tenant Validation**: Services (`ReportPersistenceService`) enforce that associated entities (e.g., `site_id`) belong to the exact same `organization_id` as the report, raising `TenantIsolationError` on breach attempts.

---

## 5. Migration Runbook (Alembic)

All schema changes are version-controlled in `backend/alembic/versions/`.

### 5.1 Initial Setup & Verification
```bash
# Verify current migration head
python3 -m alembic current

# Upgrade database to latest revision
python3 -m alembic upgrade head

# Rollback to baseline (downgrade test)
python3 -m alembic downgrade base
```

### 5.2 Generating New Revisions
```bash
# Create a new autogenerated migration script
python3 -m alembic revision --autogenerate -m "describe_change"

# Review the generated file in backend/alembic/versions/
# Apply the revision
python3 -m alembic upgrade head
```

---

## 6. Seed & Demo Architecture

The seed mechanism (`backend/app/seeds/seed_data.py`) provisions a controlled demonstration dataset:
- **Demo Organization**: `oil-india-demo` ("Oil India Demonstration Asset [SYNTHETIC DEMO]").
- **Demo Sites**: `RIG-DIGBOI-04`, `SITE-MORAN-A`, `GGS-DULIAJAN`.
- **Demo Users**: OrgAdmin, HSEOfficer, SafetyReviewer, SiteManager.
- **Reference Rules**: IOGP Life-Saving Rules (LSR-01 through LSR-06).
- **Synthetic Demo Reports**: Clearly identified with the `[SYNTHETIC DEMO]` prefix and `DEMO-RPT-` codes.
- **Zero Confusion Mandate**: All seeded entities are explicitly designated as prototype/reference content. No real OIL proprietary operational data is stored or simulated.

To run seeds:
```bash
python3 -m backend.app.seeds.run_seeds
```

---

## 7. Health Check API (`GET /api/v1/health/db`)

Endpoint returning real-time database connectivity, driver, latency, and schema status:
```json
{
  "status": "healthy",
  "connected": true,
  "latency_ms": 1.45,
  "engine": "postgresql",
  "database": "suchak_db",
  "schema_ready": true,
  "tables_count": 30,
  "error": null,
  "timestamp": "2026-09-19T18:14:00.000Z"
}
```

---

## 8. Test Strategy & Verification

The test suite covers the complete database lifecycle under `backend/tests/`:
- `test_database_connection.py`: Live connectivity and transaction rollbacks.
- `test_models.py`: Model creation, relationships, cascading foreign keys, and constraints.
- `test_tenant_isolation.py`: Cross-tenant boundary protections and query leakage checks.
- `test_seed_data.py`: Idempotency and synthetic label verification.
- `test_health_endpoints.py`: API health check status codes and payloads.

Execute tests with:
```bash
python3 -m pytest backend/tests -v
```
