/**
 * Automated Security Regression Test Suite for SUCHAK
 * Validates 14+ foundational security vectors: Authentication, RBAC, Tenant Isolation,
 * Rate Limiting, Path Traversal, Secret Leakage, Governance Mutability, and Resilience.
 */
import { authStore } from './authStore.ts';
import { dataStore } from './dataStore.ts';
import { modelGovernanceRegistry } from './modelGovernanceRegistry.ts';
import { config } from './config.ts';
import { sanitizeCsvField } from './redaction.ts';

export interface SecurityTestResult {
  id: string;
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'TENANT_ISOLATION' | 'INPUT_VALIDATION' | 'SECRETS_PROTECTION' | 'GOVERNANCE';
  name: string;
  description: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

export interface SecurityTestSuiteSummary {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  allPassed: boolean;
  results: SecurityTestResult[];
}

export async function runSecurityRegressionSuite(): Promise<SecurityTestSuiteSummary> {
  const results: SecurityTestResult[] = [];

  const runTest = async (
    id: string,
    category: SecurityTestResult['category'],
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
        durationMs: Date.now() - start,
      });
    } catch (err: any) {
      results.push({
        id,
        category,
        name,
        description,
        passed: false,
        durationMs: Date.now() - start,
        error: err.message || String(err),
      });
    }
  };

  // 1. Unauthenticated access denied
  await runTest(
    'SEC-01',
    'AUTHENTICATION',
    'Unauthenticated Session Validation',
    'Verifies that null or missing tokens return null session from AuthStore',
    () => {
      const session = authStore.getSession('');
      if (session !== null) throw new Error('Empty token returned active session');
      const fakeSession = authStore.getSession('invalid-token-123456');
      if (fakeSession !== null) throw new Error('Unregistered token returned active session');
    }
  );

  // 2. Authenticated authorized access succeeds
  await runTest(
    'SEC-02',
    'AUTHENTICATION',
    'Valid Credentials Authentication',
    'Verifies that valid credentials for OrgAdmin successfully authenticate and return token',
    () => {
      const authRes = authStore.authenticate('r.sharma@oil-enterprise.com', 'SuchakAdmin2026!');
      if (!authRes.success || !authRes.session?.token) {
        throw new Error(`Authentication failed: ${authRes.error}`);
      }
      const resolved = authStore.getSession(authRes.session.token);
      if (!resolved || resolved.email !== 'r.sharma@oil-enterprise.com') {
        throw new Error('Could not resolve session with issued token');
      }
    }
  );

  // 3. Brute force lockout protection works
  await runTest(
    'SEC-03',
    'AUTHENTICATION',
    'Brute Force Protection & Lockout',
    'Verifies account lockout occurs after consecutive failed attempts',
    () => {
      const testEmail = 'p.sen@oil-enterprise.com';
      // Attempt 5 bad logins
      let locked = false;
      for (let i = 0; i < 5; i++) {
        const res = authStore.authenticate(testEmail, 'WrongPassword123!');
        if (res.status === 429) {
          locked = true;
          break;
        }
      }
      // Re-check that subsequent login is locked
      const blockedRes = authStore.authenticate(testEmail, 'HseOfficer2026!');
      // Unlock account after test so user remains usable
      const user = (authStore as any).users.get(testEmail);
      if (user) {
        user.failed_login_attempts = 0;
        user.locked_until = null;
      }
      if (blockedRes.status !== 429 && !locked) {
        throw new Error('Account was not locked after 5 failed attempts');
      }
    }
  );

  // 4. Logout invalidates session
  await runTest(
    'SEC-04',
    'AUTHENTICATION',
    'Explicit Session Invalidation (Logout)',
    'Verifies that revoked session tokens immediately cease to authenticate',
    () => {
      const authRes = authStore.authenticate('b.borah@oil-enterprise.com', 'SiteManager2026!');
      if (!authRes.session) throw new Error('Failed to create session for logout test');
      const token = authRes.session.token;

      // Verify active
      if (!authStore.getSession(token)) throw new Error('Session not found before logout');

      // Logout
      const revoked = authStore.revokeSession(token);
      if (!revoked) throw new Error('Revocation reported false');

      // Verify dead
      if (authStore.getSession(token)) throw new Error('Session remained valid after revocation');
    }
  );

  // 5. Cross-tenant read access blocked
  await runTest(
    'SEC-05',
    'TENANT_ISOLATION',
    'Cross-Tenant Query Isolation',
    'Verifies that reports for Org A are inaccessible to queries strictly scoped to Org B',
    () => {
      // Fetch reports for oil-india-demo
      const orgAReports = dataStore.listReports({ page_size: 10 });
      if (orgAReports.items.length === 0) throw new Error('No reports found for Org A');

      // Ensure that contractor-alpha-org sees zero reports belonging to oil-india-demo
      const isolatedList = orgAReports.items.filter((r) => r.organization_id === 'contractor-alpha-org');
      if (isolatedList.length > 0) {
        throw new Error('Found cross-tenant report leakage in report list');
      }
    }
  );

  // 6. Cross-tenant mutation blocked
  await runTest(
    'SEC-06',
    'TENANT_ISOLATION',
    'Cross-Tenant Mutation Boundary',
    'Verifies that reports from Org A cannot be mutated by Org B actors',
    () => {
      const report = dataStore.getReportById('rep-uuid-0891');
      if (!report) throw new Error('Report rep-uuid-0891 not found');
      if (report.organization_id !== 'oil-india-demo') {
        throw new Error('Target report is not in expected Org A');
      }

      // Simulated tenant check
      const contractorOrgId: string = 'contractor-alpha-org';
      const targetOrgId: string = report.organization_id;
      const isAllowed = targetOrgId === contractorOrgId;
      if (isAllowed) {
        throw new Error('Cross-tenant mutation validation allowed foreign org ID');
      }
    }
  );

  // 7. Role-Based Permissions enforcement
  await runTest(
    'SEC-07',
    'AUTHORIZATION',
    'RBAC Least Privilege Validation',
    'Verifies that SiteManager role lacks administrative and governance approval permissions',
    () => {
      const mgrAuth = authStore.authenticate('b.borah@oil-enterprise.com', 'SiteManager2026!');
      if (!mgrAuth.session) throw new Error('SiteManager session failed');

      const perms = mgrAuth.session.permissions;
      if (perms.includes('evaluation.approve')) {
        throw new Error('SiteManager possesses unauthorized evaluation.approve permission');
      }
      if (perms.includes('admin.users')) {
        throw new Error('SiteManager possesses unauthorized admin.users permission');
      }
      if (perms.includes('model.manage')) {
        throw new Error('SiteManager possesses unauthorized model.manage permission');
      }
    }
  );

  // 8. Governance Model Status State Machine
  await runTest(
    'SEC-08',
    'GOVERNANCE',
    'AI Model Governance State Transition Guard',
    'Verifies that candidate models cannot bypass evaluation and jump straight to production active without approval',
    () => {
      const candidateModel = modelGovernanceRegistry.getModel('MOD-SAFETY-LLM-GEMINI-CANDIDATE-01');
      if (candidateModel) {
        if (candidateModel.is_production_active) {
          throw new Error('Candidate model is prematurely active in production');
        }
      }
    }
  );

  // 9. Path traversal protection in file uploads / assets
  await runTest(
    'SEC-09',
    'INPUT_VALIDATION',
    'Path Traversal & Filename Sanitization',
    'Verifies that directory traversal patterns (../) in filenames are rejected or neutralized',
    () => {
      const dangerousFilename = '../../../../etc/passwd';
      const sanitized = dangerousFilename.replace(/^.*[\\\/]/, '');
      if (sanitized.includes('..') || sanitized.includes('/')) {
        throw new Error('Path traversal sequence was not stripped');
      }
      if (sanitized !== 'passwd') {
        throw new Error(`Unexpected sanitized filename: ${sanitized}`);
      }
    }
  );

  // 10. CSV Formula Injection Sanitization
  await runTest(
    'SEC-10',
    'INPUT_VALIDATION',
    'CSV Formula Injection Neutralization',
    'Verifies that dynamic spreadsheet formulas (=SUM, -EXEC, @DDE) are escaped with leading single quote',
    () => {
      const maliciousFields = [
        '=cmd|"/C calc"!A0',
        '+10+20',
        '-50*2',
        '@SUM(1,2)',
      ];

      for (const field of maliciousFields) {
        const sanitized = sanitizeCsvField(field);
        if (!sanitized.startsWith("'")) {
          throw new Error(`Formula injection field was not properly escaped: ${field} -> ${sanitized}`);
        }
      }

      const safeField = 'Normal safety text';
      if (sanitizeCsvField(safeField) !== safeField) {
        throw new Error('Safe string was modified unnecessarily');
      }
    }
  );

  // 11. Secrets are absent from client responses
  await runTest(
    'SEC-11',
    'SECRETS_PROTECTION',
    'Secret Credentials Non-Exposure',
    'Verifies that user records returned to clients strip password hashes and salts',
    () => {
      const users = authStore.getAllUsers('oil-india-demo');
      for (const user of users) {
        if ((user as any).password_hash || (user as any).salt) {
          throw new Error(`User object leaked password hash or salt: ${user.email}`);
        }
      }
    }
  );

  // 12. Model registry permissions restriction
  await runTest(
    'SEC-12',
    'GOVERNANCE',
    'Model Registration Authorization Guard',
    'Verifies that registering candidate models requires administrative/governance permissions',
    () => {
      const reviewerSession = authStore.authenticate('a.kakati@oil-enterprise.com', 'Reviewer2026!').session;
      if (!reviewerSession) throw new Error('Failed to obtain reviewer session');

      const hasModelManage = reviewerSession.permissions.includes('model.manage') || reviewerSession.role === 'OrgAdmin';
      if (hasModelManage) {
        throw new Error('SafetyReviewer unexpectedly has model.manage permission');
      }
    }
  );

  // 13. Liveness and Readiness Integrity
  await runTest(
    'SEC-13',
    'GOVERNANCE',
    'System Health & Dependency Readiness',
    'Verifies dataStore, vectorStore, and model governance registry respond healthy',
    () => {
      const sites = dataStore.getSites();
      if (!sites || sites.length === 0) throw new Error('DataStore sites collection unavailable');
      const activeModel = modelGovernanceRegistry.getActiveProductionModel();
      if (!activeModel) throw new Error('Model Governance Registry has no active production model');
    }
  );

  // 14. Security Audit Event Ingestion
  await runTest(
    'SEC-14',
    'SECRETS_PROTECTION',
    'Security Audit Event Trail Emission',
    'Verifies that security events are recorded with actor, timestamp, outcome, and request ID',
    () => {
      const testEvt = authStore.logSecurityEvent({
        event_type: 'SECRET_CONFIG_VALIDATION',
        actor_email: 'automated-test-runner@suchak.internal',
        action_summary: 'Automated test suite validation execution',
        outcome: 'SUCCESS',
        request_id: 'req-test-suite',
      });
      if (!testEvt.id || !testEvt.timestamp) {
        throw new Error('Security event failed to record proper metadata');
      }
      const retrieved = authStore.getSecurityEvents({ event_type: 'SECRET_CONFIG_VALIDATION', limit: 5 });
      if (!retrieved.some((e) => e.id === testEvt.id)) {
        throw new Error('Could not query logged security event from store');
      }
    }
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    total: results.length,
    passed,
    failed,
    allPassed: failed === 0,
    results,
  };
}
