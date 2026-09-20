# SUCHAK — Enterprise HSE Safety Intelligence & Early-Warning Platform

**SUCHAK** is an enterprise safety intelligence system engineered for critical oil & gas exploration, drilling, refining, and pipeline transport assets (such as Oil India Limited installations). It converts unstructured safety observations and near-miss records into actionable Serious Injury or Fatality (SIF) precursor intelligence, barrier degradation tracking, multi-site risk prioritization, and deterministic early-warning alerts.

---

## Architectural Hierarchy

```
SUCHAK ENTERPRISE PLATFORM
│
▼
HTTPS / EDGE LAYER
(TLS 1.3 Termination, Reverse Proxy, Security Headers, Rate Limiter)
│
▼
AUTHENTICATION
(PBKDF2 SHA-512, 100k Iterations, Salted Cryptography, Brute-Force Lockout)
│
▼
AUTHORIZATION / RBAC
(Granular Role-Based Access: OrgAdmin, HSEOfficer, SafetyReviewer, SiteManager)
│
▼
TENANT ISOLATION
(Strict Multi-Tenant Scoping by organization_id on all records & queries)
│
▼
APPLICATION SERVICES LAYER
│
┌─────────────────────────┼─────────────────────────┐
▼                         ▼                         ▼
PostgreSQL / Persistence  Vector Similarity Engine  AI Reasoning Provider
(Data Isolation)          (FAISS In-Memory Scope)   (Gemini 2.5 Flash / Rules)
│                         │                         │
└─────────────────────────┼─────────────────────────┘
│
▼
BUSINESS WORKFLOWS
│
├── 1. REPORT (Observation & Near-Miss Ingestion)
├── 2. SIF DETECTION (Deterministic Precursor & Hazard Triage)
├── 3. SAFETY INTELLIGENCE (IOGP Life-Saving Rules Concordance)
├── 4. RISK PRIORITIZATION (Severity × Exposure × Hazard Bands)
├── 5. SIMILAR REPORTS (Vector Cosine Distance Retrieval)
├── 6. RECURRING PATTERNS (Causal Graph Clustering & Cross-Site Loops)
├── 7. HUMAN HSE REVIEW QUEUE (Certified Reviewer Verification & Override)
├── 8. CAPA / ACTIONS (Corrective & Preventive Barrier Interventions)
├── 9. ALERTS & ESCALATION (Deterministic Rule-Based Outbox & Escalation)
└── 10. ADVANCED HSE ANALYTICS (Deterministic Executive Decision Support)
│
▼
AI EVALUATION & GOVERNANCE
┌────────────────────────────────────────────────────────┐
│ MODEL REGISTRY          │ PROMPT REGISTRY              │
│ BENCHMARK DATASETS      │ EVALUATION RUNS              │
│ SIF METRICS (F1 / FNR)  │ FALSE-NEGATIVE AUDITING      │
│ HUMAN vs AI CONCORDANCE │ CAUSAL ERROR ANALYSIS        │
│ AUTOMATED QUALITY GATES │ REGRESSION TESTING           │
│ GOVERNANCE APPROVALS    │ CANARY AUDIT LOGS            │
└────────────────────────────────────────────────────────┘
│
▼
SECURITY & OPERATIONS COMMAND CENTER
(14-Point Automated Regression Suite • Live Audit Event Stream • Uptime Probes)
```

---

## Key Phase 14 Security & Hardening Features

- **PBKDF2 SHA-512 Cryptography**: 100,000 hash iterations with 16-byte cryptographically secure random salts.
- **Brute-Force Account Defense**: Automatic 15-minute account lockout after 5 consecutive failed login attempts.
- **Strict Multi-Tenant Boundaries**: Every resource and query is isolated by `organization_id`. Cross-tenant tampering is blocked and logged.
- **Sliding-Window Rate Limiting**: Token bucket rate limiter with 4 distinct tiers: `AUTH` (15/min), `AI_EVAL` (30/min), `EXPORT` (20/min), and `STANDARD` (200/min).
- **OWASP Hardened Headers**: Injected on all responses (`X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
- **Formula Injection Defense**: Automatic character escaping on CSV exports (`=`, `+`, `-`, `@`) and path traversal sanitization on uploads.
- **Fail-Fast Configuration**: Boot-time validation (`validateConfig()`) halts startup if secrets are insecure in production.
- **Operational Health Probes**: `/health`, `/live`, and `/ready` endpoints for container orchestrators.
- **Automated Security Regression Suite**: 14 distinct test vectors covering authentication, RBAC, tenant isolation, CSV sanitization, and secret protection.
- **Security Audit Event Trail**: Immutable in-memory circular event buffer tracking logins, logouts, permission denials, and boundary breaches.

---

## Dedicated Security & Operations Documentation

| Document | Description |
|---|---|
| [`SECURITY.md`](./SECURITY.md) | Security architecture, threat model, OWASP Top 10 mitigations, and RBAC matrix |
| [`SECURITY_OPERATIONS.md`](./SECURITY_OPERATIONS.md) | Incident severity classification, token revocation, secret rotation, and forensics playbooks |
| [`OPERATIONS_RUNBOOK.md`](./OPERATIONS_RUNBOOK.md) | Startup sequence, health probe triage, backup & restore, and disaster recovery procedures |
| [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md) | Production readiness matrix (`READY`, `NOT_READY`, `MANUAL_VERIFICATION_REQUIRED`) and sign-off |
| [`ANALYTICS.md`](./ANALYTICS.md) | Deterministic metric calculation formulas, sample sufficiency, and reviewed-state policy |

---

## Getting Started

### Local Development
```bash
# Install dependencies
npm install

# Start development server (Port 3000)
npm run dev
```

### Running Automated Security Regression Suite
```bash
# Execute via API
curl -X POST http://localhost:3000/api/v1/admin/security/run-tests \
  -H "Authorization: Bearer <TOKEN>"

# Or navigate in browser to:
# http://localhost:3000/admin/security -> "Automated Security Suite" tab
```

### Production Build & Container Execution
```bash
# Compile client bundle and bundle server into dist/server.cjs
npm run build

# Start production server
npm start

# Or build container using multi-stage Dockerfile
docker build -t suchak-hse:latest .
docker run -p 3000:3000 suchak-hse:latest
```
