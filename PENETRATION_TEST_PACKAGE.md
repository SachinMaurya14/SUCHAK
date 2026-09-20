# SUCHAK Enterprise HSE Safety Intelligence Platform
## Penetration Test Package & Security Verification Dossier
**Version:** 1.0.0-rc18  
**Target Specification:** OWASP Application Security Verification Standard (ASVS) v4.0 Level 2  
**Audience:** CERT-In Certified External Penetration Testers & Oil India Limited Information Security Directorate  

---

### 1. Scope & Rules of Engagement

#### 1.1 In-Scope Target Systems
- **Application Host:** Containerized Node.js / Express Web Application running on Port 3000 (`0.0.0.0:3000`).
- **Target Hostname (Internal/Staging):** `https://suchak-staging.oilindia.in` (and local preview environment `http://localhost:3000`).
- **Ingress Endpoints:** All `/api/v1/*` routes including Authentication, Safety Reports, Reviews, Actions, Integrations, Governance, and Admin routes.
- **Frontend SPA Bundle:** Client-side React bundle and embedded asset handlers.

#### 1.2 Out-of-Scope Systems
- Underlying Cloud Run multi-tenant container runtime and Google Cloud infrastructure fabric.
- Third-party Identity Providers (e.g., Azure Active Directory / Microsoft Entra ID login portals).
- Denial of Service (DoS) attacks targeting network layer exhaustion (flooding > 50,000 req/sec) that impact container hosting limits.

---

### 2. Threat Model & Security Architecture

SUCHAK enforces a strict **"Fail-Closed" Defense-in-Depth** architecture across five core protection perimeters:

```
[ External Internet / Enterprise LAN ]
                │
                ▼
  [ HTTP Security Headers & Rate Limiting ]
  (HSTS, CSP, X-Frame-Options, Sniff, Rate Limiter)
                │
                ▼
      [ Identity Validation ]
      (Bearer JWT Signature, OIDC Claims, Expiry)
                │
                ▼
    [ Multi-Tenant Boundary Isolation ]
    (Header Org vs Token Org Verification)
                │
                ▼
       [ Role-Based Access Control ]
       (6 Enterprise Roles, Least Privilege)
                │
                ▼
   [ Data Governance & Lineage Engine ]
   (Field-Level Redaction, SSRF Filter, Legal Hold Freeze)
```

---

### 3. Test Personas & Access Credentials

To facilitate comprehensive role-escalation and authorization bypass testing, the following test personas are provisioned in the test environment:

| Persona | Role Name | Allowed Scope | Test Access Token / Headers |
|---|---|---|---|
| **Ramesh Bora** | `Reporter` | Submit field reports, view own draft reports | `Authorization: Bearer token-reporter` |
| **Dr. Sunita Saikia** | `Reviewer` | Triage queue, verify SIF classification, assign rationale | `Authorization: Bearer token-reviewer` |
| **Pravin Gogoi** | `HSEOfficer` | Rule definitions, matrix thresholds, CAPA assignments | `Authorization: Bearer token-hse` |
| **Bhaben Baruah** | `SiteSupervisor` | Acknowledge emergency alerts, view site trends | `Authorization: Bearer token-supervisor` |
| **Anupam Sharma** | `OrgAdmin` | Identity settings, security gates, governance, DAST | `Authorization: Bearer token-admin` |
| **Manash Kalita** | `Observer` | Read-only analytics dashboards, no export | `Authorization: Bearer token-observer` |

---

### 4. DAST Automated Testing Results (10/10 Passed)

The integrated DAST engine (`dastSecurityService.ts`) executes automated attack simulations prior to release. The current results for Release Candidate 18 are documented below:

| Test ID | Test Vector | OWASP ASVS Category | Target Endpoint | Result | Mitigation Evidence |
|---|---|---|---|---|---|
| **DAST-01** | Missing Auth Header on Protected Route | V2: Authentication Architecture | `POST /api/v1/reports` | **PASS** | Request terminated with HTTP 401 Unauthorized (`authMiddleware`). |
| **DAST-02** | Expired / Tampered JWT Token | V2: Authentication Architecture | `GET /api/v1/analytics/trends` | **PASS** | Rejected with HTTP 401. Cryptographic signature and timestamp verified. |
| **DAST-03** | Horizontal Privilege Escalation (Cross-Tenant) | V4: Access Control | `GET /api/v1/reports?org=unauthorized` | **PASS** | Rejected with HTTP 403. Tenant isolation middleware blocks foreign org query. |
| **DAST-04** | Vertical Privilege Escalation (Observer -> Admin) | V4: Access Control | `POST /api/v1/integrations/connectors` | **PASS** | Rejected with HTTP 403 Forbidden (`requireRole(['OrgAdmin'])`). |
| **DAST-05** | Server-Side Request Forgery (SSRF) | V5: Validation & Sanitization | `POST /api/v1/integrations/outbound-webhooks` | **PASS** | Terminated with HTTP 400. Outbound URL blocked by RFC 1918 / 169.254 filter. |
| **DAST-06** | Stored Cross-Site Scripting (XSS) in Narrative | V5: Validation & Sanitization | `POST /api/v1/reports` | **PASS** | Script tags sanitized; output rendered with text node escaping. |
| **DAST-07** | Mass Assignment of Immutable Fields | V5: Validation & Sanitization | `PUT /api/v1/reports/REP-2026-0001` | **PASS** | Server-side DTO whitelist discards `organization_id` and `legal_hold` fields. |
| **DAST-08** | Ingress API Rate Limit Burst Exhaustion | V13: API & Web Service | `POST /api/v1/reports/evaluate` | **PASS** | Burst capped at rate-limit ceiling; excess requests return HTTP 429. |
| **DAST-09** | Path Traversal & File Inclusion | V12: File & Resources | `GET /api/v1/reports/..%2F..%2Fetc%2Fpasswd` | **PASS** | Request rejected with HTTP 400 / 404; path normalized safely. |
| **DAST-10** | Legal Hold Retention Immutability Tamper | V8: Data Protection | `DELETE /api/v1/reports/REP-2026-0001` | **PASS** | Terminated with HTTP 403. Active legal hold prohibits record deletion. |

---

### 5. OWASP ASVS v4.0 Verification Matrix

| ASVS Chapter | Requirement | Compliance Mechanism | Status |
|---|---|---|---|
| **V1: Architecture** | Single-tenant logical isolation | Middleware enforces `req.organization_id` matching JWT tenant claim | **VERIFIED** |
| **V2: Authentication** | Robust SSO / OIDC token verification | `identityService.ts` validates RS256 signatures, audience, and exp claims | **VERIFIED** |
| **V3: Session Management** | Cryptographically random session tokens | Tokens generated using `crypto.randomBytes(32)` | **VERIFIED** |
| **V4: Access Control** | Role-based least privilege | Strict role authorization guards on every state-changing route | **VERIFIED** |
| **V5: Validation** | Strict input typing & SSRF protection | `validateOutboundUrl` blocks loopback, private IPv4, and AWS/GCP metadata IPs | **VERIFIED** |
| **V8: Data Protection** | Data at rest and in transit | TLS 1.3 enforced; AES-256 field encryption on PII fields; Legal Hold immutability | **VERIFIED** |
| **V10: Malicious Code** | Content Security Policy | HTTP header `Content-Security-Policy: default-src 'self' ...` | **VERIFIED** |
| **V14: Configuration** | Secure error handling & stack trace suppression | `secureErrorHandler` suppresses stack traces in production environments | **VERIFIED** |

---

### 6. Guidance for External Security Auditors

1. **Pre-Test Briefing:** Notify the SUCHAK Security Team at `infosec@oilindia.in` prior to automated vulnerability scanner runs.
2. **SSRF Testing:** When probing the outbound webhook endpoint (`/api/v1/integrations/outbound-webhooks`), verify that targets resolving to `169.254.169.254` (Cloud Metadata) or `127.0.0.1` are cleanly dropped.
3. **Audit Logging:** Every authorization failure, tenant mismatch, and validation error is recorded in `/api/v1/integrations/audit-logs`. Inspect this log to verify full observability.
