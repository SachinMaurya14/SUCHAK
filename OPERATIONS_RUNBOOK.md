# SUCHAK Platform Operations & Disaster Recovery Runbook

## 1. System Boot & Initialization Sequence

The SUCHAK Enterprise platform executes the following startup sequence upon container launch:

```
[BOOT START]
  1. Load environment configuration from process.env
  2. Validate configuration schemas (validateConfig() in /server/config.ts)
     - Fail fast if port invalid, CORS malformed, or production secret is fallback
  3. Initialize Express application
  4. Attach Security Middleware:
     - Request ID generation (X-Request-ID)
     - Security Response Headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
     - Multi-tier sliding window rate limiting
  5. Mount Health & Operations Probes:
     - GET /health
     - GET /live
     - GET /ready
  6. Initialize In-Memory Data Stores & Services:
     - AuthStore (Pre-seeded enterprise demo users & tenant organizations)
     - ReportStore (Pre-seeded industrial safety reports & SIF classifications)
     - ReviewStore (Human HSE verification queues)
     - ActionStore (CAPA tracking and barrier workflows)
     - AlertEngine (Deterministic notification outbox & escalation rules)
     - VectorStore (In-memory semantic similarity embeddings)
     - ModelGovernanceRegistry (Audited safety models, prompt versions, quality gates)
  7. Mount Authentication & Admin Security API Routes
  8. Mount Business Workflow API Routes (with Tenant Scoping & RBAC)
  9. Mount Vite SPA middleware (Development) OR serve static dist/ (Production)
  10. Bind listener to 0.0.0.0:3000
[BOOT READY]
```

---

## 2. Health Probes & Triage Guide

SUCHAK provides three standard Kubernetes-compatible operational endpoints:

### Endpoint Specifications

| Endpoint | Probe Type | Purpose | Healthy Response | Action if Failing |
|---|---|---|---|---|
| `GET /live` | Liveness Probe | Confirms Node.js event loop is responsive | `{"status": "alive"}` (HTTP 200) | Pod is deadlocked; trigger container restart. |
| `GET /ready` | Readiness Probe | Confirms persistence and AI stores are initialized | `{"status": "ready", "checks": {...}}` (HTTP 200) | Do not route ingress traffic; check database connection. |
| `GET /health` | Health Check | Full operational telemetry and subsystem latency | `{"status": "healthy", "subsystems": {...}}` (HTTP 200) | Inspect specific failing subsystem in payload. |

### Testing Probes via CLI
```bash
# Check liveness
curl -i http://localhost:3000/live

# Check readiness
curl -i http://localhost:3000/ready

# Check comprehensive operational telemetry
curl -i http://localhost:3000/api/v1/admin/operations/health
```

---

## 3. Backup and Restore Procedures

### 3.1 Database Persistence (PostgreSQL Target Architecture)

In production enterprise deployments utilizing Cloud SQL / PostgreSQL:

#### Automated Daily Snapshot
- Scheduled automated daily backups at `02:00 UTC` with point-in-time recovery (PITR) retention set to 14 days.
- Manual snapshot trigger prior to major version deployments:
  ```bash
  gcloud sql backups create --instance=suchak-prod-db --description="Pre-deployment snapshot"
  ```

#### Manual Database Dump Procedure
```bash
pg_dump -h <DB_HOST> -U suchak_admin -d suchak_db -F c -b -v -f "/backups/suchak_db_$(date +%Y%m%d_%H%M%S).dump"
```

#### Database Restoration Procedure
```bash
# Restore from custom archive dump
pg_restore -h <DB_HOST> -U suchak_admin -d suchak_db -v -c "/backups/suchak_db_target.dump"
```

### 3.2 Vector Embeddings Index Persistence
- Vector embeddings in the prototype are regenerated in-memory from indexed safety reports.
- In production, vector embeddings are persisted alongside safety reports in PostgreSQL using the `pgvector` extension or external FAISS snapshot volume.

---

## 4. Disaster Recovery, RPO / RTO, and Failover

### Target Enterprise Objectives

| Metric | Target | Current Status | Notes |
|---|---|---|---|
| **RPO (Recovery Point Objective)** | < 15 minutes | **NOT_READY (Prototype)** | Requires Cloud SQL PITR and automated WAL archiving. In prototype mode, restarts reset to seeded baseline. |
| **RTO (Recovery Time Objective)** | < 30 minutes | **NOT_READY (Prototype)** | Requires automated multi-AZ Cloud Run container deployment with regional database replica. |

### Regional Failover Runbook (Target Production)
1. **Detection**: Primary Cloud Run region fails consecutive health probes for > 3 minutes.
2. **DNS Traffic Shift**: Cloud DNS / Cloud Load Balancing updates traffic weighting to Secondary Region (e.g. `asia-south1` to `asia-southeast1`).
3. **Database Promotion**: If primary Cloud SQL instance is unreachable, promote regional read-replica to primary.
4. **Environment Verification**: Validate `DATABASE_URL` and run `GET /ready` on secondary container instances.
5. **Post-Failover Verification**: Execute automated 14-point regression suite (`POST /api/v1/admin/security/run-tests`).

---

## 5. Version Rollback & Zero-Downtime Deployment

### Blue/Green & Canary Rollback Procedure
1. If post-deployment telemetry shows elevated error rates (> 1%) or failing health probes:
   ```bash
   # Route 100% traffic back to previous stable revision
   gcloud run services update-traffic suchak-hse --to-revisions=suchak-hse-v14-stable=100
   ```
2. Inspect application error logs:
   ```bash
   # Filter for ERROR or FATAL in structured JSON logs
   gcloud logging read 'resource.type="cloud_run_revision" AND severity>=ERROR' --limit=50
   ```
3. Verify that database schema migrations maintain backward compatibility (expand-contract pattern) to prevent breaking previous application revisions.
