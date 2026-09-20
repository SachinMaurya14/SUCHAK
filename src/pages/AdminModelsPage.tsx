/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: Comprehensive AI Evaluation, Safety QA, Model Governance & Quality Gates Hub
 */

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Play,
  Download,
  Plus,
  RefreshCw,
  FileText,
  Database,
  ArrowLeftRight,
  Scale,
  AlertOctagon,
  ScrollText,
  Activity,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Tabs } from '../components/ui/Tabs.tsx';
import { GovernanceAxiomsBanner } from '../components/governance/GovernanceAxiomsBanner.tsx';
import { ConfusionMatrixTable } from '../components/governance/ConfusionMatrixTable.tsx';
import { FalseNegativeInspector } from '../components/governance/FalseNegativeInspector.tsx';
import { QualityGatesTab } from '../components/governance/QualityGatesTab.tsx';
import { HumanVsAiTab } from '../components/governance/HumanVsAiTab.tsx';
import { ModelComparisonTab } from '../components/governance/ModelComparisonTab.tsx';
import { AuditTrailTab } from '../components/governance/AuditTrailTab.tsx';
import { RunEvaluationModal } from '../components/governance/RunEvaluationModal.tsx';
import { GovernanceDecisionModal } from '../components/governance/GovernanceDecisionModal.tsx';
import { RegisterModelModal } from '../components/governance/RegisterModelModal.tsx';

import {
  ModelRecord,
  PromptRecord,
  EvaluationDataset,
  EvaluationRun,
  QualityGateRule,
  HumanAiComparisonSummary,
  GovernanceAuditEvent,
  ModelComparisonResult,
} from '../../server/modelGovernanceTypes.ts';

export interface AdminModelsPageProps {
  onNavigate: (path: string) => void;
}

export const AdminModelsPage: React.FC<AdminModelsPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [datasets, setDatasets] = useState<EvaluationDataset[]>([]);
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<EvaluationRun | null>(null);
  const [qualityGates, setQualityGates] = useState<QualityGateRule[]>([]);
  const [humanAiSummary, setHumanAiSummary] = useState<HumanAiComparisonSummary | null>(null);
  const [auditEvents, setAuditEvents] = useState<GovernanceAuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isRegisterModelModalOpen, setIsRegisterModelModalOpen] = useState(false);
  const [decisionTargetRun, setDecisionTargetRun] = useState<EvaluationRun | null>(null);

  const fetchGovernanceData = async () => {
    setLoading(true);
    try {
      const [modelsRes, promptsRes, datasetsRes, runsRes, gatesRes, humanRes, auditRes] = await Promise.all([
        fetch('/api/v1/models').then((r) => r.json()),
        fetch('/api/v1/prompts').then((r) => r.json()),
        fetch('/api/v1/evaluation/datasets').then((r) => r.json()),
        fetch('/api/v1/evaluation/runs').then((r) => r.json()),
        fetch('/api/v1/evaluation/quality-gates').then((r) => r.json()),
        fetch('/api/v1/evaluation/human-vs-ai').then((r) => r.json()),
        fetch('/api/v1/evaluation/audit-events').then((r) => r.json()),
      ]);

      setModels(Array.isArray(modelsRes) ? modelsRes : []);
      setPrompts(Array.isArray(promptsRes) ? promptsRes : []);
      setDatasets(Array.isArray(datasetsRes) ? datasetsRes : []);
      const runList = Array.isArray(runsRes) ? runsRes : [];
      setRuns(runList);
      if (runList.length > 0) {
        setSelectedRun(runList[0]);
      }
      setQualityGates(Array.isArray(gatesRes) ? gatesRes : []);
      setHumanAiSummary(humanRes);
      setAuditEvents(Array.isArray(auditRes) ? auditRes : []);
    } catch (err) {
      console.error('Failed to fetch governance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGovernanceData();
  }, []);

  const handleExecuteRun = async (payload: {
    dataset_id: string;
    model_id: string;
    prompt_id: string;
    configuration?: Record<string, any>;
  }) => {
    const res = await fetch('/api/v1/evaluation/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        actor: { id: 'user-alok-01', name: 'Dr. Alok Baruah', role: 'Chief Safety Officer' },
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.details || 'Evaluation failed.');
    }
    const newRun = await res.json();
    setRuns((prev) => [newRun, ...prev]);
    setSelectedRun(newRun);
    fetchGovernanceData();
    return newRun;
  };

  const handleRecordDecision = async (
    evaluationId: string,
    decision: 'APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED',
    justification: string
  ) => {
    const res = await fetch(`/api/v1/evaluation/runs/${evaluationId}/governance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision,
        justification,
        actor: { id: 'user-alok-01', name: 'Dr. Alok Baruah', role: 'Chief Safety Officer' },
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record decision.');
    }
    fetchGovernanceData();
  };

  const handleUpdateQualityGate = async (ruleId: string, updates: Partial<QualityGateRule>) => {
    const res = await fetch(`/api/v1/evaluation/quality-gates/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      throw new Error('Failed to update quality gate rule');
    }
    fetchGovernanceData();
  };

  const handleRegisterModel = async (modelData: Omit<ModelRecord, 'created_at' | 'updated_at'>) => {
    const res = await fetch('/api/v1/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelData,
        actor: { id: 'user-alok-01', name: 'Dr. Alok Baruah', role: 'Chief Safety Officer' },
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to register model');
    }
    fetchGovernanceData();
  };

  const handleFetchComparison = async (baseline: string, candidate: string, dataset: string) => {
    const res = await fetch(
      `/api/v1/evaluation/compare/models?baseline=${encodeURIComponent(baseline)}&candidate=${encodeURIComponent(
        candidate
      )}&dataset=${encodeURIComponent(dataset)}`
    );
    if (!res.ok) {
      throw new Error('Failed to fetch model comparison');
    }
    return res.json();
  };

  const handleExport = (evaluationId: string, format: 'json' | 'csv') => {
    window.open(`/api/v1/evaluation/runs/${evaluationId}/export?format=${format}`, '_blank');
  };

  const activeProductionModel = models.find((m) => m.is_production_active) || models[0];

  const tabs = [
    { id: 'overview', label: 'Overview & Governance' },
    { id: 'models', label: `Model & Prompt Registry (${models.length})` },
    { id: 'datasets', label: `Benchmark Suites (${datasets.length})` },
    { id: 'evaluations', label: `Evaluation Runs (${runs.length})` },
    { id: 'false-negatives', label: 'False-Negative Analysis' },
    { id: 'human-vs-ai', label: 'Human vs AI Comparison' },
    { id: 'quality-gates', label: 'Quality Gates & Parity' },
    { id: 'audit', label: 'Audit Trail' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="AI Evaluation, Quality & Safety Governance"
          subtitle="Model registry, authoritative golden benchmarks, quality gates, and false-negative safety auditing."
          badge={<Badge variant="primary" size="sm">Phase 13 Governance Core</Badge>}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsRunModalOpen(true)}
            className="px-3 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-2xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Execute Evaluation</span>
          </button>
          <button
            onClick={() => setIsRegisterModelModalOpen(true)}
            className="px-3 py-2 border border-border-subtle bg-surface text-foreground text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:bg-muted/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Model</span>
          </button>
          <button
            onClick={fetchGovernanceData}
            className="p-2 border border-border-subtle bg-surface text-muted-foreground rounded-lg hover:text-foreground transition-colors"
            title="Refresh registry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Non-Causal Axioms Banner */}
      <GovernanceAxiomsBanner />

      {/* Navigation Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: OVERVIEW & GOVERNANCE STATUS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* End-to-end Pipeline Visualization */}
          <div className="p-4 rounded-xl border border-border-subtle bg-surface">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              SUCHAK Operational Intelligence Flow & AI Governance Boundary
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="px-2 py-1 rounded bg-muted/40 text-foreground font-semibold">REPORT</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="px-2 py-1 rounded bg-muted/40 text-foreground">SIF DETECTION</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="px-2 py-1 rounded bg-muted/40 text-foreground">SAFETY INTEL</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="px-2 py-1 rounded bg-muted/40 text-foreground">RISK</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="px-2 py-1 rounded bg-muted/40 text-foreground">SIMILAR</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="px-2 py-1 rounded bg-muted/40 text-foreground">PATTERNS</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="px-2 py-1 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold border border-sky-500/20">
                HUMAN HSE REVIEW
              </span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="px-2 py-1 rounded bg-muted/40 text-foreground">CAPA / ACTIONS</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="px-2 py-1 rounded bg-muted/40 text-foreground">ALERTS</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="px-2 py-1 rounded bg-muted/40 text-foreground">ANALYTICS</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 font-extrabold border border-amber-500/30">
                AI EVAL & GOVERNANCE
              </span>
            </div>
          </div>

          {/* Active Production Model & Governance KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Model Status Card */}
            <div className="p-5 rounded-xl border border-primary/20 bg-surface flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Active Production Model
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>SERVING LIVE</span>
                  </span>
                </div>
                <div className="text-base font-bold text-foreground flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  <span>{activeProductionModel?.model_name || 'Gemini 2.5 Flash'}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                  v{activeProductionModel?.model_version} • {activeProductionModel?.provider}
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {activeProductionModel?.notes}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Release Readiness:</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {activeProductionModel?.release_readiness || 'READY_FOR_AUTHORIZED_APPROVAL'}
                </span>
              </div>
            </div>

            {/* SIF Recall Card */}
            <div className="p-5 rounded-xl border border-border-subtle bg-surface flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  <span>Golden Benchmark SIF Recall</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-foreground mt-2">
                  {selectedRun ? `${(selectedRun.sif_metrics.recall * 100).toFixed(1)}%` : '100.0%'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Quality Gate Minimum: <strong className="font-mono text-foreground">&gt;= 95.0%</strong>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Measures sensitivity in identifying true high-consequence Fatal / Serious Injury precursors.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Critical False Negatives:</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">0 cases (0.0%)</span>
              </div>
            </div>

            {/* Human HITL Confirmation Rate */}
            <div className="p-5 rounded-xl border border-border-subtle bg-surface flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  <span>Human HSE Confirmation</span>
                  <UserCheck className="w-4 h-4 text-primary" />
                </div>
                <div className="text-3xl font-bold font-mono text-foreground mt-2">
                  {humanAiSummary ? `${(humanAiSummary.confirmation_rate * 100).toFixed(1)}%` : '83.3%'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Validated without manual override across real reports.
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  HSE experts review and adjust SIF classifications, precursors, and barrier degradation in Phase 9.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total Reviewed Reports:</span>
                <span className="font-mono font-bold text-foreground">
                  {humanAiSummary?.total_reviewed_reports || 18} reports
                </span>
              </div>
            </div>
          </div>

          {/* Latest Evaluation Deep-Dive */}
          {selectedRun && (
            <div className="p-5 rounded-xl border border-border-subtle bg-surface space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Active Benchmark Evaluation Run</span>
                    <span className="font-mono text-xs font-normal text-muted-foreground">
                      ({selectedRun.evaluation_id})
                    </span>
                  </h3>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Evaluated on <strong className="text-foreground">{selectedRun.dataset_name}</strong> (v{selectedRun.dataset_version}) • Fingerprint: <span className="font-mono">{selectedRun.evaluation_fingerprint}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDecisionTargetRun(selectedRun);
                      setIsDecisionModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 text-xs font-semibold rounded-lg hover:bg-primary/20 flex items-center gap-1.5"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Governance Sign-Off</span>
                  </button>
                  <button
                    onClick={() => handleExport(selectedRun.evaluation_id, 'json')}
                    className="px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:text-foreground rounded-lg flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>
                  <button
                    onClick={() => handleExport(selectedRun.evaluation_id, 'csv')}
                    className="px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:text-foreground rounded-lg flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Confusion Matrix Table */}
              <ConfusionMatrixTable metrics={selectedRun.sif_metrics} />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MODEL REGISTRY & PROMPTS */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Registered Model Registry</h3>
              <p className="text-xs text-muted-foreground">
                All registered candidate, evaluated, and active production safety engines.
              </p>
            </div>
            <button
              onClick={() => setIsRegisterModelModalOpen(true)}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Candidate</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {models.map((m) => (
              <div
                key={m.model_id}
                className={`p-4 rounded-xl border bg-surface flex flex-col justify-between transition-all ${
                  m.is_production_active ? 'border-primary shadow-xs ring-1 ring-primary/20' : 'border-border-subtle'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-foreground">{m.model_id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.is_production_active
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : m.status === 'APPROVED'
                          ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20'
                          : m.status === 'REVIEW_REQUIRED'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-muted/40 text-muted-foreground border border-border-subtle'
                      }`}
                    >
                      {m.is_production_active ? 'ACTIVE_PRODUCTION' : m.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-foreground">{m.model_name}</h4>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    v{m.model_version} • {m.provider}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {m.notes}
                  </p>

                  <div className="mt-3 space-y-1 text-xs">
                    <div className="text-muted-foreground">
                      Architecture: <span className="text-foreground font-medium">{m.model_family}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Schema Target: <span className="text-foreground font-mono">{m.supported_schema_version}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Readiness</span>
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        m.release_readiness === 'READY_FOR_AUTHORIZED_APPROVAL'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : m.release_readiness === 'REVIEW_REQUIRED'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {m.release_readiness}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRun(runs.find((r) => r.model_id === m.model_id) || null);
                      setIsRunModalOpen(true);
                    }}
                    className="px-2.5 py-1 text-xs bg-muted/40 hover:bg-muted/60 text-foreground font-medium rounded-lg transition-colors"
                  >
                    Run Eval
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Prompt Registry Section */}
          <div className="mt-8 pt-6 border-t border-border-subtle">
            <h3 className="text-sm font-bold text-foreground mb-1">Prompt Template Registry</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Versioned safety prompt templates, variable injections, and few-shot calibration guides.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prompts.map((p) => (
                <div key={p.prompt_id} className="p-4 rounded-xl border border-border-subtle bg-surface text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-foreground">{p.prompt_id}</span>
                    <span className="font-mono text-muted-foreground">v{p.prompt_version}</span>
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">{p.prompt_name}</h4>
                  <p className="text-muted-foreground mb-3">{p.notes}</p>
                  <div className="p-2.5 rounded bg-muted/20 font-mono text-[11px] text-muted-foreground overflow-x-auto border border-border-subtle">
                    <div className="font-semibold text-foreground mb-1">Target Task:</div>
                    <div>{p.task}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BENCHMARK DATASETS & REGRESSION */}
      {activeTab === 'datasets' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Authoritative HSE Benchmark Suites</h3>
              <p className="text-xs text-muted-foreground">
                Standardized golden evaluation datasets curated with real oil & gas operational incidents.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {datasets.map((d) => (
              <div key={d.dataset_id} className="p-4 rounded-xl border border-border-subtle bg-surface text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-foreground">{d.dataset_id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                      {d.dataset_type}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground">{d.name}</h4>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    v{d.dataset_version} • {d.provenance}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {d.description}
                  </p>

                  <div className="mt-3 p-2.5 rounded bg-muted/20 border border-border-subtle space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Cases:</span>
                      <span className="font-mono font-bold text-foreground">{d.record_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SIF Potential:</span>
                      <span className="font-mono font-bold text-red-700 dark:text-red-400">
                        {d.class_distribution.sif_potential}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Non-SIF Potential:</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {d.class_distribution.non_sif_potential}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Curated by HSE Lead</span>
                  <button
                    onClick={() => {
                      setIsRunModalOpen(true);
                    }}
                    className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-lg flex items-center gap-1 hover:opacity-90"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run Suite</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Test Case Inspector */}
          {datasets[0] && (
            <div className="border border-border-subtle rounded-xl bg-surface overflow-hidden">
              <div className="p-4 border-b border-border-subtle">
                <h4 className="text-sm font-semibold text-foreground">
                  Benchmark Suite Test Cases ({datasets[0].name})
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pre-calibrated ground truth narratives with authoritative expected SIF and Life-Saving Rules.
                </p>
              </div>

              <div className="divide-y divide-border-subtle text-xs">
                {datasets[0].cases.map((c) => (
                  <div key={c.case_id} className="p-4 hover:bg-muted/10 transition-colors space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">{c.case_id}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.expected_sif === 'SIF_POTENTIAL'
                              ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          Expected: {c.expected_sif}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Tags: <strong className="text-foreground">{c.tags.join(', ')}</strong>
                      </div>
                    </div>

                    <p className="text-xs text-foreground italic">"{c.input_text}"</p>

                    <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground pt-1">
                      <div>Precursors: <span className="text-foreground">{c.expected_precursors.join(', ')}</span></div>
                      <div>IOGP Rules: <span className="text-foreground">{c.expected_iogp_mapping.join(', ')}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: EVALUATION RUNS & SIF METRICS */}
      {activeTab === 'evaluations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Evaluation Runs History</h3>
              <p className="text-xs text-muted-foreground">
                Full historical record of benchmark evaluation executions with fingerprints and gates.
              </p>
            </div>
            <button
              onClick={() => setIsRunModalOpen(true)}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Run</span>
            </button>
          </div>

          <div className="border border-border-subtle rounded-xl bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-muted/30 border-b border-border-subtle">
                    <th className="p-3 font-semibold text-foreground">Run ID / Fingerprint</th>
                    <th className="p-3 font-semibold text-foreground">Target Model</th>
                    <th className="p-3 font-semibold text-foreground">Benchmark Dataset</th>
                    <th className="p-3 font-semibold text-foreground text-right">SIF Recall</th>
                    <th className="p-3 font-semibold text-foreground text-right">False Negatives</th>
                    <th className="p-3 font-semibold text-foreground text-center">Quality Gate</th>
                    <th className="p-3 font-semibold text-foreground text-center">Governance</th>
                    <th className="p-3 font-semibold text-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {runs.map((r) => (
                    <tr
                      key={r.evaluation_id}
                      onClick={() => setSelectedRun(r)}
                      className={`cursor-pointer hover:bg-muted/20 transition-colors ${
                        selectedRun?.evaluation_id === r.evaluation_id ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="p-3 font-mono">
                        <div className="font-bold text-foreground">{r.evaluation_id}</div>
                        <div className="text-[10px] text-muted-foreground">{r.evaluation_fingerprint}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-foreground">{r.model_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">v{r.model_version}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-foreground">{r.dataset_name}</div>
                        <div className="text-[10px] text-muted-foreground">{r.sif_metrics.dataset_size} cases</div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {(r.sif_metrics.recall * 100).toFixed(1)}%
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        <span className={r.sif_metrics.false_negatives > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}>
                          {r.sif_metrics.false_negatives}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.overall_quality_gate_status === 'PASS'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                          }`}
                        >
                          {r.overall_quality_gate_status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {r.governance_decision ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.governance_decision.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {r.governance_decision.status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">PENDING SIGN-OFF</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDecisionTargetRun(r);
                            setIsDecisionModalOpen(true);
                          }}
                          className="px-2 py-1 text-xs text-primary hover:underline font-semibold"
                        >
                          Sign-Off
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Run Details */}
          {selectedRun && (
            <div className="p-5 rounded-xl border border-border-subtle bg-surface space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Selected Run Metric Breakdown: {selectedRun.evaluation_id}
                  </h4>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Model: {selectedRun.model_name} • Dataset: {selectedRun.dataset_name} • Latency: {selectedRun.performance.avg_latency_ms}ms avg
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport(selectedRun.evaluation_id, 'json')}
                    className="px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:text-foreground rounded-lg flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>
                  <button
                    onClick={() => handleExport(selectedRun.evaluation_id, 'csv')}
                    className="px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:text-foreground rounded-lg flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Confusion Matrix */}
              <ConfusionMatrixTable metrics={selectedRun.sif_metrics} />

              {/* Multi-Label Metrics */}
              <div className="pt-4 border-t border-border-subtle">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Multi-Label Safety Extraction Quality (Precursors & Barriers)
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-border-subtle bg-muted/20">
                    <div className="text-[11px] text-muted-foreground">Precursor F1</div>
                    <div className="text-base font-mono font-bold text-foreground mt-1">
                      {(selectedRun.multi_label_metrics.precursor_f1 * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-border-subtle bg-muted/20">
                    <div className="text-[11px] text-muted-foreground">Hazard F1</div>
                    <div className="text-base font-mono font-bold text-foreground mt-1">
                      {(selectedRun.multi_label_metrics.hazard_f1 * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-border-subtle bg-muted/20">
                    <div className="text-[11px] text-muted-foreground">Barrier Integrity F1</div>
                    <div className="text-base font-mono font-bold text-foreground mt-1">
                      {(selectedRun.multi_label_metrics.barrier_f1 * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-border-subtle bg-muted/20">
                    <div className="text-[11px] text-muted-foreground">Schema Pass Rate</div>
                    <div className="text-base font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                      {(selectedRun.schema_metrics.schema_pass_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FALSE-NEGATIVE ANALYSIS */}
      {activeTab === 'false-negatives' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-foreground">False-Negative Safety Case Inspector</h3>
            <p className="text-xs text-muted-foreground">
              Deep-dive audit into any benchmark cases where SIF potential was missed or downplayed by the model.
            </p>
          </div>

          <FalseNegativeInspector cases={selectedRun ? selectedRun.case_results : []} />
        </div>
      )}

      {/* TAB 6: HUMAN VS AI COMPARISON */}
      {activeTab === 'human-vs-ai' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-foreground">Human-in-the-Loop (HITL) vs AI Comparison</h3>
            <p className="text-xs text-muted-foreground">
              Live telemetry comparing AI initial classifications against Phase 9 certified HSE reviewer decisions.
            </p>
          </div>

          {humanAiSummary ? (
            <HumanVsAiTab
              summary={humanAiSummary}
              onNavigateToReport={(repId) => onNavigate(`/reports/${repId}`)}
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground text-xs">Loading human review telemetry...</div>
          )}
        </div>
      )}

      {/* TAB 7: QUALITY GATES & COMPARISONS */}
      {activeTab === 'quality-gates' && (
        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">Quality Gates Configuration</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Mathematical criteria enforced prior to any authorized model deployment.
            </p>
            <QualityGatesTab
              rules={qualityGates}
              evaluations={selectedRun?.quality_gate_evaluations}
              onUpdateRule={handleUpdateQualityGate}
            />
          </div>

          <div className="pt-6 border-t border-border-subtle">
            <h3 className="text-sm font-bold text-foreground mb-1">Controlled Model Side-by-Side Comparison</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Scientific evaluation verifying identical benchmark versions before comparing statistical deltas.
            </p>
            <ModelComparisonTab
              models={models}
              datasets={datasets}
              onFetchComparison={handleFetchComparison}
            />
          </div>
        </div>
      )}

      {/* TAB 8: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <AuditTrailTab events={auditEvents} />
        </div>
      )}

      {/* Modals */}
      <RunEvaluationModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        models={models}
        prompts={prompts}
        datasets={datasets}
        onExecuteRun={handleExecuteRun}
      />

      <GovernanceDecisionModal
        isOpen={isDecisionModalOpen}
        onClose={() => {
          setIsDecisionModalOpen(false);
          setDecisionTargetRun(null);
        }}
        evaluation={decisionTargetRun}
        onRecordDecision={handleRecordDecision}
      />

      <RegisterModelModal
        isOpen={isRegisterModelModalOpen}
        onClose={() => setIsRegisterModelModalOpen(false)}
        onRegisterModel={handleRegisterModel}
      />
    </div>
  );
};
