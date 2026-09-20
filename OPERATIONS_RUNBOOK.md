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

---

## 6. Horizontal Scaling & Database Pool Math

### 6.1 Sizing Equation & Connection Limits
To ensure that horizontal scaling never exhausts the managed PostgreSQL server limit (`max_connections = 100`), SUCHAK mandates the following ceiling formula:

$$\text{Total Allocated} = (N_{\text{api}} \times C_{\text{api}}) + (N_{\text{worker}} \times C_{\text{worker}}) + C_{\text{admin}}$$

Where:
- $N_{\text{api}} = 3$ active API replicas
- $C_{\text{api}} = 15$ connections per API replica pool
- $N_{\text{worker}} = 2$ active background worker replicas
- $C_{\text{worker}} = 10$ connections per worker replica pool
- $C_{\text{admin}} = 10$ reserved connections for migrations, maintenance, and ad-hoc queries

$$\text{Total Allocated} = (3 \times 15) + (2 \times 10) + 10 = 45 + 20 + 10 = 75 \text{ connections}$$

**Capacity Margin:**
- Server Max: 100
- Allocated: 75
- Buffer: 25 connections (25% safety margin reserved for replication failover, pgBouncer spikes, and health monitors).

---

## 7. Background Worker & Queue Management

### 7.1 Queue Architecture
- In-process and distributed worker abstraction (`/server/queueService.ts`).
- Worker concurrency capped at 3 simultaneous jobs to prevent CPU starvation.
- Exponential backoff retry strategy with maximum 3 retry attempts before Dead-Letter Queue (DLQ) containment.
- Idempotency keys prevent duplicate deliveries during worker failover.

### 7.2 DLQ Operations & Triage
```bash
# Check queue status and dead-letter count
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/v1/admin/queue/status

# Enqueue background evaluation task
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" \
  -d '{"type": "REPORT_AI_EVALUATION", "priority": "HIGH", "payload": {"report_id": "REP-2026-001"}}' \
  http://localhost:3000/api/v1/admin/queue/enqueue
```

---

## 8. Object & File Storage Abstraction

### 8.1 Provider Abstraction
- Provider-agnostic storage service (`/server/storageService.ts`) supports GCS, S3, and local filesystem volumes.
- Strict tenant isolation enforced at path root: `tenants/<organization_id>/<resource_type>/<date>/<resource_id>/<filename>`.
- Signed upload and download URLs enforce 15-minute expiration windows.
- Maximum file size ceiling: 15 MB.

---

## 9. External AI Provider & Circuit Breaker

### 9.1 Protection Controls
- Semaphore limits concurrent outbound requests to Gemini API (max 5 concurrent calls).
- 10-second timeout guard prevents thread blocking on slow external API responses.
- Automatic circuit breaker trips to OPEN state after 3 consecutive failures.
- Zero downtime: While circuit is OPEN or in degraded mode, requests automatically route to the local deterministic HSE rule engine.

---

## 10. Post-Deployment Smoke Test Checklist (17 Vectors)

Execute immediately following any staging or production container rollout:
```bash
curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:3000/api/v1/admin/deployments/smoke-tests
```
1. Application liveness & event loop
2. Frontend asset bundle verification
3. API subsystem health check
4. PBKDF2 authentication & credential check
5. Session token resolution
6. RBAC privilege boundary check
7. Multi-tenant scoping & leak check
8. Report store read path
9. Synthetic report ingestion write path
10. AI analysis failure-safe fallback
11. Semantic vector similarity search
12. HSE review queue retrieval
13. CAPA corrective actions retrieval
14. Safety alert engine state
15. Analytics aggregation engine
16. Model evaluation quality gates
17. Storage health & audit logging

---

## 11. Controlled Synthetic Load Testing Runbook

Execute benchmark loads using synthetic telemetry:
```bash
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{"scenario": "COMPREHENSIVE_MIX", "iterations": 60}' \
  http://localhost:3000/api/v1/admin/deployments/load-test
```
Metrics recorded:
- True requests per second (RPS)
- Latencies: p50 (median), p95, p99
- Memory consumption delta (RSS MB)

---

## 12. Disaster Recovery Validation Suite

Execute non-destructive chaos test suite across 6 scenarios:
```bash
curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:3000/api/v1/admin/deployments/dr-test
```
Scenarios verified:
- DR-SC-01: API Replica Crash & Ingress Re-routing
- DR-SC-02: Background Worker Task Crash & Retry Backoff
- DR-SC-03: AI Provider Outage & Circuit Breaker Trip
- DR-SC-04: Vector Index Loss & Source-of-Truth Rebuild
- DR-SC-05: Object Storage Outage & Pre-signed URL Resiliency
- DR-SC-06: Emergency Release Rollback Validation
