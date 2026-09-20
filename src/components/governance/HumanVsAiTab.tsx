/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: Human vs AI Safety Review Comparison Component
 */

import React from 'react';
import { Users, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Scale } from 'lucide-react';
import { HumanAiComparisonSummary } from '../../../server/modelGovernanceTypes.ts';

export interface HumanVsAiTabProps {
  summary: HumanAiComparisonSummary;
  onNavigateToReport?: (reportId: string) => void;
}

export const HumanVsAiTab: React.FC<HumanVsAiTabProps> = ({ summary, onNavigateToReport }) => {
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border-subtle bg-surface">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Reviewed Reports</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">
            {summary.total_reviewed_reports}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Phase 9 HITL reviews</div>
        </div>

        <div className="p-4 rounded-xl border border-border-subtle bg-surface">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Human Confirmation</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
            {(summary.confirmation_rate * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {summary.human_confirmed_count} validated as-is
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border-subtle bg-surface">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Human Overrides</span>
            <Scale className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-1">
            {(summary.correction_rate * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {summary.human_corrected_count} adjusted by reviewers
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border-subtle bg-surface">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>False-Negative SIF</span>
            <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-700 dark:text-red-400 mt-1">
            {summary.false_negative_sif_corrections}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Escalated by human to SIF</div>
        </div>
      </div>

      {/* Top Correction Categories */}
      <div className="p-5 rounded-xl border border-border-subtle bg-surface">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center justify-between">
          <span>Field Correction Taxonomy Distribution</span>
          <span className="text-xs font-normal text-muted-foreground">
            Categories modified during human safety sign-off
          </span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {summary.top_correction_categories.map((cat) => (
            <div key={cat.category} className="p-3 rounded-lg border border-border-subtle bg-muted/10">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{cat.category.replace(/_/g, ' ')}</span>
                <span className="font-mono font-bold text-primary">{cat.count}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 text-right">
                {cat.percentage}% of adjustments
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Reviews Table */}
      <div className="border border-border-subtle rounded-xl bg-surface overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Authoritative Human Review Overrides</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Case-by-case audit trail of HSE expert determinations superseding AI initial outputs.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border-subtle text-xs">
          {summary.recent_corrections.map((corr, idx) => (
            <div key={idx} className="p-4 hover:bg-muted/10 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground">{corr.report_number || corr.report_id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    {corr.error_category.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Reviewed by <span className="font-semibold text-foreground">{corr.reviewer_name}</span> ({corr.reviewer_role}) •{' '}
                  {new Date(corr.reviewed_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 bg-muted/20 p-2.5 rounded-lg mb-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Initial AI SIF:</span>{' '}
                  <span className="font-mono font-bold text-foreground">{corr.ai_sif}</span>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Human Verified SIF:</span>{' '}
                  <span
                    className={`font-mono font-bold ${
                      corr.human_sif === 'SIF_POTENTIAL' ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {corr.human_sif}
                  </span>
                </div>
              </div>

              {corr.corrections.length > 0 && (
                <div className="space-y-1 mt-2">
                  {corr.corrections.map((c, cIdx) => (
                    <div key={cIdx} className="text-muted-foreground text-[11px] pl-2 border-l-2 border-primary/40">
                      <span className="font-semibold text-foreground">{c.field}:</span> {c.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
