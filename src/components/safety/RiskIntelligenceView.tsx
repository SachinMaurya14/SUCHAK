import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RotateCw,
  Clock,
  Layers,
  Info,
  Scale,
  FileCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';
import {
  SafetyReport,
  RiskAssessmentResponse,
  RiskFactorEvaluation,
  PriorityBand,
} from '../../types/index.ts';

interface RiskIntelligenceViewProps {
  report: SafetyReport;
  onRiskUpdated?: (assessment: RiskAssessmentResponse) => void;
}

export const RiskIntelligenceView: React.FC<RiskIntelligenceViewProps> = ({
  report,
  onRiskUpdated,
}) => {
  const [assessment, setAssessment] = useState<RiskAssessmentResponse | null>(
    report.latestRiskAssessment || null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch assessment if not provided initially
  useEffect(() => {
    if (!assessment && report.id) {
      setLoading(true);
      fetch(`/api/v1/reports/${report.id}/risk-assessment`)
        .then(async (res) => {
          if (res.ok) {
            const data: RiskAssessmentResponse = await res.json();
            setAssessment(data);
            if (onRiskUpdated) onRiskUpdated(data);
          } else if (res.status === 422) {
            const errData = await res.json();
            setAssessment(errData.assessment || null);
          }
        })
        .catch((err) => {
          console.warn('[SUCHAK] Could not load risk assessment:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [report.id]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reports/${report.id}/risk-assessment/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server returned HTTP ${res.status}`);
      }
      const newAssessment: RiskAssessmentResponse = await res.json();
      setAssessment(newAssessment);
      if (onRiskUpdated) onRiskUpdated(newAssessment);
    } catch (err: any) {
      setError(err.message || 'Failed to recalculate risk priority');
    } finally {
      setRecalculating(false);
    }
  };

  const getPriorityBadge = (band: PriorityBand) => {
    switch (band) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-danger/10 text-danger border border-danger/25">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            CRITICAL ATTENTION
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-warning/15 text-warning border border-warning/30">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            HIGH PRIORITY
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/25">
            <Info className="w-3.5 h-3.5 shrink-0" />
            MEDIUM PRIORITY
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-success/10 text-success border border-success/25">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            LOW / ROUTINE
          </span>
        );
      case 'NEEDS_REVIEW':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-muted text-muted-foreground border border-border">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            NEEDS HSE REVIEW
          </span>
        );
    }
  };

  const getFactorStatusBadge = (factor: RiskFactorEvaluation) => {
    if (factor.status === 'PRESENT') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-danger/10 text-danger border border-danger/20">
          Present (+{factor.contribution} pts)
        </span>
      );
    }
    if (factor.status === 'NOT_PRESENT') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-muted text-muted-foreground border border-border">
          Not Present (0 pts)
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning/10 text-warning border border-warning/20">
        Unknown (0 pts)
      </span>
    );
  };

  if (loading) {
    return (
      <Card className="border border-border">
        <CardContent className="p-8 text-center text-xs text-muted-foreground space-y-3">
          <RotateCw className="w-5 h-5 animate-spin mx-auto text-primary" />
          <p>Evaluating SIF precursor risk factors & policy weights...</p>
        </CardContent>
      </Card>
    );
  }

  if (!assessment || assessment.status === 'RISK_ASSESSMENT_UNAVAILABLE') {
    return (
      <Card className="border border-warning/30 bg-warning/5">
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-warning flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Risk Assessment Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <p className="text-foreground leading-relaxed">
            {assessment?.explanation ||
              'This observation has not yet been processed by Safety Intelligence. Risk priority scoring requires substantiated NLP classification and energy vector extraction.'}
          </p>
          <p className="text-muted-foreground text-[11px]">
            Please execute safety analysis on the observation narrative first to enable transparent SIF risk scoring.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground">
              SIF Risk Intelligence & Prioritization
            </CardTitle>
            <Badge variant="outline" size="sm" className="font-mono text-[11px]">
              Policy v{assessment.policy_version}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Auditable, factor-weighted prioritization based on extracted high-energy precursors and barrier defenses.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRecalculate}
          disabled={recalculating}
          icon={<RotateCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />}
        >
          {recalculating ? 'Recalculating...' : 'Recalculate Score'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Priority Summary Banner (Calm, Professional HSE Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-surface-muted/40 border border-border text-xs">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">
              SIF Precursor Priority
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-foreground">
                {assessment.score}
              </span>
              <span className="text-xs text-muted-foreground font-mono">/ 100</span>
              <div className="ml-2">{getPriorityBadge(assessment.priority)}</div>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              SUCHAK Prototype Priority Scale (not official OIL score)
            </p>
          </div>

          <div className="space-y-1 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-4">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">
              Evidence Quality
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-semibold text-foreground">
              <FileCheck className="w-4 h-4 text-primary" />
              <span>{assessment.evidence_strength} EVIDENCE</span>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              Derived from verified textual parameters and energy magnitude
            </p>
          </div>

          <div className="space-y-1 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-4">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">
              Calculation Audit
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date(assessment.calculated_at).toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              Policy ID: {assessment.risk_policy_version_id}
            </p>
          </div>
        </div>

        {/* Explainability Block */}
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5 text-xs">
          <span className="font-bold text-primary uppercase tracking-wider text-[11px] block flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Why This Priority?
          </span>
          <p className="text-foreground leading-relaxed text-[13px]">
            {assessment.explanation}
          </p>
        </div>

        {/* Factor Breakdown Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Factor Weight Breakdown & Evidence Concordance
            </h4>
            <span className="text-[11px] text-muted-foreground">
              Total Score: <strong className="font-mono text-foreground">{assessment.score} / 100</strong>
            </span>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-muted/60 border-b border-border text-[11px] font-semibold text-muted-foreground">
                  <th className="py-2.5 px-3">Evaluation Factor</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Policy Weight</th>
                  <th className="py-2.5 px-3 text-right">Contribution</th>
                  <th className="py-2.5 px-3">Supported Field Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {assessment.factor_breakdown.map((factor, idx) => (
                  <tr key={idx} className="hover:bg-surface-muted/20 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">
                      {factor.name}
                    </td>
                    <td className="py-2.5 px-3">{getFactorStatusBadge(factor)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                      {Math.round(factor.weight * 100)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                      +{factor.contribution}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground text-[11px] max-w-xs truncate">
                      {factor.evidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Safety Disclaimer Footer */}
        <div className="pt-2 border-t border-border-subtle text-[11px] text-muted-foreground leading-relaxed">
          <p>
            <strong>Official Safety Positioning:</strong> SUCHAK Risk Intelligence scores prioritize SIF precursor observations for triage and inspection attention. This score does not represent an actuarial probability of fatality or an official OIL risk formula.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
