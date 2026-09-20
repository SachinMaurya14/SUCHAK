/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: False-Negative Analysis & Safety Hazard Inspector
 */

import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowRight, Eye, CheckCircle2 } from 'lucide-react';
import { CaseEvaluationResult } from '../../../server/modelGovernanceTypes.ts';

export interface FalseNegativeInspectorProps {
  cases: CaseEvaluationResult[];
  onInspectCase?: (c: CaseEvaluationResult) => void;
}

export const FalseNegativeInspector: React.FC<FalseNegativeInspectorProps> = ({ cases, onInspectCase }) => {
  const falseNegatives = cases.filter((c) => c.is_false_negative_sif);

  if (falseNegatives.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-foreground">Zero Critical False Negatives Detected</h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
          The evaluated model successfully detected 100% of actual SIF potential incidents in this benchmark suite without downgrading any life-critical hazards to non-SIF.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="font-bold text-red-700 dark:text-red-400">
            {falseNegatives.length} Critical Safety False Negative{falseNegatives.length > 1 ? 's' : ''} Identified
          </div>
          <p className="text-red-600/90 dark:text-red-300/90 mt-0.5 leading-relaxed">
            A False Negative in HSE operations means the model classified a genuine Fatal / Serious Injury precursor as non-SIF. 
            Under SUCHAK Quality Gate Rule <span className="font-mono font-bold">GATE-SIF-FN-0</span>, any run with false negatives is disqualified from production release.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {falseNegatives.map((c) => (
          <div
            key={c.case_id}
            className="p-4 rounded-xl border border-border-subtle bg-surface hover:border-red-500/40 transition-colors"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-foreground">{c.case_id}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                  Critical Safety Breach
                </span>
                <span className="text-[11px] text-muted-foreground">Latency: {c.latency_ms}ms</span>
              </div>
              {onInspectCase && (
                <button
                  onClick={() => onInspectCase(c)}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <span>Inspect Details</span>
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <p className="text-xs text-foreground font-medium mb-3 italic">
              "{c.input_summary}"
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/20 p-3 rounded-lg">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
                  Expected Ground Truth (Authoritative HSE)
                </span>
                <div className="font-mono font-bold text-foreground mb-1">
                  SIF: {c.expected.sif}
                </div>
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  <div>Precursors: {c.expected.precursors.join(', ') || 'None'}</div>
                  <div>Barriers: {c.expected.barriers.join(', ') || 'None'}</div>
                  <div>IOGP: {c.expected.iogp.join(', ') || 'None'}</div>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 block mb-1">
                  Model Prediction (Under-Scored)
                </span>
                <div className="font-mono font-bold text-red-700 dark:text-red-400 mb-1">
                  SIF: {c.predicted.sif} (Confidence: {((c.predicted.confidence || 0) * 100).toFixed(0)}%)
                </div>
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  <div>Precursors: {c.predicted.precursors.join(', ') || 'None extracted'}</div>
                  <div>Barriers: {c.predicted.barriers.join(', ') || 'None extracted'}</div>
                </div>
              </div>
            </div>

            {c.predicted.explanation && (
              <div className="mt-2.5 text-xs text-muted-foreground bg-muted/10 p-2.5 rounded border border-border-subtle">
                <span className="font-semibold text-foreground">Model Justification:</span> {c.predicted.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
