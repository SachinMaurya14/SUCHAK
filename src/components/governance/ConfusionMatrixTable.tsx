/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: 3x3 SIF Confusion Matrix Table Component
 */

import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Info } from 'lucide-react';
import { ConfusionMatrix, SifMetrics } from '../../../server/modelGovernanceTypes.ts';

export interface ConfusionMatrixTableProps {
  metrics: SifMetrics;
  onSelectCell?: (filter: { actual: string; predicted: string }) => void;
}

export const ConfusionMatrixTable: React.FC<ConfusionMatrixTableProps> = ({ metrics, onSelectCell }) => {
  const cm = metrics.confusion_matrix;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>SIF Potential 3x3 Confusion Matrix</span>
            <span className="text-[11px] font-normal text-muted-foreground">({metrics.dataset_size} benchmark cases)</span>
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Empirical ground truth vs model prediction. Critical focus on <span className="font-semibold text-red-700">Actual SIF → Predicted Non-SIF</span> (False Negatives).
          </p>
        </div>
        {metrics.false_negatives === 0 ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>0 False Negatives (Critical Safety Gate Passed)</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{metrics.false_negatives} Critical False Negatives Detected!</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto border border-border-subtle rounded-xl bg-surface">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b border-border-subtle">
              <th className="p-3 text-left font-semibold text-foreground w-36">
                Actual \ Predicted
              </th>
              <th className="p-3 font-semibold text-foreground">
                Pred: SIF Potential
              </th>
              <th className="p-3 font-semibold text-foreground">
                Pred: Non-SIF Potential
              </th>
              <th className="p-3 font-semibold text-foreground">
                Pred: Needs Review
              </th>
              <th className="p-3 font-semibold text-muted-foreground w-20">
                Total Actual
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {/* Row 1: Actual SIF */}
            <tr>
              <td className="p-3 text-left font-bold text-foreground bg-muted/20">
                Actual: SIF Potential
              </td>
              {/* TP */}
              <td
                onClick={() => onSelectCell?.({ actual: 'SIF_POTENTIAL', predicted: 'SIF_POTENTIAL' })}
                className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                <div className="text-base">{cm.actual_sif_pred_sif}</div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-sans font-medium">
                  True Positive (TP)
                </div>
              </td>
              {/* CRITICAL FN */}
              <td
                onClick={() => onSelectCell?.({ actual: 'SIF_POTENTIAL', predicted: 'NON_SIF_POTENTIAL' })}
                className={`p-3 font-mono font-bold transition-colors cursor-pointer ${
                  cm.actual_sif_pred_non_sif > 0
                    ? 'bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/30'
                    : 'bg-surface text-muted-foreground'
                }`}
              >
                <div className="text-base flex items-center justify-center gap-1">
                  {cm.actual_sif_pred_non_sif > 0 && <ShieldAlert className="w-3.5 h-3.5 text-red-700" />}
                  <span>{cm.actual_sif_pred_non_sif}</span>
                </div>
                <div className="text-[10px] text-red-700 dark:text-red-400 font-sans font-semibold">
                  Critical False Neg (FN)
                </div>
              </td>
              {/* Actual SIF -> Review */}
              <td
                onClick={() => onSelectCell?.({ actual: 'SIF_POTENTIAL', predicted: 'NEEDS_REVIEW' })}
                className="p-3 font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                <div className="text-base font-bold">{cm.actual_sif_pred_review}</div>
                <div className="text-[10px] text-amber-700 dark:text-amber-400 font-sans">Escalated to Review</div>
              </td>
              <td className="p-3 font-mono font-semibold text-muted-foreground bg-muted/10">
                {cm.actual_sif_pred_sif + cm.actual_sif_pred_non_sif + cm.actual_sif_pred_review}
              </td>
            </tr>

            {/* Row 2: Actual Non-SIF */}
            <tr>
              <td className="p-3 text-left font-bold text-foreground bg-muted/20">
                Actual: Non-SIF Potential
              </td>
              {/* FP */}
              <td
                onClick={() => onSelectCell?.({ actual: 'NON_SIF_POTENTIAL', predicted: 'SIF_POTENTIAL' })}
                className="p-3 font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                <div className="text-base font-bold">{cm.actual_non_sif_pred_sif}</div>
                <div className="text-[10px] text-amber-700 dark:text-amber-400 font-sans">False Positive (FP)</div>
              </td>
              {/* TN */}
              <td
                onClick={() => onSelectCell?.({ actual: 'NON_SIF_POTENTIAL', predicted: 'NON_SIF_POTENTIAL' })}
                className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                <div className="text-base">{cm.actual_non_sif_pred_non_sif}</div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-sans font-medium">
                  True Negative (TN)
                </div>
              </td>
              {/* Non-SIF -> Review */}
              <td
                onClick={() => onSelectCell?.({ actual: 'NON_SIF_POTENTIAL', predicted: 'NEEDS_REVIEW' })}
                className="p-3 font-mono text-muted-foreground hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="text-base font-bold">{cm.actual_non_sif_pred_review}</div>
                <div className="text-[10px] text-muted-foreground font-sans">Escalated to Review</div>
              </td>
              <td className="p-3 font-mono font-semibold text-muted-foreground bg-muted/10">
                {cm.actual_non_sif_pred_sif + cm.actual_non_sif_pred_non_sif + cm.actual_non_sif_pred_review}
              </td>
            </tr>

            {/* Row 3: Actual Review */}
            <tr>
              <td className="p-3 text-left font-bold text-foreground bg-muted/20">
                Actual: Uncertain / Review
              </td>
              <td
                onClick={() => onSelectCell?.({ actual: 'NEEDS_REVIEW', predicted: 'SIF_POTENTIAL' })}
                className="p-3 font-mono text-muted-foreground hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="text-base font-bold">{cm.actual_review_pred_sif}</div>
                <div className="text-[10px] text-muted-foreground font-sans">Classified SIF</div>
              </td>
              <td
                onClick={() => onSelectCell?.({ actual: 'NEEDS_REVIEW', predicted: 'NON_SIF_POTENTIAL' })}
                className="p-3 font-mono text-muted-foreground hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="text-base font-bold">{cm.actual_review_pred_non_sif}</div>
                <div className="text-[10px] text-muted-foreground font-sans">Classified Non-SIF</div>
              </td>
              <td
                onClick={() => onSelectCell?.({ actual: 'NEEDS_REVIEW', predicted: 'NEEDS_REVIEW' })}
                className="p-3 font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                <div className="text-base font-bold">{cm.actual_review_pred_review}</div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-sans">Preserved Review</div>
              </td>
              <td className="p-3 font-mono font-semibold text-muted-foreground bg-muted/10">
                {cm.actual_review_pred_sif + cm.actual_review_pred_non_sif + cm.actual_review_pred_review}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-2.5 rounded-lg border border-border-subtle bg-muted/20">
          <div className="text-[11px] text-muted-foreground">SIF Recall (Sensitivity)</div>
          <div className="text-lg font-bold font-mono text-foreground">
            {(metrics.recall * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">TP / (TP + FN)</div>
        </div>
        <div className="p-2.5 rounded-lg border border-border-subtle bg-muted/20">
          <div className="text-[11px] text-muted-foreground">SIF Precision</div>
          <div className="text-lg font-bold font-mono text-foreground">
            {(metrics.precision * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">TP / (TP + FP)</div>
        </div>
        <div className="p-2.5 rounded-lg border border-border-subtle bg-muted/20">
          <div className="text-[11px] text-muted-foreground">Harmonic F1 Score</div>
          <div className="text-lg font-bold font-mono text-foreground">
            {(metrics.f1 * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">2 • (P • R) / (P + R)</div>
        </div>
        <div className="p-2.5 rounded-lg border border-border-subtle bg-muted/20">
          <div className="text-[11px] text-muted-foreground">Critical False Neg Rate</div>
          <div className={`text-lg font-bold font-mono ${metrics.false_negative_rate > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {(metrics.false_negative_rate * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Must be 0.0% for Approval</div>
        </div>
      </div>
    </div>
  );
};
