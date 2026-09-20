/**
 * Automated Enterprise Identity, SSO/OIDC & Access Governance Test Suite
 * Phase 17 - SUCHAK Platform
 * 25-Vector Verification Suite
 */
import { identityService } from './identityService.ts';
import { authStore } from './authStore.ts';
import { UserRole } from './authTypes.ts';

export interface IdentityTestResult {
  id: string;
  name: string;
  category: 'OIDC_CRYPTOGRAPHY' | 'RBAC_GOVERNANCE' | 'TENANT_ISOLATION' | 'ACCOUNT_LIFECYCLE' | 'SECRETS_AND_AUDIT';
  description: string;
  passed: boolean;
  duration_ms: number;
  error?: string;
}

export interface IdentityTestSuiteSummary {
  timestamp: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  all_passed: boolean;
  total_duration_ms: number;
  results: IdentityTestResult[];
}

export async function runIdentityValidationSuite(): Promise<IdentityTestSuiteSummary> {
  const results: IdentityTestResult[] = [];
  const suiteStart = Date.now();

  const registerTest = async (
    id: string,
    category: IdentityTestResult['category'],
    name: string,
    description: string,
    fn: () => Promise<void> | void
  ) => {
    const start = Date.now();
    try {
      await fn();
      results.push({
        id,
        category,
        name,
        description,
        passed: true,
        duration_ms: Date.now() - start,
      });
    } catch (err: any) {
      results.push({
        id,
        category,
        name,
        description,
        passed: false,
        duration_ms: Date.now() - start,
        error: err.message || String(err),
      });
    }
  };

  const oilIdp = identityService.getProviderById('idp-oil-entra', true) as any;
  const contractorIdp = identityService.getProviderById('idp-contractor-google', true) as any;

  // 1. Valid OIDC Issuer Accepted
  await registerTest(
    'IDP-01',
    'OIDC_CRYPTOGRAPHY',
    'Valid OIDC Cryptographic Verification',
    'Verifies that an RS256 token signed by trusted keyset with matching issuer and audience is accepted',
    () => {
      const token = identityService.generateSyntheticOidcToken({
        provider_id: 'idp-oil-entra',
        subject: 'oil-sub-441092-psen',
        email: 'p.sen@oil-enterprise.com',
      });
      const decoded = identityService.verifyAndDecodeIdToken(token, oilIdp);
      if (!decoded.valid || !decoded.payload) {
        throw new Error(decoded.error || 'Valid token verification failed');
      }
      if (decoded.payload.iss !== oilIdp.issuer) {
        throw new Error('Decoded issuer mismatch');
      }
    }
  );

  // 2. Invalid Issuer Rejected
  await registerTest(
    'IDP-02',
    'OIDC_CRYPTOGRAPHY',
    'Invalid Issuer Rejection',
    'Verifies that tokens bearing an unapproved or spoofed issuer are rejected immediately',
    () => {
      const token = identityService.generateSyntheticOidcToken({
        provider_id: 'idp-oil-entra',
        subject: 'oil-sub-441092-psen',
        email: 'p.sen@oil-enterprise.com',
        customIssuer: 'https://rogue-idp.attacker.com/oauth2',
      });
      const decoded = identityService.verifyAndDecodeIdToken(token, oilIdp);
      if (decoded.valid) {
        throw new Error('Token with spoofed issuer was unexpectedly accepted');
      }
    }
  );

  // 3. Invalid Audience Rejected
  await registerTest(
    'IDP-03',
    'OIDC_CRYPTOGRAPHY',
    'Audience Restriction Validation',
    'Verifies that tokens issued for another application/client_id are rejected',
    () => {
      const token = identityService.generateSyntheticOidcToken({
        provider_id: 'idp-oil-entra',
        subject: 'oil-sub-441092-psen',
        email: 'p.sen@oil-enterprise.com',
        customAudience: 'some-foreign-client-app-id',
      });
      const decoded = identityService.verifyAndDecodeIdToken(token, oilIdp);
      if (decoded.valid) {
        throw new Error('Token with mismatched audience was unexpectedly accepted');
      }
    }
  );

  // 4. Expired Token Rejected
  await registerTest(
    'IDP-04',
    'OIDC_CRYPTOGRAPHY',
    'Expired Token Rejection',
    'Verifies that tokens past their expiration timestamp (exp <= now) are denied',
    () => {
      const token = identityService.generateSyntheticOidcToken({
        provider_id: 'idp-oil-entra',
        subject: 'oil-sub-441092-psen',
        email: 'p.sen@oil-enterprise.com',
        expiresInSec: -300, // Expired 5 minutes ago
      });
      const decoded = identityService.verifyAndDecodeIdToken(token, oilIdp);
      if (decoded.valid) {
        throw new Error('Expired token was unexpectedly accepted');
      }
    }
  );

  // 5. Forged Signature Rejected
  await registerTest(
    'IDP-05',
    'OIDC_CRYPTOGRAPHY',
    'Signature Tampering Detection',
    'Verifies that payload or signature byte modification invalidates the cryptographic check',
    () => {
      const token = identityService.generateSyntheticOidcToken({
        provider_id: 'idp-oil-entra',
        subject: 'oil-sub-441092-psen',
        email: 'p.sen@oil-enterprise.com',
        tamperSignature: true,
      });
      const decoded = identityService.verifyAndDecodeIdToken(token, oilIdp);
      if (decoded.valid) {
        throw new Error('Tampered token signature was unexpectedly accepted');
      }
    }
  );

  // 6. Nonce Mismatch Rejected
  await registerTest(
    'IDP-06',
    'OIDC_CRYPTOGRAPHY',
    'Replay Prevention via Nonce Match',
    'Verifies that a token nonce differing from authorization request is denied',
    () => {
      const token = identityService.generateSyntheticOidcToken({
        provider_id: 'idp-oil-entra',
        subject: 'oil-sub-441092-psen',
        email: 'p.sen@oil-enterprise.com',
        nonce: 'attacker-injected-nonce-xyz',
      });
      const decoded = identityService.verifyAndDecodeIdToken(token, oilIdp, 'expected-session-nonce-abc');
      if (decoded.valid) {
        throw new Error('Nonce mismatch was unexpectedly accepted');
      }
    }
  );

  // 7. State Parameter Validation & CSRF Protection
  await registerTest(
    'IDP-07',
    'OIDC_CRYPTOGRAPHY',
    'State Parameter Login CSRF Mitigation',
    'Verifies that uninitiated callbacks or consumed state tokens fail immediately',
    () => {
      const fakeState = 'fake-uninitiated-state-token-12345';
      const res = identityService.handleSsoCallback({
        state: fakeState,
        id_token: 'dummy',
      });
      if (res.success || res.status !== 403) {
        throw new Error('Callback with invalid state was not blocked with 403');
      }
    }
  );

  // 8. Full Authorization Request Creation with PKCE
  await registerTest(
    'IDP-08',
    'OIDC_CRYPTOGRAPHY',
    'PKCE Code Challenge & Verifier Generation',
    'Verifies that S256 code_challenge is generated for public PKCE authorization flows',
    () => {
      const authReq = identityService.createOidcAuthorizationRequest('idp-oil-entra', '/api/v1/auth/sso/callback');
      if (!authReq.authorizationUrl.includes('code_challenge=') || !authReq.state || !authReq.nonce) {
        throw new Error('Authorization request missing PKCE challenge or state parameter');
      }
      if (!authReq.code_verifier) {
        throw new Error('Provider with enforce_pkce failed to generate code_verifier');
      }
    }
  );

  // 9. Duplicate Identity Link Rejection
  await registerTest(
    'IDP-09',
    'ACCOUNT_LIFECYCLE',
    'Duplicate External Subject Protection',
    'Verifies that attempting to bind the same external subject to another user fails',
    () => {
      try {
        identityService.linkExternalIdentity({
          user_id: 'usr-mgr-04',
          organization_id: 'oil-india-demo',
          provider_id: 'idp-oil-entra',
          external_subject: 'oil-sub-889102-rsharma', // Already linked to usr-admin-01
          external_email: 'r.sharma@oil-enterprise.com',
        });
        throw new Error('Expected duplicate subject link to throw error');
      } catch (err: any) {
        if (!err.message.includes('already linked')) {
          throw err;
        }
      }
    }
  );

  // 10. Identity Link Authorization Enforced
  await registerTest(
    'IDP-10',
    'ACCOUNT_LIFECYCLE',
    'External Subject Identity Link Persistence',
    'Verifies that external subjects map to existing local user IDs without altering database schema',
    () => {
      const links = identityService.getIdentityLinks('oil-india-demo');
      const adminLink = links.find((l) => l.user_id === 'usr-admin-01');
      if (!adminLink || adminLink.external_subject !== 'oil-sub-889102-rsharma') {
        throw new Error('Admin external subject link not found or corrupt');
      }
    }
  );

  // 11. Cross-Tenant Identity Ingress Blocked
  await registerTest(
    'IDP-11',
    'TENANT_ISOLATION',
    'Cross-Tenant Identity Boundary Enforcement',
    'Verifies that Provider A (Alpha Contractor) cannot authenticate into User B (Oil India Limited)',
    () => {
      // Initiate request on Contractor Provider
      const authReq = identityService.createOidcAuthorizationRequest('idp-contractor-google', '/api/v1/auth/sso/callback');

      // But generate token linked to Oil India user
      const token = identityService.generateSyntheticOidcToken({
        provider_id: 'idp-contractor-google',
        subject: 'alpha-sub-0091-ksingha',
        email: 'p.sen@oil-enterprise.com', // Oil India user!
        nonce: authReq.nonce,
      });

      // Attempt callback: should be blocked because user belongs to oil-india-demo, but provider belongs to contractor-alpha-org
      const res = identityService.handleSsoCallback({
        state: authReq.state,
        id_token: token,
      });

      if (res.success) {
        throw new Error('Cross-tenant identity was unexpectedly permitted to establish session');
      }
      if (res.reason_code !== 'CROSS_TENANT_BLOCKED' && res.reason_code !== 'ACCOUNT_NOT_PROVISIONED') {
        throw new Error(`Unexpected reason code: ${res.reason_code}`);
      }
    }
  );

  // 12. Inactive Local User Denied
  await registerTest(
    'IDP-12',
    'ACCOUNT_LIFECYCLE',
    'Local Deactivated Account Ingress Blocked',
    'Verifies that even if IdP authenticates subject, inactive local SUCHAK user is rejected',
    () => {
      // Temporarily deactivate usr-hse-02
      const user = (authStore as any).users.get('p.sen@oil-enterprise.com');
      const origActive = user.is_active;
      user.is_active = false;

      try {
        const authReq = identityService.createOidcAuthorizationRequest('idp-oil-entra', '/api/v1/auth/sso/callback');
        const token = identityService.generateSyntheticOidcToken({
          provider_id: 'idp-oil-entra',
          subject: 'oil-sub-441092-psen',
          email: 'p.sen@oil-enterprise.com',
          nonce: authReq.nonce,
        });

        const res = identityService.handleSsoCallback({
          state: authReq.state,
          id_token: token,
        });

        if (res.success) {
          throw new Error('Deactivated user was unexpectedly allowed to log in via SSO');
        }
      } finally {
        user.is_active = origActive;
      }
    }
  );

  // 13. Suspended Enterprise Account Denied
  await registerTest(
    'IDP-13',
    'ACCOUNT_LIFECYCLE',
    'Suspended Enterprise Account Ingress Blocked',
    'Verifies that accounts marked SUSPENDED by governance cannot authenticate via SSO',
    () => {
      const authReq = identityService.createOidcAuthorizationRequest('idp-oil-entra', '/api/v1/auth/sso/callback');
      const token = identityService.generateSyntheticOidcToken({
        provider_id: 'idp-oil-entra',
        subject: 'oil-sub-771100-exauditor', // Marked SUSPENDED in seed
        email: 'ex.auditor@oil-enterprise.com',
        nonce: authReq.nonce,
      });

      const res = identityService.handleSsoCallback({
        state: authReq.state,
        id_token: token,
      });

      if (res.success) {
        throw new Error('Suspended enterprise user was unexpectedly permitted to log in');
      }
      if (res.status !== 403 || res.reason_code !== 'ACCOUNT_SUSPENDED') {
        throw new Error(`Expected 403 ACCOUNT_SUSPENDED, got status ${res.status} (${res.reason_code})`);
      }
    }
  );

  // 14. Group-to-Role Mapping Enforced
  await registerTest(
    'IDP-14',
    'RBAC_GOVERNANCE',
    'Group Claim to SUCHAK Role Mapping',
    'Verifies that enterprise groups map directly to authorized SUCHAK roles (e.g. oil-hse-inspectors -> HSEOfficer)',
    () => {
      const authReq = identityService.createOidcAuthorizationRequest('idp-oil-entra', '/api/v1/auth/sso/callback');
      const token = identityService.generateSyntheticOidcToken({
        provider_id: 'idp-oil-entra',
        subject: 'oil-sub-441092-psen',
        email: 'p.sen@oil-enterprise.com',
        groups: ['oil-hse-inspectors'],
        nonce: authReq.nonce,
      });

      const res = identityService.handleSsoCallback({
        state: authReq.state,
        id_token: token,
      });

      if (!res.success || !res.session) {
        throw new Error(`SSO callback failed: ${res.error}`);
      }
      if (res.session.role !== 'HSEOfficer') {
        throw new Error(`Expected mapped role HSEOfficer, got ${res.session.role}`);
      }
    }
  );

  // 15. Privileged Group Escalation Protected
  await registerTest(
    'IDP-15',
    'RBAC_GOVERNANCE',
    'Arbitrary External Claim Escalation Protection',
    'Verifies that an unmapped claim (e.g. rogue-super-admin) does not grant OrgAdmin role',
    () => {
      const authReq = identityService.createOidcAuthorizationRequest('idp-oil-entra', '/api/v1/auth/sso/callback');
      const token = identityService.generateSyntheticOidcToken({
        provider_id: 'idp-oil-entra',
        subject: 'oil-sub-441092-psen',
        email: 'p.sen@oil-enterprise.com',
        groups: ['malicious-unmapped-super-admin-group'],
        nonce: authReq.nonce,
      });

      const res = identityService.handleSsoCallback({
        state: authReq.state,
        id_token: token,
      });

      if (!res.success) throw new Error(res.error);
      if (res.session.role === 'OrgAdmin') {
        throw new Error('Unmapped group claim escalated user to OrgAdmin!');
      }
    }
  );

  // 16. Role Conflict Priority Precedence
  await registerTest(
    'IDP-16',
    'RBAC_GOVERNANCE',
    'Deterministic Role Precedence Resolution',
    'Verifies that when multiple groups match, explicit mapping priority resolves the role deterministically',
    () => {
      // User has both oil-hse-inspectors (Priority 10) and oil-safety-supervisors (Priority 20)
      const role = identityService.resolveRoleFromGroups(
        'oil-india-demo',
        'idp-oil-entra',
        ['oil-hse-inspectors', 'oil-safety-supervisors'],
        'SiteManager'
      );
      if (role !== 'SafetyReviewer') {
        throw new Error(`Expected higher priority role SafetyReviewer, got ${role}`);
      }
    }
  );

  // 17. Safe Provider Configuration Validation
  await registerTest(
    'IDP-17',
    'OIDC_CRYPTOGRAPHY',
    'IdP Configuration Diagnostics',
    'Verifies automated validation checks: issuer syntax, client ID, and keyset availability',
    () => {
      const diag = identityService.validateProviderConfig('idp-oil-entra');
      if (!diag.valid) {
        throw new Error('Valid default provider failed diagnostic checks');
      }
    }
  );

  // 18. Provider Secret Reference Masking
  await registerTest(
    'IDP-18',
    'SECRETS_AND_AUDIT',
    'Provider Secret Reference Masking in Public APIs',
    'Verifies that client_secret_ref is strictly stripped from provider API responses',
    () => {
      const publicProviders = identityService.getProviders(undefined, true);
      for (const p of publicProviders) {
        if ('client_secret_ref' in p) {
          throw new Error(`Secret reference leaked in public provider listing for ${p.id}`);
        }
      }
    }
  );

  // 19. Sensitive Tokens Redacted from Security Audit Log
  await registerTest(
    'IDP-19',
    'SECRETS_AND_AUDIT',
    'Audit Trail Token Redaction',
    'Verifies that security audit records never log raw authorization tokens or code parameters',
    () => {
      const events = authStore.getSecurityEvents({ limit: 100 });
      for (const e of events) {
        const str = JSON.stringify(e);
        if (str.includes('eyJhbGci') || str.includes('suchak-dev-only-insecure-secret')) {
          throw new Error('Raw JWT token or secret discovered in security event log');
        }
      }
    }
  );

  // 20. Domain Discovery
  await registerTest(
    'IDP-20',
    'TENANT_ISOLATION',
    'Corporate Email Domain Discovery',
    'Verifies email domain maps to enterprise tenant without disclosing user existence',
    () => {
      const disc = identityService.discoverOrganizationByEmail('random.inspector@oil-enterprise.com');
      if (!disc.discovered || !disc.provider || disc.provider.id !== 'idp-oil-entra') {
        throw new Error('Failed to discover oil-india-demo provider from domain');
      }
      const discUnknown = identityService.discoverOrganizationByEmail('user@unknown-public-domain.com');
      if (discUnknown.discovered) {
        throw new Error('Unknown domain unexpectedly returned discovery result');
      }
    }
  );

  // 21. Session Invalidation Upon Account Suspension
  await registerTest(
    'IDP-21',
    'ACCOUNT_LIFECYCLE',
    'Active Session Purge on Suspension',
    'Verifies that setting lifecycle status to SUSPENDED revokes all active sessions for that user',
    () => {
      // Create session for usr-mgr-04
      const user = authStore.getAllUsers().find((u) => u.id === 'usr-mgr-04')!;
      const fullRecord = (authStore as any).users.get(user.email);
      const session = authStore.createSession(fullRecord);

      // Verify session exists
      const retrieved = authStore.getSession(session.token);
      if (!retrieved) throw new Error('Failed to create test session');

      // Suspend account
      identityService.setAccountLifecycleStatus('usr-mgr-04', 'SUSPENDED', 'admin_test', 'Audit requirement');

      // Check session is revoked
      const afterSuspend = authStore.getSession(session.token);
      if (afterSuspend) {
        throw new Error('Active session was not invalidated following account suspension');
      }

      // Reactivate for normal state
      identityService.setAccountLifecycleStatus('usr-mgr-04', 'ACTIVE', 'admin_test', 'Test restored');
    }
  );

  // 22. Unlink External Identity Retains User & History
  await registerTest(
    'IDP-22',
    'ACCOUNT_LIFECYCLE',
    'Identity Unlinking Data Preservation',
    'Verifies unlinking an external IdP removes provider link without deleting user or past reports',
    () => {
      // Link a test identity
      const link = identityService.linkExternalIdentity({
        user_id: 'usr-mgr-04',
        organization_id: 'oil-india-demo',
        provider_id: 'idp-oil-entra',
        external_subject: 'temp-sub-998811',
        external_email: 'temp.mgr@oil-enterprise.com',
      });

      const unlinked = identityService.unlinkExternalIdentity(link.id, 'admin_test');
      if (!unlinked.success) throw new Error('Failed to unlink identity');

      // Verify user still exists in local authStore
      const userStillExists = authStore.getAllUsers().some((u) => u.id === 'usr-mgr-04');
      if (!userStillExists) {
        throw new Error('Local user record was deleted after identity unlink');
      }
    }
  );

  // 23. Disabled Provider Rejects New Authentication
  await registerTest(
    'IDP-23',
    'OIDC_CRYPTOGRAPHY',
    'Disabled Provider Ingress Block',
    'Verifies that transitioning an IdP to DISABLED immediately blocks new login attempts',
    () => {
      identityService.setProviderStatus('idp-contractor-google', 'DISABLED', 'admin_test');

      try {
        identityService.createOidcAuthorizationRequest('idp-contractor-google', '/api/v1/auth/sso/callback');
        throw new Error('Expected authorization request to fail on DISABLED provider');
      } catch (err: any) {
        if (!err.message.includes('inactive')) {
          throw err;
        }
      } finally {
        identityService.setProviderStatus('idp-contractor-google', 'ACTIVE', 'admin_test');
      }
    }
  );

  // 24. Access Governance Stale Account Detection
  await registerTest(
    'IDP-24',
    'RBAC_GOVERNANCE',
    'Access Governance Stale Account Detection',
    'Verifies that accounts inactive for over 90 days are flagged in governance reports',
    () => {
      const report = identityService.getAccessGovernanceReport('oil-india-demo');
      if (report.stale_users < 1) {
        throw new Error('Stale user account (>90 days inactive) was not detected');
      }
      const staleUser = report.users.find((u) => u.email === 'legacy.consultant@oil-enterprise.com');
      if (!staleUser || !staleUser.is_stale) {
        throw new Error('Legacy consultant account was not properly flagged as is_stale: true');
      }
    }
  );

  // 25. Fail-Closed Principle
  await registerTest(
    'IDP-25',
    'RBAC_GOVERNANCE',
    'Fail-Closed Security Posture',
    'Verifies that ambiguous identity parameters, invalid signatures, or missing claims strictly deny access',
    () => {
      const res = identityService.handleSsoCallback({
        state: '',
        id_token: '',
      });
      if (res.success || res.status < 400) {
        throw new Error('Fail-closed check failed: ambiguous parameters allowed session creation');
      }
    }
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    total_tests: results.length,
    passed_tests: passed,
    failed_tests: failed,
    all_passed: failed === 0,
    total_duration_ms: Date.now() - suiteStart,
    results,
  };
}
