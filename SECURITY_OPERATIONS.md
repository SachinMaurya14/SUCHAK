# SUCHAK Security Operations & Incident Response Playbook

## 1. Incident Severity Classification & Escalation Matrix

| Severity | Description | Examples | Target Response Time | Incident Commander |
|---|---|---|:---:|---|
| **SEV-1 (Critical)** | Active security compromise, tenant boundary breach, unauthorized model production promotion, or catastrophic data loss. | Cross-tenant data leakage detected, unverified AI model promoted to active status, leaked admin credentials. | **< 15 minutes** | Chief HSE Officer & Principal Security Architect |
| **SEV-2 (High)** | Sustained credential brute-force attack, elevated rate-limit exhaustion, intermittent authentication failures, or SIF alert delivery stalling. | 1,000+ failed login attempts from coordinated IPs, rate limit saturation on AI evaluation endpoint. | **< 1 hour** | Lead DevOps Engineer & Enterprise Admin |
| **SEV-3 (Medium)** | Isolated permission denial anomalies, individual user account lockout, or non-critical configuration warning. | Legitimate HSE reviewer locked out due to forgotten password, non-fatal CORS origin warning. | **< 4 hours** | Systems Administrator |
| **SEV-4 (Low)** | Minor cosmetic or documentation discrepancies with no security impact. | Audit log UI pagination bug, header formatting recommendation. | **< 24 hours** | Support Specialist |

---

## 2. Compromised Session & Token Revocation Runbook

### Scenario
An enterprise user device is lost, stolen, or credentials are suspected of being intercepted.

### Immediate Containment Steps

1. **Query Active Sessions for Compromised User**:
   Inspect active sessions via the `/api/v1/auth/me` endpoint or server console:
   ```bash
   curl -X GET "http://localhost:3000/api/v1/admin/security/events?event_type=LOGIN_SUCCESS&limit=20" \
     -H "Authorization: Bearer <ADMIN_TOKEN>"
   ```

2. **Revoke User Session Immediately**:
   Call the session revocation endpoint:
   ```bash
   curl -X POST "http://localhost:3000/api/v1/auth/logout" \
     -H "Authorization: Bearer <SUSPECT_TOKEN>"
   ```

3. **Lock Compromised Account**:
   If the user's password is suspected compromised, temporarily set `is_active = false` or trigger account lockout in `authStore`.

4. **Verify Revocation**:
   Confirm that requests using the revoked token return HTTP 401 `UNAUTHORIZED`.

5. **Security Audit Log Entry**:
   Verify an audit event `TOKEN_REVOKED` or `LOGOUT` is recorded in `/api/v1/admin/security/events`.

---

## 3. Secret Key & API Key Rotation Procedure (Zero-Downtime)

### Target Secrets: `SECRET_KEY` & `GEMINI_API_KEY`

#### Step 1: Pre-rotation Preparation
1. Generate a new high-entropy 64-character secret key:
   ```bash
   openssl rand -hex 32
   ```
2. Confirm current active session counts at `GET /api/v1/admin/security/status`.

#### Step 2: Deployment of New Secrets
1. Update environment secret in deployment configuration (Cloud Run, Kubernetes Secret, or `.env`).
2. Trigger rolling restart of container pods.
3. The platform validates the new configuration at boot via `validateConfig()`.

#### Step 3: Post-rotation Verification
1. Call `GET /health` and `GET /ready` to ensure HTTP 200 responses.
2. Execute automated 14-point regression suite via `POST /api/v1/admin/security/run-tests` or UI.
3. Confirm `SECRET_KEY` is not using the development fallback.

---

## 4. Brute Force & Rate Limit Mitigation Runbook

### Threat Signals
- Spike in `LOGIN_FAILED` or `RATE_LIMIT_EXCEEDED` events in the security audit stream.
- HTTP 429 errors returned to clients.

### Automated System Protections
1. **Account Lockout**: After 5 consecutive failed login attempts, the target account is automatically frozen for 15 minutes.
2. **Rate Limiting**:
   - `AUTH` category: strictly capped at 15 requests/minute per client IP.
   - `AI_EVAL` category: strictly capped at 30 requests/minute per client IP.
   - Headers `X-RateLimit-Remaining` and `Retry-After` are injected on responses.

### Manual Containment Actions
If distributed attack is detected:
1. Identify offending IP addresses in the audit event trail (`/api/v1/admin/security/events`).
2. Update edge ingress / WAF rules to drop traffic from offending IP ranges.
3. Reset affected user lockout counters once threat is mitigated.

---

## 5. Security Audit Log Inspection & Forensics

All critical security operations are logged to the immutable in-memory circular buffer and console logger.

### Key Event Types Monitored:
- `LOGIN_SUCCESS`: Authenticated session established.
- `LOGIN_FAILED`: Invalid credentials or non-existent user.
- `ACCOUNT_LOCKED`: 5 consecutive failures triggered account freeze.
- `PERMISSION_DENIED`: Authenticated user attempted action outside RBAC grant.
- `CROSS_SCOPE_ACCESS_BLOCKED`: Multi-tenant violation blocked at boundary.
- `TOKEN_REVOKED`: User logged out or expired session purged.
- `RATE_LIMIT_EXCEEDED`: Request burst threshold exceeded.
- `GOVERNANCE_DECISION`: Model status change or prompt mutation signed.

### Querying the Live Event Stream:
```bash
# Fetch latest security events
curl -X GET "http://localhost:3000/api/v1/admin/security/events?limit=50&outcome=BLOCKED" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
