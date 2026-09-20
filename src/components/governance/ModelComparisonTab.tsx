/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: Controlled Model Comparison Component
 */

import React, { useState } from 'react';
import { ArrowLeftRight, CheckCircle2, AlertTriangle, Scale, ShieldAlert, Cpu } from 'lucide-react';
import {
  ModelRecord,
  EvaluationDataset,
  ModelComparisonResult,
} from '../../../server/modelGovernanceTypes.ts';

export interface ModelComparisonTabProps {
  models: ModelRecord[];
  datasets: EvaluationDataset[];
  onFetchComparison: (baseline: string, candidate: string, dataset: string) => Promise<ModelComparisonResult>;
}

export const ModelComparisonTab: React.FC<ModelComparisonTabProps> = ({
  models,
  datasets,
  onFetchComparison,
}) => {
  const [baselineId, setBaselineId] = useState<string>(models[0]?.model_id || '');
  const [candidateId, setCandidateId] = useState<string>(models[1]?.model_id || models[0]?.model_id || '');
  const [datasetId, setDatasetId] = useState<string>(datasets[0]?.dataset_id || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ModelComparisonResult | null>(null);

  const handleCompare = async () => {
    if (!baselineId || !candidateId || !datasetId) return;
    setLoading(true);
    try {
      const res = await onFetchComparison(baselineId, candidateId, datasetId);
      setResult(res);
    } catch (err) {
      console.error('Failed to compare models:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector Bar */}
      <div className="p-4 rounded-xl border border-border-subtle bg-surface grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Baseline Model (Reference)</label>
          <select
            value={baselineId}
            onChange={(e) => setBaselineId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            {models.map((m) => (
              <option key={m.model_id} value={m.model_id}>
                {m.model_name} ({m.model_version})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Candidate Model (Under Test)</label>
          <select
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            {models.map((m) => (
              <option key={m.model_id} value={m.model_id}>
                {m.model_name} ({m.model_version})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Shared Benchmark Dataset</label>
          <select
            value={datasetId}
            onChange={(e) => setDatasetId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            {datasets.map((d) => (
              <option key={d.dataset_id} value={d.dataset_id}>
                {d.name} (v{d.dataset_version} • {d.record_count} cases)
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            disabled={loading || baselineId === candidateId}
            onClick={handleCompare}
            className="w-full px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>{loading ? 'Evaluating...' : 'Run Side-by-Side'}</span>
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Validation Banner */}
          {result.validation.is_valid ? (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Controlled Comparison Validated:
                </span>
                <span className="text-muted-foreground">
                  Identical benchmark version ({result.validation.shared_dataset_version}) and sample count ({result.validation.shared_case_count} cases).
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                SCIENTIFIC_PARITY_PASSED
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-700 dark:text-red-400">
                  Controlled Comparison Invalidated
                </div>
                <div className="text-red-600/90 dark:text-red-300/90 mt-0.5">
                  {result.validation.reasons.join(' ')}
                </div>
              </div>
            </div>
          )}

          {/* Metric Comparison Table */}
          {result.metric_diffs.length > 0 && (
            <div className="border border-border-subtle rounded-xl bg-surface overflow-hidden">
              <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Statistical Delta & Safety Parity</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Positive diff indicates candidate model improvement over baseline reference.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-muted/40 border border-border-subtle" />
                    <span className="text-muted-foreground">Baseline: {result.baseline_model.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-primary/20 border border-primary/30" />
                    <span className="font-semibold text-foreground">Candidate: {result.candidate_model.name}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border-subtle">
                      <th className="p-3 font-semibold text-foreground">Safety Metric</th>
                      <th className="p-3 font-semibold text-foreground text-right">Baseline Value</th>
                      <th className="p-3 font-semibold text-foreground text-right">Candidate Value</th>
                      <th className="p-3 font-semibold text-foreground text-right">Net Delta</th>
                      <th className="p-3 font-semibold text-foreground text-center">Safety Evaluation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle font-mono">
                    {result.metric_diffs.map((diff, idx) => (
                      <tr key={idx} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3 font-sans font-medium text-foreground">{diff.metric}</td>
                        <td className="p-3 text-right text-muted-foreground">
                          {(diff.baseline_value * 100).toFixed(1)}%
                        </td>
                        <td className="p-3 text-right font-bold text-foreground">
                          {(diff.candidate_value * 100).toFixed(1)}%
                        </td>
                        <td
                          className={`p-3 text-right font-bold ${
                            diff.diff > 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : diff.diff < 0
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {diff.diff > 0 ? `+${(diff.diff * 100).toFixed(1)}%` : `${(diff.diff * 100).toFixed(1)}%`}
                        </td>
                        <td className="p-3 text-center font-sans">
                          {diff.better ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              PARITY OR HIGHER
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                              REGRESSION DETECTED
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Cards */}
              <div className="p-4 bg-muted/20 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-surface border border-border-subtle">
                  <div className="text-muted-foreground text-[11px]">False Negative SIF Delta</div>
                  <div
                    className={`text-base font-mono font-bold mt-1 ${
                      result.false_negative_diff.diff > 0
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {result.false_negative_diff.candidate} vs {result.false_negative_diff.baseline} (
                    {result.false_negative_diff.diff > 0
                      ? `+${result.false_negative_diff.diff} more breaches`
                      : 'Zero increase'}
                    )
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface border border-border-subtle">
                  <div className="text-muted-foreground text-[11px]">Inference Latency Delta</div>
                  <div className="text-base font-mono font-bold text-foreground mt-1">
                    {result.avg_latency_diff_ms.candidate}ms vs {result.avg_latency_diff_ms.baseline}ms (
                    {result.avg_latency_diff_ms.diff > 0
                      ? `+${result.avg_latency_diff_ms.diff}ms slower`
                      : `${Math.abs(result.avg_latency_diff_ms.diff)}ms faster`}
                    )
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface border border-border-subtle">
                  <div className="text-muted-foreground text-[11px]">Quality Gate Status</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-bold text-foreground">
                      Cand: {result.quality_gate_comparison.candidate_gates}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      Base: {result.quality_gate_comparison.baseline_gates}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
