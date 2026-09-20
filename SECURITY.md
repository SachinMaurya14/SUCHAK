# SUCHAK Enterprise HSE Platform — Security Architecture & Threat Model

## 1. Executive Summary & Security Philosophy

**SUCHAK** is an Enterprise Health, Safety, and Environment (HSE) Safety Intelligence & Early-Warning Platform engineered for critical oil & gas exploration, drilling operations, and refinery assets.

Because industrial safety decisions involve Life-Saving Rules (IOGP Report 459) and Severe Injury or Fatality (SIF) precursor interventions, system integrity, strict authorization boundaries, and tamper-evident audit logging are foundational operational requirements.

---

## 2. SUCHAK Architectural Hierarchy & Defense-in-Depth

```
                SUCHAK ENTERPRISE APPLICATION
                              │
                              ▼
                     HTTPS / EDGE LAYER
          (TLS 1.3 Termination, WAF, Security Headers)
                              │
                              ▼
                    CORRELATION & TRACING
              (X-Request-ID Header Propagation)
                              │
                              ▼
                     RATE LIMITING DEFENSE
       (In-Memory Sliding Window / 4 Protection Categories)
                              │
                              ▼
                        AUTHENTICATION
            (PBKDF2 SHA-512 Hashing, 64-Byte Salt,
              Brute-Force Lockout, Session Tokens)
                              │
                              ▼
                     AUTHORIZATION / RBAC
      (OrgAdmin, HSEOfficer, SafetyReviewer, SiteManager)
                              │
                              ▼
                       TENANT ISOLATION
         (Strict Organization Scoping on All Entities)
                              │
                              ▼
                       FASTAPI / EXPRESS
                    APPLICATION ROUTE LAYER
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
        PostgreSQL      Vector/Semantic   AI Safety Engine
     (Data Isolation)     (FAISS Scope)     (Gemini / Rules)
             │                │                │
             └────────────────┼────────────────┘
                              │
                              ▼
                      BUSINESS WORKFLOWS
        (Reports, SIF Triage, Review Queue, CAPA Actions,
         Deterministic Alert Engine, Pattern Discovery)
                              │
                              ▼
                  AI EVALUATION & GOVERNANCE
        (Model Registry, Quality Gates, Error Analysis,
         Prompt Registry, SIF Benchmark Datasets)
                              │
                              ▼
                    SECURITY AUDIT STREAM
     (Immutable Event Trail, PII/Secret Redaction, Health Probes)
```

---

## 3. OWASP Top 10 Alignment & Mitigations

| OWASP Risk Vector | SUCHAK Security Mitigation | Implementation Reference |
|---|---|---|
| **A01: Broken Access Control** | Centralized `authMiddleware`, `requirePermission`, and `enforceTenantIsolation` guards enforce strict multi-tenant boundary checks. Site-level permissions restrict visibility. | `server/securityMiddleware.ts`, `server/authStore.ts` |
| **A02: Cryptographic Failures** | Passwords hashed using PBKDF2 with SHA-512, 100,000 iterations, and unique 16-byte random salts. Session tokens are 32-byte cryptographically random hex strings. Stack traces and sensitive credentials stripped. | `server/authStore.ts`, `server/redaction.ts` |
| **A03: Injection** | SQL/DataStore queries parameterize arguments. CSV export fields escape formula injection characters (`=`, `+`, `-`, `@`). Filenames in uploads are stripped of path traversal sequences (`../`). | `server/redaction.ts`, `server/securityTests.ts` |
| **A04: Insecure Design** | Separation of AI suggestion vs human HSE authority. SIF determinations require human verification before formal CAPA sign-off. Automated model quality gates block unvalidated models. | `server/reviewStore.ts`, `server/modelGovernanceRegistry.ts` |
| **A05: Security Misconfiguration** | Fail-fast configuration validation at boot (`validateConfig()`). Default development keys are rejected in production. Security headers injected on every response. | `server/config.ts`, `server/securityMiddleware.ts` |
| **A06: Vulnerable & Outdated Components** | Minimal dependencies, automated CI vulnerability scanning, Docker multi-stage builds on lightweight Node Alpine base images. | `Dockerfile`, `.github/workflows/ci.yml` |
| **A07: Identification & Auth Failures** | Account lockout after 5 failed login attempts (15-minute freeze). Explicit token revocation upon logout. Session expiration after 24 hours. | `server/authStore.ts`, `server/authTypes.ts` |
| **A08: Software & Data Integrity Failures** | Model governance registry tracks hash and status of active AI models. Models cannot transition to production active without verified evaluation approval. | `server/modelGovernanceRegistry.ts` |
| **A09: Security Logging & Monitoring Failures** | Structured JSON logging with correlation `X-Request-ID`. Dedicated security audit event stream logging logins, logouts, permission denials, and cross-tenant access attempts. | `server/logger.ts`, `server/authStore.ts` |
| **A10: Server-Side Request Forgery (SSRF)** | No arbitrary outbound URL fetching. Webhook delivery restricts URLs to pre-registered, validated enterprise endpoints. | `server/alertEngine.ts`, `server/config.ts` |

---

## 4. Role-Based Access Control (RBAC) Matrix

| Permission Key | Description | OrgAdmin | HSEOfficer | SafetyReviewer | SiteManager |
|---|---|:---:|:---:|:---:|:---:|
| `reports.view` | View safety reports within organization | ✅ | ✅ | ✅ | ✅ (Site Scope) |
| `reports.create` | Submit new observation or incident report | ✅ | ✅ | ❌ | ✅ |
| `reports.edit` | Modify non-finalized report fields | ✅ | ✅ | ❌ | ❌ |
| `reports.export` | Bulk export sanitized safety records | ✅ | ✅ | ❌ | ❌ |
| `analysis.run` | Execute AI SIF triage & causal classification | ✅ | ✅ | ❌ | ❌ |
| `analysis.view` | View barrier classification & precursor tags | ✅ | ✅ | ✅ | ✅ |
| `review.view` | Access SIF Human Verification Queue | ✅ | ✅ | ✅ | ✅ |
| `review.manage` | Confirm SIF potential, override AI, log rationale | ✅ | ✅ | ✅ | ❌ |
| `actions.create` | Generate corrective / preventive CAPA action | ✅ | ✅ | ✅ | ❌ |
| `actions.close` | Verify barrier completion & formally close CAPA | ✅ | ✅ | ❌ | ✅ |
| `alerts.manage` | Modify rule threshold, escalations & outbox | ✅ | ✅ | ❌ | ❌ |
| `analytics.export`| Export aggregate HSE KPI analytics | ✅ | ✅ | ❌ | ❌ |
| `evaluation.run` | Execute benchmark evaluation runs | ✅ | ✅ | ❌ | ❌ |
| `evaluation.approve`| Sign-off on model quality gate transition | ✅ | ❌ | ❌ | ❌ |
| `model.manage` | Register, deprecate, or promote AI safety models | ✅ | ❌ | ❌ | ❌ |
| `admin.users` | Provision users and adjust RBAC role assignments | ✅ | ❌ | ❌ | ❌ |
| `security.view` | View security telemetry, audit stream & test suite | ✅ | ✅ | ❌ | ❌ |
| `operations.manage`| Trigger test suite execution, view memory probes | ✅ | ❌ | ❌ | ❌ |

---

## 5. Multi-Tenant Isolation Architecture

1. **Organization Identifier**: Every database entity (`SafetyReport`, `ReviewItem`, `ActionItem`, `Alert`, `EvaluationRun`) includes an immutable `organization_id`.
2. **Context Binding**: Every authenticated session is cryptographically bound to an `organization_id`.
3. **Cross-Tenant Guard**: The `enforceTenantIsolation` middleware verifies that the session organization matches the requested resource organization.
4. **Security Event Logging**: Any attempt to access or mutate records belonging to another tenant immediately halts execution, logs a `CROSS_SCOPE_ACCESS_BLOCKED` security audit event, and returns HTTP 403.
5. **Contractor Isolation**: Specialized contractor organizations (e.g. `contractor-alpha-org`) operate in isolated silos and cannot inspect enterprise parent records.

---

## 6. Secrets Management & Redaction

- **Environment Variables**: Managed strictly via server-side process environment (`process.env`). No secret keys are ever bundled into client assets or prefixed with `VITE_`.
- **Fail-Fast Startup**: If `NODE_ENV === 'production'`, `validateConfig()` asserts that `SECRET_KEY` is not using the development fallback.
- **Automated Redaction**: The `redactSensitiveData()` engine strips password hashes, salts, API keys, Bearer tokens, and connection credentials before logs or telemetry are written.
- **Client Security**: API responses returning user records explicitly omit `password_hash` and `salt`.

---

## 7. Known Limitations & Prototype Operational Boundaries

> [!WARNING]
> **Enterprise Operational Prototype Notice**
>
> 1. **Persistence Mode**: The default prototype instance runs with SQLite in-memory persistence and local FAISS vector indexing for high-speed evaluation.
> 2. **Cloud SQL Requirement**: Live enterprise production deployment requires connecting a managed Cloud SQL (PostgreSQL 15+) instance with automated daily backup snapshots.
> 3. **RPO / RTO**: Disaster Recovery Recovery Point Objective (RPO) and Recovery Time Objective (RTO) are currently uncertified until an automated enterprise cloud storage backup schedule and multi-AZ failover cluster are provisioned.
