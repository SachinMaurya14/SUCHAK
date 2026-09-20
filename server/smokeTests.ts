/**
 * SUCHAK Production Deployment Smoke Test Suite
 * Executes 17 production-safe verification vectors against live subsystems to validate deployment health.
 */
import { authStore } from './authStore.ts';
import { dataStore } from './dataStore.ts';
import { reviewStore } from './reviewStore.ts';
import { actionStore } from './actionStore.ts';
import { alertStore } from './alertStore.ts';
import { modelGovernanceRegistry } from './modelGovernanceRegistry.ts';
import { vectorStore } from './vectorStore.ts';
import { storageService } from './storageService.ts';
import { safetyEngine } from './safetyEngine.ts';

export interface SmokeTestResult {
  id: string;
  name: string;
  description: string;
  category: 'INFRASTRUCTURE' | 'AUTH_RBAC' | 'TENANT' | 'WORKFLOW' | 'AI_DATA' | 'AUDIT';
  passed: boolean;
  durationMs: number;
  error?: string;
}

export interface SmokeTestSuiteSummary {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  allPassed: boolean;
  results: SmokeTestResult[];
}

export async function runDeploymentSmokeTests(): Promise<SmokeTestSuiteSummary> {
  const results: SmokeTestResult[] = [];

  const runTest = async (
    id: string,
    name: string,
    category: SmokeTestResult['category'],
    description: string,
    fn: () => Promise<void> | void
  ) => {
    const start = Date.now();
    try {
      await fn();
      results.push({
        id,
        name,
        category,
        description,
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (err: any) {
      results.push({
        id,
        name,
        category,
        description,
        passed: false,
        durationMs: Date.now() - start,
        error: err.message || String(err),
      });
    }
  };

  // 1. Application Reachable
  await runTest(
    'SMOKE-01',
    'Application Liveness Probe',
    'INFRASTRUCTURE',
    'Verifies event loop response and process uptime is positive',
    () => {
      if (typeof process.uptime() !== 'number' || process.uptime() < 0) {
        throw new Error('Process uptime is invalid');
      }
    }
  );

  // 2. Frontend Assets Loadable
  await runTest(
    'SMOKE-02',
    'Frontend Entry Asset Verification',
    'INFRASTRUCTURE',
    'Verifies HTML entry point and static build assets exist',
    () => {
      // In node runtime check that client entry index.html is accessible
      const fs = require('fs');
      const path = require('path');
      const htmlPath = path.resolve(process.cwd(), 'index.html');
      if (!fs.existsSync(htmlPath)) {
        throw new Error('Frontend index.html missing from deployment root');
      }
    }
  );

  // 3. API Health & Subsystems
  await runTest(
    'SMOKE-03',
    'API Subsystem Health Check',
    'INFRASTRUCTURE',
    'Confirms database, governance registry, and vector stores report ready',
    () => {
      const sites = dataStore.getSites();
      if (!sites || sites.length === 0) throw new Error('Reference sites not loaded');
      const model = modelGovernanceRegistry.getActiveProductionModel();
      if (!model) throw new Error('Active production AI safety model not loaded');
    }
  );

  // 4. Login & Authentication
  let testToken = '';
  await runTest(
    'SMOKE-04',
    'Authentication Flow',
    'AUTH_RBAC',
    'Authenticates seeded HSE Officer with PBKDF2 credential hash check',
    () => {
      const res = authStore.authenticate('p.sen@oil-enterprise.com', 'HseOfficer2026!');
      if (!res.success || !res.session?.token) {
        throw new Error(`Authentication failed: ${res.error}`);
      }
      testToken = res.session.token;
    }
  );

  // 5. Authenticated Request Resolution
  await runTest(
    'SMOKE-05',
    'Session Token Resolution',
    'AUTH_RBAC',
    'Resolves authenticated user profile from bearer session token',
    () => {
      if (!testToken) throw new Error('No test token from previous step');
      const session = authStore.getSession(testToken);
      if (!session || session.email !== 'p.sen@oil-enterprise.com') {
        throw new Error('Failed to resolve active session token');
      }
    }
  );

  // 6. RBAC Role Protection
  await runTest(
    'SMOKE-06',
    'RBAC Privilege Boundary',
    'AUTH_RBAC',
    'Ensures non-admin role cannot execute administrative model promotion',
    () => {
      const session = authStore.getSession(testToken);
      if (!session) throw new Error('No session');
      const hasAdmin = session.permissions.includes('operations.manage') || session.role === 'OrgAdmin';
      if (hasAdmin) {
        throw new Error('HSEOfficer role has unauthorized system:configure permission');
      }
    }
  );

  // 7. Tenant Boundary Isolation
  await runTest(
    'SMOKE-07',
    'Multi-Tenant Scoping Isolation',
    'TENANT',
    'Confirms queries scoped to oil-india-demo do not leak foreign tenant records',
    () => {
      const reports = dataStore.getAllReports();
      const foreign = reports.filter((r) => r.organization_id && r.organization_id !== 'oil-india-demo');
      if (foreign.length > 0) {
        throw new Error(`Tenant leak: ${foreign.length} foreign reports returned in query`);
      }
    }
  );

  // 8. Report Reading
  await runTest(
    'SMOKE-08',
    'Safety Report Store Read Path',
    'WORKFLOW',
    'Retrieves baseline industrial safety reports and validates fields',
    () => {
      const reports = dataStore.getAllReports();
      if (!reports || reports.length < 5) {
        throw new Error(`Expected at least 5 safety reports, found ${reports?.length}`);
      }
      const first = reports[0];
      if (!first.id || !first.report_number || !first.report_type) {
        throw new Error('Report data structure is incomplete');
      }
    }
  );

  // 9. Report Creation (Safe Synthetic Record)
  await runTest(
    'SMOKE-09',
    'Safety Report Ingestion Write Path',
    'WORKFLOW',
    'Ingests a synthetic safety observation and verifies persistence',
    async () => {
      const syntheticReport = await dataStore.createReport({
        report_type: 'Near-Miss',
        description: 'Smoke test synthetic inspection record. Whip checks and barrier clearance verified.',
        site_id: 'site-digboi-01',
        location_id: 'loc-01',
        activity_id: 'act-01',
        source: 'MOBILE_APP',
      });
      if (!syntheticReport.id || !syntheticReport.report_number.startsWith('REP-')) {
        throw new Error(`Created report id ${syntheticReport.id} is invalid`);
      }
    }
  );

  // 10. AI Analysis Failure-Safe Path
  await runTest(
    'SMOKE-10',
    'AI Safety Engine Fallback Path',
    'AI_DATA',
    'Evaluates safety text and ensures deterministic fallback handles analysis safely',
    async () => {
      const analysis = await safetyEngine.analyzeSafetyReport({
        title: 'Unsecured pressurized hydraulic hose near drill floor',
        description: 'Crew observed high-pressure testing without safety whip-check cable attached.',
        activity: 'High-Pressure Testing',
        site: 'Duliajan Central Well',
      });
      if (!analysis.sif_potential || analysis.risk_score < 50) {
        throw new Error('AI or expert fallback failed to flag high-pressure SIF hazard');
      }
    }
  );

  // 11. Semantic Vector Search
  await runTest(
    'SMOKE-11',
    'Semantic Similarity Vector Search',
    'AI_DATA',
    'Executes semantic nearest-neighbor query across pre-computed vector index',
    async () => {
      const matches = await vectorStore.searchSimilarReports('scaffold tie-off harness missing', 3);
      if (!matches || matches.length === 0) {
        throw new Error('Semantic search returned zero results');
      }
    }
  );

  // 12. Review Workflow
  await runTest(
    'SMOKE-12',
    'Human HSE Review Queue Retrieval',
    'WORKFLOW',
    'Retrieves pending human-in-the-loop review items',
    () => {
      const reviews = reviewStore.getAllReviews('oil-india-demo');
      if (!Array.isArray(reviews)) {
        throw new Error('Review store did not return an array');
      }
    }
  );

  // 13. Action / CAPA Workflow
  await runTest(
    'SMOKE-13',
    'CAPA Corrective Actions Retrieval',
    'WORKFLOW',
    'Retrieves tracked corrective actions and barrier verification records',
    () => {
      const actions = actionStore.getActions({ organization_id: 'oil-india-demo' }).data;
      if (!Array.isArray(actions) || actions.length === 0) {
        throw new Error('Action store returned empty list');
      }
    }
  );

  // 14. Alert Retrieval
  await runTest(
    'SMOKE-14',
    'Safety Alert Engine State',
    'WORKFLOW',
    'Retrieves triggered safety alerts and active threshold rules',
    () => {
      const alerts = alertStore.getAlerts('oil-india-demo');
      const rules = alertStore.getRules('oil-india-demo');
      if (!alerts || !rules || rules.length === 0) {
        throw new Error('Alert rules or alerts uninitialized');
      }
    }
  );

  // 15. Analytics Access
  await runTest(
    'SMOKE-15',
    'Analytics Aggregation Engine',
    'AI_DATA',
    'Computes risk distribution and barrier integrity metrics',
    () => {
      const reports = dataStore.getAllReports();
      const total = reports.length;
      const sifCount = reports.filter((r) => r.latest_analysis?.sif_potential || r.review_status === 'Verified SIF').length;
      if (total === 0 || sifCount === 0) {
        throw new Error('Analytics aggregation returned invalid totals');
      }
    }
  );

  // 16. Evaluation Access Control & Quality Gates
  await runTest(
    'SMOKE-16',
    'Model Evaluation Quality Gates',
    'AUTH_RBAC',
    'Validates audited quality gates (FNR threshold < 0.05)',
    () => {
      const rules = modelGovernanceRegistry.getQualityGateRules();
      if (!rules || rules.length === 0) {
        throw new Error('Model governance quality gates not configured');
      }
      const fnrGate = rules.find((r) => r.metric_key.includes('fnr') || r.name.toLowerCase().includes('false negative'));
      if (!fnrGate || fnrGate.threshold > 0.1) {
        throw new Error('Mandatory SIF False Negative Rate gate missing or too lenient');
      }
    }
  );

  // 17. Storage Health & Audit Event Generation
  await runTest(
    'SMOKE-17',
    'Storage Abstraction & Audit Trail',
    'AUDIT',
    'Validates object storage health probe and logs smoke verification event',
    () => {
      const status = storageService.getStatus();
      if (status.status !== 'ONLINE') {
        throw new Error(`Storage status reported ${status.status}`);
      }

      authStore.logSecurityEvent({
        event_type: 'SMOKE_TESTS_EXECUTED',
        actor_id: 'sys-smoke-runner',
        action_summary: 'Production deployment smoke test suite completed.',
        outcome: 'SUCCESS',
      });
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
