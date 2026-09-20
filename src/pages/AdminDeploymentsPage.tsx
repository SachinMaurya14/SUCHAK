/**
 * SUCHAK Cloud Deployment, Scalability & Enterprise Operations Control Center
 * Manages immutable container releases, database pool sizing, 22-area readiness matrix,
 * 17-vector deployment smoke tests, synthetic load testing, and non-destructive DR validation.
 */
import React, { useState, useEffect } from 'react';
import {
  Server,
  Cloud,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldCheck,
  Database,
  Cpu,
  Archive,
  RefreshCw,
  Terminal,
  Zap,
  HardDrive,
  Send,
  ExternalLink,
  ChevronRight,
  GitCommit,
  Clock,
  Gauge,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';

interface DeploymentData {
  current: {
    deployment_id: string;
    environment: 'staging' | 'production';
    application_version: string;
    image_version: string;
    commit_sha: string;
    migration_version: string;
    actor: { id: string; name: string; role: string };
    started_at: string;
    completed_at?: string;
    status: string;
    release_notes: string;
    active_replicas: number;
    health_checks_passed: boolean;
  };
  db_pool: {
    maxServerConnections: number;
    apiReplicasCount: number;
    poolPerApiReplica: number;
    workerReplicasCount: number;
    poolPerWorkerReplica: number;
    adminReserveConnections: number;
    totalAllocatedConnections: number;
    safeCapacityMarginPct: number;
    haStatus: string;
  };
  queue: {
    activeWorkersCount: number;
    maxConcurrency: number;
    queueDepth: number;
    totalEnqueued: number;
    totalCompleted: number;
    totalFailed: number;
    deadLetterQueueCount: number;
    uptimeSeconds: number;
  };
  storage: {
    provider: string;
    bucketName: string;
    status: string;
    totalObjects: number;
    totalSizeBytes: number;
    tenantPrefix: string;
  };
  ai_limiter: {
    activeConcurrentCalls: number;
    maxConcurrency: number;
    circuitState: string;
    consecutiveFailures: number;
    totalRequests: number;
    totalThrottled: number;
    totalFallbacks: number;
  };
}

interface ReadinessItem {
  area: string;
  category: 'COMPUTE' | 'PERSISTENCE' | 'SECURITY' | 'OBSERVABILITY' | 'OPERATIONS';
  status: 'READY' | 'PARTIALLY_READY' | 'NOT_READY' | 'NOT_CONFIGURED' | 'MANUAL_VERIFICATION_REQUIRED';
  evidence: string;
  manualActionRequired?: string;
}

interface SmokeTestResult {
  id: string;
  name: string;
  category: string;
  description: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

interface SmokeTestSummary {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  allPassed: boolean;
  results: SmokeTestResult[];
}

interface LoadTestMetrics {
  scenarioName: string;
  isSynthetic: true;
  label: 'LOAD TEST / SYNTHETIC';
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  durationMs: number;
  requestsPerSecond: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  memoryUsageMb: {
    beforeRss: number;
    afterRss: number;
    deltaRss: number;
  };
  timestamp: string;
}

interface DRReport {
  timestamp: string;
  rpoStatus: {
    classification: string;
    objective: string;
    measuredRpoMinutes?: number;
    evidence: string;
  };
  rtoStatus: {
    classification: string;
    objective: string;
    measuredRtoSeconds?: number;
    evidence: string;
  };
  allScenariosPassed: boolean;
  scenarios: Array<{
    scenarioId: string;
    name: string;
    description: string;
    detection: { mechanism: string; timeToDetectMs: number };
    containment: { actionTaken: string; timeToContainMs: number };
    recovery: { procedure: string; timeToRecoverMs: number };
    verification: { checkType: string; passed: boolean; evidence: string };
    overallStatus: string;
  }>;
}

export const AdminDeploymentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'MATRIX' | 'SMOKE' | 'LOAD' | 'DR' | 'QUEUE_STORAGE'
  >('OVERVIEW');

  const [deploymentData, setDeploymentData] = useState<DeploymentData | null>(null);
  const [readinessMatrix, setReadinessMatrix] = useState<ReadinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Testing States
  const [smokeSummary, setSmokeSummary] = useState<SmokeTestSummary | null>(null);
  const [runningSmoke, setRunningSmoke] = useState(false);

  const [loadResult, setLoadResult] = useState<LoadTestMetrics | null>(null);
  const [runningLoad, setRunningLoad] = useState(false);
  const [loadScenario, setLoadScenario] = useState<'COMPREHENSIVE_MIX' | 'DASHBOARD_QUERIES' | 'SEMANTIC_SEARCH_STORM' | 'SAFETY_EVAL_PIPELINE'>('COMPREHENSIVE_MIX');
  const [loadIterations, setLoadIterations] = useState<number>(60);

  const [drReport, setDrReport] = useState<DRReport | null>(null);
  const [runningDr, setRunningDr] = useState(false);

  // Deployment Actions
  const [newVersion, setNewVersion] = useState('v1.5.1');
  const [deployNotes, setDeployNotes] = useState('Production forward-compatible indexing patch & queue tuning.');
  const [isDeploying, setIsDeploying] = useState(false);

  // Storage Test State
  const [testFileName, setTestFileName] = useState('rig04_high_pressure_hose_inspection.pdf');
  const [signedUrlResult, setSignedUrlResult] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [depRes, matrixRes] = await Promise.all([
        fetch('/api/v1/admin/deployments/current'),
        fetch('/api/v1/admin/deployments/readiness-matrix'),
      ]);

      if (!depRes.ok || !matrixRes.ok) {
        throw new Error('Failed to load deployment and readiness telemetry');
      }

      const depJson = await depRes.json();
      const matrixJson = await matrixRes.json();

      setDeploymentData(depJson);
      setReadinessMatrix(matrixJson);
    } catch (err: any) {
      setError(err.message || 'Error fetching deployment telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunSmokeTests = async () => {
    setRunningSmoke(true);
    try {
      const res = await fetch('/api/v1/admin/deployments/smoke-tests', { method: 'POST' });
      const data = await res.json();
      setSmokeSummary(data);
    } catch (err: any) {
      alert(`Smoke tests failed: ${err.message}`);
    } finally {
      setRunningSmoke(false);
    }
  };

  const handleRunLoadTest = async () => {
    setRunningLoad(true);
    try {
      const res = await fetch('/api/v1/admin/deployments/load-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: loadScenario,
          iterations: loadIterations,
        }),
      });
      const data = await res.json();
      setLoadResult(data);
    } catch (err: any) {
      alert(`Load test failed: ${err.message}`);
    } finally {
      setRunningLoad(false);
    }
  };

  const handleRunDrTests = async () => {
    setRunningDr(true);
    try {
      const res = await fetch('/api/v1/admin/deployments/dr-test', { method: 'POST' });
      const data = await res.json();
      setDrReport(data);
    } catch (err: any) {
      alert(`DR validation suite failed: ${err.message}`);
    } finally {
      setRunningDr(false);
    }
  };

  const handleDeploy = async () => {
    if (!confirm(`Are you sure you want to deploy release ${newVersion} to production?`)) return;
    setIsDeploying(true);
    try {
      const res = await fetch('/api/v1/admin/deployments/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment: 'production',
          application_version: newVersion,
          commit_sha: 'd91a24e',
          migration_version: '20260920_003_pg_replication_sync',
          release_notes: deployNotes,
          active_replicas: 3,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Deployment failed');
      }
      await fetchData();
      alert(`Deployment of ${newVersion} initiated successfully!`);
    } catch (err: any) {
      alert(`Deployment failed: ${err.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRollback = async () => {
    if (!deploymentData?.current.deployment_id) return;
    if (
      !confirm(
        `EMERGENCY ROLLBACK: Do you want to roll back the active release to prior known-good deployment?`
      )
    )
      return;
    setIsDeploying(true);
    try {
      const res = await fetch('/api/v1/admin/deployments/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_deployment_id: 'DEP-2026-0919-001',
        }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Rollback failed');
      }
      await fetchData();
      alert('Rollback executed successfully!');
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleGenerateSignedUrl = async () => {
    try {
      const res = await fetch('/api/v1/admin/storage/signed-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_type: 'report_attachment',
          resource_id: 'REP-DHK-001',
          file_name: testFileName,
          content_type: 'application/pdf',
          size_bytes: 1420500,
        }),
      });
      const data = await res.json();
      setSignedUrlResult(data);
    } catch (err: any) {
      alert(`Could not generate signed URL: ${err.message}`);
    }
  };

  const getStatusBadge = (status: ReadinessItem['status']) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> READY
          </span>
        );
      case 'PARTIALLY_READY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3" /> PARTIALLY READY
          </span>
        );
      case 'MANUAL_VERIFICATION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
            <Info className="w-3 h-3" /> MANUAL ACTION REQUIRED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
            <XCircle className="w-3 h-3" /> NOT READY
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Cloud Deployment & Scalability Center
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Enterprise multi-replica architecture, connection pool ceilings, 22-area readiness matrix,
            and disaster recovery controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={handleRollback}
            disabled={isDeploying}
            className="gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Emergency Rollback
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'OVERVIEW'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5 inline mr-1.5" />
          Architecture & Releases
        </button>

        <button
          onClick={() => setActiveTab('MATRIX')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'MATRIX'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 inline mr-1.5" />
          Readiness Matrix (22 Areas)
        </button>

        <button
          onClick={() => setActiveTab('SMOKE')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'SMOKE'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Zap className="w-3.5 h-3.5 inline mr-1.5" />
          Smoke Tests (17 Vectors)
        </button>

        <button
          onClick={() => setActiveTab('LOAD')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'LOAD'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Gauge className="w-3.5 h-3.5 inline mr-1.5" />
          Synthetic Load Testing
        </button>

        <button
          onClick={() => setActiveTab('DR')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'DR'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Activity className="w-3.5 h-3.5 inline mr-1.5" />
          Disaster Recovery & Chaos
        </button>

        <button
          onClick={() => setActiveTab('QUEUE_STORAGE')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'QUEUE_STORAGE'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5 inline mr-1.5" />
          Queue & Object Storage
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: ARCHITECTURE & RELEASES */}
      {activeTab === 'OVERVIEW' && deploymentData && (
        <div className="space-y-6">
          {/* Target Enterprise Topology Banner */}
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">Target Production Architecture</h3>
                </div>
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Active Topology
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
                <pre>{`USERS ────────► DNS / HTTPS / EDGE ────────► LOAD BALANCER / WAF
                                                        │
                      ┌─────────────────────────────────┴─────────────────────────────────┐
                      ▼                                                                   ▼
               FRONTEND / CDN                                                        API REPLICAS (3x)
                                                                                          │
                                             ┌────────────────────────────────────────────┼────────────────────────────────────────────┐
                                             ▼                                            ▼                                            ▼
                                     PostgreSQL (managed)                           Queue / Redis                                Vector / Search
                                     [Max 75/100 Conn Pool]                               │                                      [Snapshot Persisted]
                                                                                          ▼
                                                                                 Background Workers (2x)
                                                                                          │
                                                                       ┌──────────────────┴──────────────────┐
                                                                       ▼                                     ▼
                                                                Object Storage (GCS/S3)               External AI API
                                                                [Tenant Path Isolated]                [Circuit Breaker / Semaphore]`}</pre>
              </div>
            </CardContent>
          </Card>

          {/* Current Active Release & Connection Pool Math */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Release Card */}
            <Card className="border-border/80">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-semibold text-sm text-foreground">Active Release Metadata</h3>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    {deploymentData.current.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-md bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block">Deployment ID</span>
                    <span className="font-mono font-semibold text-foreground text-xs mt-0.5 block">
                      {deploymentData.current.deployment_id}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-md bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block">Application Version</span>
                    <span className="font-semibold text-foreground text-xs mt-0.5 block">
                      {deploymentData.current.application_version}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-md bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block">Container Image Tag</span>
                    <span className="font-mono text-foreground text-[11px] truncate block mt-0.5">
                      {deploymentData.current.image_version}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-md bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block">Commit SHA</span>
                    <span className="font-mono text-foreground text-xs mt-0.5 flex items-center gap-1">
                      <GitCommit className="w-3 h-3 text-primary" />
                      {deploymentData.current.commit_sha}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-md bg-muted/40 border border-border/60 text-xs">
                  <span className="text-muted-foreground block">Active Migration Version</span>
                  <span className="font-mono text-foreground block mt-0.5">
                    {deploymentData.current.migration_version}
                  </span>
                </div>

                <div className="p-2.5 rounded-md bg-muted/40 border border-border/60 text-xs">
                  <span className="text-muted-foreground block">Release Notes</span>
                  <p className="text-foreground mt-0.5">{deploymentData.current.release_notes}</p>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Deployed By: {deploymentData.current.actor.name} ({deploymentData.current.actor.role})</span>
                  <span>{new Date(deploymentData.current.started_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Database Connection Pool Math Card */}
            <Card className="border-border/80">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-500" />
                    <h3 className="font-semibold text-sm text-foreground">Database Connection Pool Math</h3>
                  </div>
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                    Margin: {deploymentData.db_pool.safeCapacityMarginPct}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-2 text-xs">
                <p className="text-muted-foreground">
                  Rigorous calculation preventing connection pool exhaustion under horizontal replica spikes:
                </p>

                <div className="space-y-2 font-mono">
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span>API Replicas Pool ({deploymentData.db_pool.apiReplicasCount} × {deploymentData.db_pool.poolPerApiReplica})</span>
                    <span className="font-bold text-foreground">
                      {deploymentData.db_pool.apiReplicasCount * deploymentData.db_pool.poolPerApiReplica} conns
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span>Worker Replicas Pool ({deploymentData.db_pool.workerReplicasCount} × {deploymentData.db_pool.poolPerWorkerReplica})</span>
                    <span className="font-bold text-foreground">
                      {deploymentData.db_pool.workerReplicasCount * deploymentData.db_pool.poolPerWorkerReplica} conns
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span>Admin / Migration Reserve Pool</span>
                    <span className="font-bold text-foreground">{deploymentData.db_pool.adminReserveConnections} conns</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-bold">
                    <span>Total Allocated Connections</span>
                    <span>{deploymentData.db_pool.totalAllocatedConnections} of {deploymentData.db_pool.maxServerConnections} max</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 text-[11px] leading-relaxed">
                  <strong>Ceiling Rule Enforced:</strong> 75 total connections allocated against 100 server max,
                  reserving a strict 25% safety buffer for automated failover, replication proxies, and pgBouncer bursts.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rollout New Release Form */}
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Controlled Release Promotion Gate</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Target Version Tag</label>
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Release Notes / Migration Scope</label>
                  <input
                    type="text"
                    value={deployNotes}
                    onChange={(e) => setDeployNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Requires OrgAdmin role. Automatically triggers 17-vector pre-flight smoke tests.</span>
                </div>

                <Button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  size="sm"
                  className="gap-1.5"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  {isDeploying ? 'Deploying...' : 'Promote & Rollout'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: 22-AREA READINESS MATRIX */}
      {activeTab === 'MATRIX' && (
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Enterprise Production Readiness Matrix</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Comprehensive audit across all 22 required deployment disciplines.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {readinessMatrix.filter((m) => m.status === 'READY').length} Ready
                </span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {readinessMatrix.filter((m) => m.status === 'MANUAL_VERIFICATION_REQUIRED').length} Manual Checks
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {readinessMatrix.map((item, idx) => (
                <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{item.area}</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        {item.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.evidence}</p>
                    {item.manualActionRequired && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        Action: {item.manualActionRequired}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">{getStatusBadge(item.status)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: 17-VECTOR SMOKE TESTS */}
      {activeTab === 'SMOKE' && (
        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Post-Deployment Smoke Test Suite</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    17 live verification vectors covering reachability, authentication, RBAC, tenant isolation,
                    workflows, and fallback paths.
                  </p>
                </div>

                <Button
                  onClick={handleRunSmokeTests}
                  disabled={runningSmoke}
                  size="sm"
                  className="gap-1.5"
                >
                  <Play className={`w-3.5 h-3.5 ${runningSmoke ? 'animate-spin' : ''}`} />
                  {runningSmoke ? 'Executing Verification...' : 'Run All 17 Smoke Tests'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {smokeSummary ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {smokeSummary.allPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                      <span className="font-bold text-foreground">
                        {smokeSummary.passed} of {smokeSummary.total} vectors passed
                      </span>
                    </div>
                    <span className="text-muted-foreground">Executed: {new Date(smokeSummary.timestamp).toLocaleTimeString()}</span>
                  </div>

                  <div className="divide-y divide-border/60 border border-border/60 rounded-lg overflow-hidden">
                    {smokeSummary.results.map((r) => (
                      <div key={r.id} className="p-3 flex items-center justify-between gap-3 text-xs bg-card hover:bg-muted/20">
                        <div className="flex items-center gap-2 flex-1">
                          {r.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <div>
                            <span className="font-semibold text-foreground mr-2">{r.name}</span>
                            <span className="text-muted-foreground text-[11px]">{r.description}</span>
                            {r.error && <p className="text-rose-600 text-xs font-semibold mt-0.5">Error: {r.error}</p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className="text-[10px] py-0">
                            {r.category}
                          </Badge>
                          <span className="font-mono text-muted-foreground text-[11px]">{r.durationMs}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  Click "Run All 17 Smoke Tests" to execute live post-deployment validation vectors.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: SYNTHETIC LOAD TESTING */}
      {activeTab === 'LOAD' && (
        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Controlled Synthetic Load Testing</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Measures true requests per second, p50/p95/p99 latency percentiles, and memory deltas using synthetic industrial safety telemetry.
                  </p>
                </div>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  LOAD TEST / SYNTHETIC
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Benchmark Scenario</label>
                  <select
                    value={loadScenario}
                    onChange={(e: any) => setLoadScenario(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground"
                  >
                    <option value="COMPREHENSIVE_MIX">Comprehensive Workload Mix</option>
                    <option value="DASHBOARD_QUERIES">Dashboard Analytics Aggregation</option>
                    <option value="SEMANTIC_SEARCH_STORM">Semantic Vector Search Storm</option>
                    <option value="SAFETY_EVAL_PIPELINE">AI / Fallback Safety Evaluation</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Iterations: {loadIterations} requests
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="150"
                    step="10"
                    value={loadIterations}
                    onChange={(e) => setLoadIterations(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer mt-2"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleRunLoadTest}
                    disabled={runningLoad}
                    className="w-full gap-1.5"
                    size="sm"
                  >
                    <Gauge className={`w-3.5 h-3.5 ${runningLoad ? 'animate-spin' : ''}`} />
                    {runningLoad ? 'Executing Load Test...' : 'Execute Benchmark'}
                  </Button>
                </div>
              </div>

              {loadResult && (
                <div className="pt-4 border-t border-border/80 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                      <span className="text-muted-foreground block">Throughput (RPS)</span>
                      <span className="text-xl font-bold text-foreground mt-1 block">
                        {loadResult.requestsPerSecond} <span className="text-xs font-normal">req/s</span>
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                      <span className="text-muted-foreground block">Latency p50 (Median)</span>
                      <span className="text-xl font-bold text-foreground mt-1 block">
                        {loadResult.latencyP50Ms} <span className="text-xs font-normal">ms</span>
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                      <span className="text-muted-foreground block">Latency p95</span>
                      <span className="text-xl font-bold text-foreground mt-1 block">
                        {loadResult.latencyP95Ms} <span className="text-xs font-normal">ms</span>
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                      <span className="text-muted-foreground block">Latency p99</span>
                      <span className="text-xl font-bold text-foreground mt-1 block">
                        {loadResult.latencyP99Ms} <span className="text-xs font-normal">ms</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Total: {loadResult.totalRequests} | Successful: {loadResult.successfulRequests} | Failed: {loadResult.failedRequests}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      RSS Memory Delta: {loadResult.memoryUsageMb.deltaRss >= 0 ? '+' : ''}
                      {loadResult.memoryUsageMb.deltaRss} MB (Current: {loadResult.memoryUsageMb.afterRss} MB)
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: DISASTER RECOVERY & CHAOS */}
      {activeTab === 'DR' && (
        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Non-Destructive Disaster Recovery Validation</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Validates 6 critical resilience scenarios: API replica crash, worker task failure, AI outage,
                    vector degradation, storage outage, and emergency rollback.
                  </p>
                </div>

                <Button
                  onClick={handleRunDrTests}
                  disabled={runningDr}
                  size="sm"
                  className="gap-1.5"
                >
                  <Activity className={`w-3.5 h-3.5 ${runningDr ? 'animate-spin' : ''}`} />
                  {runningDr ? 'Testing Chaos Vectors...' : 'Execute Non-Destructive DR Suite'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {drReport ? (
                <div className="space-y-4">
                  {/* RTO / RPO Reality Classification */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-foreground">Recovery Point Objective (RPO)</span>
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">
                          {drReport.rpoStatus.classification}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px]">{drReport.rpoStatus.objective}</p>
                      <p className="text-foreground mt-1 text-[11px] font-medium">{drReport.rpoStatus.evidence}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-foreground">Recovery Time Objective (RTO)</span>
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700">
                          {drReport.rtoStatus.classification}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px]">{drReport.rtoStatus.objective}</p>
                      <p className="text-foreground mt-1 text-[11px] font-medium">
                        Measured Rollback/Restart: {drReport.rtoStatus.measuredRtoSeconds} seconds
                      </p>
                    </div>
                  </div>

                  {/* Scenario Breakdown */}
                  <div className="space-y-3">
                    {drReport.scenarios.map((sc) => (
                      <div
                        key={sc.scenarioId}
                        className="p-3.5 rounded-lg border border-border/70 bg-card text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{sc.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {sc.overallStatus}
                          </span>
                        </div>

                        <p className="text-muted-foreground">{sc.description}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                          <div className="p-2 rounded bg-muted/40">
                            <span className="text-muted-foreground block text-[10px]">DETECTION ({sc.detection.timeToDetectMs}ms)</span>
                            <span className="text-foreground">{sc.detection.mechanism}</span>
                          </div>

                          <div className="p-2 rounded bg-muted/40">
                            <span className="text-muted-foreground block text-[10px]">CONTAINMENT ({sc.containment.timeToContainMs}ms)</span>
                            <span className="text-foreground">{sc.containment.actionTaken}</span>
                          </div>

                          <div className="p-2 rounded bg-muted/40">
                            <span className="text-muted-foreground block text-[10px]">RECOVERY ({sc.recovery.timeToRecoverMs}ms)</span>
                            <span className="text-foreground">{sc.recovery.procedure}</span>
                          </div>
                        </div>

                        <div className="p-2 rounded bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-[11px]">
                          <strong>Verification:</strong> {sc.verification.evidence}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  Click "Execute Non-Destructive DR Suite" to validate high-availability failover and rollback paths.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 6: QUEUE & OBJECT STORAGE */}
      {activeTab === 'QUEUE_STORAGE' && deploymentData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Background Worker Queue Telemetry */}
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-500" />
                  <h3 className="font-semibold text-sm text-foreground">Background Queue & Workers</h3>
                </div>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  Workers: {deploymentData.queue.activeWorkersCount}/{deploymentData.queue.maxConcurrency}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded bg-muted/40">
                  <span className="text-muted-foreground block">Queue Depth</span>
                  <span className="text-base font-bold text-foreground mt-0.5 block">
                    {deploymentData.queue.queueDepth}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-muted/40">
                  <span className="text-muted-foreground block">Total Completed</span>
                  <span className="text-base font-bold text-emerald-600 mt-0.5 block">
                    {deploymentData.queue.totalCompleted}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-muted/40">
                  <span className="text-muted-foreground block">Dead-Letter Queue</span>
                  <span className="text-base font-bold text-rose-600 mt-0.5 block">
                    {deploymentData.queue.deadLetterQueueCount}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-muted/30 border border-border/60 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Concurrency Pool</span>
                  <span className="font-mono text-foreground font-semibold">3 Worker Threads</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retry Policy</span>
                  <span className="font-mono text-foreground">Exponential (max 3 retries)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Queue Runtime</span>
                  <span className="font-mono text-foreground">
                    {Math.floor(deploymentData.queue.uptimeSeconds / 60)} minutes
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[11px] text-muted-foreground">
                  Queued tasks are guaranteed idempotent through unique task deduplication hashes.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Object Storage Abstraction */}
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-sky-500" />
                  <h3 className="font-semibold text-sm text-foreground">Object Storage Abstraction</h3>
                </div>
                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                  {deploymentData.storage.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded bg-muted/40">
                  <span className="text-muted-foreground block">Active Provider</span>
                  <span className="font-mono font-semibold text-foreground text-xs mt-0.5 block">
                    {deploymentData.storage.provider}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-muted/40">
                  <span className="text-muted-foreground block">Target Bucket</span>
                  <span className="font-mono font-semibold text-foreground text-xs mt-0.5 block">
                    {deploymentData.storage.bucketName}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-muted/30 border border-border/60 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenant Scoping Prefix</span>
                  <span className="font-mono text-foreground font-semibold">
                    {deploymentData.storage.tenantPrefix}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Indexed Objects</span>
                  <span className="font-mono text-foreground font-semibold">
                    {deploymentData.storage.totalObjects}
                  </span>
                </div>
              </div>

              {/* Signed Upload URL Tester */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <span className="font-semibold text-foreground block">Generate Signed Upload URL Test</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testFileName}
                    onChange={(e) => setTestFileName(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs rounded border border-input bg-background"
                  />
                  <Button size="sm" variant="outline" onClick={handleGenerateSignedUrl} className="text-xs">
                    Generate
                  </Button>
                </div>

                {signedUrlResult && (
                  <div className="p-2 rounded bg-muted/50 font-mono text-[11px] text-foreground break-all space-y-1">
                    <div>
                      <strong>Object Key:</strong> {signedUrlResult.objectKey}
                    </div>
                    <div>
                      <strong>Expires:</strong> {signedUrlResult.expiresAt}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
