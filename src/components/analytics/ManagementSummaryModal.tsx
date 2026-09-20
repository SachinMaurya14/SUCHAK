import React, { useState } from 'react';
import { Printer, Copy, Check, Download, AlertTriangle, ShieldCheck, FileText, Info } from 'lucide-react';
import { Modal } from '../ui/Modal.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';
import { ManagementReportSummary } from '../../types/analytics.ts';

export interface ManagementSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ManagementReportSummary | null;
  isLoading: boolean;
}

export const ManagementSummaryModal: React.FC<ManagementSummaryModalProps> = ({
  isOpen,
  onClose,
  summary,
  isLoading,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    if (!summary) return;
    const text = `
SUCHAK - EXECUTIVE HSE MANAGEMENT SUMMARY REPORT
Report ID: ${summary.report_id}
Generated: ${summary.generated_at}
Period: ${summary.reporting_period.start_date.substring(0, 10)} to ${summary.reporting_period.end_date.substring(0, 10)} (${summary.reporting_period.preset})
Organization: ${summary.organization_id}

HEADLINE SAFETY INTELLIGENCE:
- Total Evaluated Reports: ${summary.headline_metrics.total_reports}
- SIF Potential Identified: ${summary.headline_metrics.sif_potential_count} (${summary.sif_distribution.sif_rate_pct}%)
- High & Critical Priority: ${summary.headline_metrics.high_critical_risk_count}
- Active Precursor Clusters: ${summary.headline_metrics.recurring_patterns_count}
- Open Corrective Actions: ${summary.headline_metrics.open_actions_count} (${summary.headline_metrics.overdue_actions_count} overdue)
- Action Completion Rate: ${summary.capa_status.completion_rate_pct}%
- Pending HSE Reviews: ${summary.headline_metrics.pending_reviews_count}
- Active Operational Alerts: ${summary.headline_metrics.active_alerts_count}

DISCLAIMER:
${summary.disclaimer}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadJson = () => {
    if (!summary) return;
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.report_id}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="HSE Executive Management Summary"
      description="Formal periodic safety intelligence brief prepared for corporate operations review"
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              onClick={handleCopy}
            >
              {copied ? 'Copied Brief' : 'Copy Text Brief'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleDownloadJson}
            >
              Download JSON
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
            >
              Print / Save PDF
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      }
    >
      {isLoading || !summary ? (
        <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Generating deterministic executive briefing...</span>
        </div>
      ) : (
        <div className="space-y-6 text-foreground print:text-black">
          {/* Header Metadata */}
          <div className="p-4 rounded-xl bg-surface-muted/40 border border-border flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-primary">{summary.report_id}</span>
                <Badge variant="primary" size="sm">{summary.reporting_period.preset.toUpperCase()}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Reporting Range: <strong className="text-foreground">{summary.reporting_period.start_date.substring(0, 10)}</strong> to{' '}
                <strong className="text-foreground">{summary.reporting_period.end_date.substring(0, 10)}</strong>
              </p>
            </div>
            <div className="text-right text-xs">
              <span className="text-muted-foreground block">Tenant Organization:</span>
              <span className="font-semibold text-foreground">{summary.organization_id}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                Generated: {new Date(summary.generated_at).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Headline Numbers */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Core Telemetry Indicators
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-border bg-surface">
                <span className="text-[11px] text-muted-foreground font-medium block">Total Evaluated</span>
                <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">
                  {summary.headline_metrics.total_reports}
                </span>
                <span className="text-[10px] text-muted-foreground">Reports in window</span>
              </div>
              <div className="p-3 rounded-lg border border-danger/30 bg-danger/5">
                <span className="text-[11px] text-danger font-medium block">SIF Potential</span>
                <span className="text-xl font-bold font-mono text-danger mt-0.5 block">
                  {summary.headline_metrics.sif_potential_count}
                </span>
                <span className="text-[10px] text-danger font-medium">{summary.sif_distribution.sif_rate_pct}% SIF Rate</span>
              </div>
              <div className="p-3 rounded-lg border border-warning/30 bg-warning/5">
                <span className="text-[11px] text-warning font-medium block">High/Critical Risk</span>
                <span className="text-xl font-bold font-mono text-warning mt-0.5 block">
                  {summary.headline_metrics.high_critical_risk_count}
                </span>
                <span className="text-[10px] text-warning">Evaluated reports</span>
              </div>
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <span className="text-[11px] text-primary font-medium block">CAPA Resolution</span>
                <span className="text-xl font-bold font-mono text-primary mt-0.5 block">
                  {summary.capa_status.completion_rate_pct}%
                </span>
                <span className="text-[10px] text-primary font-medium">{summary.capa_status.overdue} overdue</span>
              </div>
            </div>
          </div>

          {/* SIF & Barrier Health Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2.5">
              <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-danger" />
                <span>Top Precursor Clusters</span>
              </h5>
              <div className="space-y-1.5">
                {summary.top_precursor_clusters.map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-foreground">{c.name}</span>
                    <span className="font-mono text-muted-foreground font-medium">
                      {c.count} ({c.share_pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2.5">
              <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Critical Barrier Degradation</span>
              </h5>
              <div className="space-y-1.5">
                {summary.barrier_defense_health.map((b, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-foreground truncate max-w-[180px]">{b.barrier}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-foreground font-semibold">{b.failure_count} failures</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-danger/10 text-danger">{b.state}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Data Quality & Governance */}
          <div className="p-3.5 rounded-xl border border-border bg-surface-muted/30 flex items-start gap-3">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-semibold text-foreground">
                Data Completeness: {summary.data_quality.data_completeness_pct}% • {summary.data_quality.data_status}
              </div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                {summary.data_quality.analyzed_reports} of {summary.data_quality.total_reports} reports fully analyzed with validated schema. {summary.data_quality.uncertain_barrier_observations} barrier observations have unknown failure states (preserved per protocol).
              </p>
            </div>
          </div>

          {/* Anti-Causal Disclaimer */}
          <div className="p-3 rounded-lg border border-warning/20 bg-warning/5 text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Methodological Protocol:</strong> {summary.disclaimer}
          </div>
        </div>
      )}
    </Modal>
  );
};
