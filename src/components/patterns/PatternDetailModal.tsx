import React, { useState } from 'react';
import {
  X,
  Calendar,
  MapPin,
  Activity,
  ShieldAlert,
  BookOpen,
  TrendingUp,
  FileText,
  ExternalLink,
  Info,
  CheckCircle2,
  Layers,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { PrecursorPattern } from '../../types/index.ts';
import { PatternStatusBadge } from './PatternStatusBadge.tsx';
import { PatternStrengthIndicator } from './PatternStrengthIndicator.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';

interface PatternDetailModalProps {
  pattern: PrecursorPattern | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateReport: (reportId: string) => void;
}

export const PatternDetailModal: React.FC<PatternDetailModalProps> = ({
  pattern,
  isOpen,
  onClose,
  onNavigateReport,
}) => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'members' | 'distribution' | 'trend'>('evidence');

  if (!isOpen || !pattern) return null;

  const formatDate = (dStr: string) => {
    try {
      return new Date(dStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden text-foreground"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 border-b border-border bg-muted/20">
          <div className="space-y-1.5 pr-6">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                {pattern.pattern_number}
              </span>
              <PatternStatusBadge status={pattern.status} size="sm" />
              <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                {pattern.discovery_version}
              </Badge>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{pattern.title}</h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">{pattern.summary}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Key Metrics Quick Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-border-subtle bg-muted/10 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground block text-[11px]">Supporting Reports</span>
            <span className="font-mono text-base font-bold text-foreground">
              {pattern.support_count}{' '}
              <span className="text-[11px] font-normal text-muted-foreground">observations</span>
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground block text-[11px]">Unique Dates</span>
            <span className="font-mono text-base font-bold text-foreground">
              {pattern.unique_date_count}{' '}
              <span className="text-[11px] font-normal text-muted-foreground">calendar days</span>
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground block text-[11px]">Observation Window</span>
            <span className="text-xs font-medium text-foreground block truncate">
              {formatDate(pattern.first_seen_at)} – {formatDate(pattern.last_seen_at)}
            </span>
          </div>
          <div>
            <PatternStrengthIndicator score={pattern.pattern_strength} size="sm" />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border px-5 bg-card text-xs">
          <button
            onClick={() => setActiveTab('evidence')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'evidence'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pattern Evidence
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Supporting Reports ({pattern.members.length})
          </button>
          <button
            onClick={() => setActiveTab('distribution')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'distribution'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Sites & Activities
          </button>
          <button
            onClick={() => setActiveTab('trend')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'trend'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Temporal Trend
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              {/* Evidence Claims Box */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Why This Recurring Pattern Exists</span>
                </div>
                <ul className="space-y-2 text-xs text-foreground">
                  {pattern.evidence_summary.traceable_evidence_bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Core Precursor & Barrier Failure Profiles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-4 bg-muted/10 space-y-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Precursor & Hazard Profile
                  </span>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Primary Precursor:</span>
                    <p className="text-sm font-semibold text-foreground">{pattern.primary_precursor}</p>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-border-subtle">
                    <span className="text-xs text-muted-foreground">Associated Hazard:</span>
                    <p className="text-xs font-medium text-foreground">{pattern.primary_hazard}</p>
                  </div>
                  {pattern.energy_context.length > 0 && (
                    <div className="pt-1 border-t border-border-subtle">
                      <span className="text-[11px] text-muted-foreground block">Energy Context:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pattern.energy_context.map((e, idx) => (
                          <Badge key={idx} variant="secondary" size="sm">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border p-4 bg-muted/10 space-y-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Recurrent Barrier Failure
                  </span>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Primary Barrier Compromise:</span>
                    <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                      {pattern.primary_barrier_failure}
                    </p>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-border-subtle">
                    <span className="text-xs text-muted-foreground">Mapped Life-Saving Rules:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pattern.iogp_rules.map((rule, idx) => (
                        <Badge key={idx} variant="primary" size="sm">
                          {rule}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing {pattern.members.length} field observations supporting this pattern
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Sorted by similarity to pattern centroid
                </span>
              </div>

              <div className="space-y-2">
                {pattern.members.map((m) => (
                  <div
                    key={m.report_id}
                    className="p-3.5 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-primary">{m.report_number}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{formatDate(m.report_datetime)}</span>
                        <span className="text-muted-foreground">•</span>
                        <Badge variant="outline" size="sm">
                          {m.site_name}
                        </Badge>
                        <span className="text-muted-foreground font-mono text-[10px]">
                          Centroid Similarity: {(m.similarity_to_centroid * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">{m.description_snippet}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                        <span>Activity: <strong className="text-foreground">{m.activity_name}</strong></span>
                        <span>•</span>
                        <span>Barrier: <strong className="text-rose-600 dark:text-rose-400">{m.barrier_failure}</strong></span>
                      </div>
                    </div>

                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onClose();
                          onNavigateReport(m.report_id);
                        }}
                        icon={<ExternalLink className="w-3.5 h-3.5" />}
                        iconPosition="right"
                        className="w-full md:w-auto"
                      >
                        Inspect Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'distribution' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Sites Distribution */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>Site Distribution</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {pattern.distributions.sites.map((s) => (
                      <div key={s.site_id} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium text-foreground">{s.site_name}</span>
                          <span className="font-mono text-muted-foreground">
                            {s.count} reports ({s.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${s.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activities Distribution */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Activity className="w-4 h-4 text-primary" />
                    <span>Operational Activities</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {pattern.distributions.activities.map((a) => (
                      <div key={a.activity_id} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium text-foreground">{a.activity_name}</span>
                          <span className="font-mono text-muted-foreground">
                            {a.count} reports ({a.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary/80 h-full rounded-full"
                            style={{ width: `${a.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trend' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4 bg-muted/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span>Temporal Recurrence Analysis</span>
                  </div>
                  <Badge variant="secondary" size="sm">
                    {pattern.trend.trend_direction}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {pattern.trend.trend_description}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-2.5 rounded bg-card border border-border-subtle">
                    <span className="text-muted-foreground block text-[11px]">Recent 30 Days</span>
                    <span className="font-mono text-base font-bold text-foreground">
                      {pattern.trend.recent_occurrences_30d} reports
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-card border border-border-subtle">
                    <span className="text-muted-foreground block text-[11px]">Prior 30 Days</span>
                    <span className="font-mono text-base font-bold text-foreground">
                      {pattern.trend.prior_occurrences_30d} reports
                    </span>
                  </div>
                </div>
              </div>

              {/* Monthly Observation Buckets */}
              {pattern.trend.timeline.length > 0 && (
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Observations by Month
                  </span>
                  <div className="space-y-2">
                    {pattern.trend.timeline.map((bucket) => (
                      <div key={bucket.period} className="flex items-center gap-3 text-xs">
                        <span className="w-20 font-mono text-muted-foreground">{bucket.period}</span>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(10, (bucket.count / pattern.support_count) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono font-bold w-12 text-right">
                          {bucket.count} reps
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Domain & Methodology Disclaimer */}
          <div className="rounded-lg border border-border-subtle bg-muted/20 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-foreground block">Methodology & Separation of Concerns</strong>
              <p>{pattern.methodology_disclaimer}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/10 flex justify-between items-center text-xs">
          <span className="text-muted-foreground font-mono">
            Discovery Run ID: {pattern.discovery_run_id}
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Inspection
          </Button>
        </div>
      </div>
    </div>
  );
};
