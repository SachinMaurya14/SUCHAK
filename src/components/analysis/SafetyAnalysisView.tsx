import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Cpu,
  ShieldAlert,
  Layers,
  FileText,
  Activity,
  Zap,
} from 'lucide-react';
import { BackendAnalysisResponse, SafetyReport } from '../../types/index.ts';
import { reportService } from '../../services/reportService.ts';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';

interface SafetyAnalysisViewProps {
  report: SafetyReport;
  onAnalysisUpdated: (analysis: BackendAnalysisResponse, updatedReport?: SafetyReport) => void;
}

export const SafetyAnalysisView: React.FC<SafetyAnalysisViewProps> = ({
  report,
  onAnalysisUpdated,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const analysis = report.latestAnalysis;
  const isProcessing = report.processingStatus === 'Processing' || isAnalyzing;
  const isFailed = report.processingStatus === 'ANALYSIS_FAILED' || report.processingStatus === 'Failed';

  const handleRunAnalysis = async (force: boolean = false) => {
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const result = force
        ? await reportService.reanalyzeReport(report.id)
        : await reportService.analyzeReport(report.id);

      // Refresh report detail to keep statuses synchronized
      const updated = await reportService.getReportById(report.id);
      onAnalysisUpdated(result, updated);
    } catch (err: any) {
      const msg = err?.message || 'AI Engine is currently unavailable. Review required.';
      setErrorMessage(msg);
      // Try to re-fetch report as its status may have transitioned to ANALYSIS_FAILED
      try {
        const updated = await reportService.getReportById(report.id);
        if (updated) {
          onAnalysisUpdated(report.latestAnalysis || ({} as any), updated);
        }
      } catch {
        // ignore
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6" id="safety-nlp-analysis-container">
      {/* Action Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-xs gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                Safety NLP Engine
              </h3>
              <Badge variant="secondary" size="sm" className="font-mono text-[11px]">
                SIF Potential Classifier
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automated high-risk precursor extraction, barrier failure detection, and SIF triage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {analysis ? (
            <Button
              id="btn-reanalyze-report"
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />}
              disabled={isProcessing}
              onClick={() => handleRunAnalysis(true)}
            >
              {isProcessing ? 'Re-evaluating...' : 'Re-analyze Report'}
            </Button>
          ) : (
            <Button
              id="btn-analyze-report"
              variant="primary"
              size="sm"
              icon={<Sparkles className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-amber-300' : ''}`} />}
              disabled={isProcessing}
              onClick={() => handleRunAnalysis(false)}
            >
              {isProcessing ? 'Analyzing Report...' : 'Analyze Report'}
            </Button>
          )}
        </div>
      </div>

      {/* Failure State / AI Unavailable Mode */}
      {isFailed && (
        <div
          id="analysis-failure-banner"
          className="p-5 rounded-xl border border-danger/40 bg-danger/5 text-card-foreground space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-danger/10 text-danger border border-danger/20 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-danger text-sm">
                  AI Unavailable — Status: ANALYSIS_FAILED
                </span>
                <Badge variant="danger" size="sm">
                  Review Required
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The Safety NLP Engine could not complete automated inference (
                {errorMessage || 'Service unavailable or connection timeout'}).
                In accordance with safety integrity protocols,{' '}
                <strong className="text-foreground">the system fails safe</strong>: this report
                has been routed to <strong>Review Required</strong> and must be triaged manually by an HSE safety reviewer.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              disabled={isProcessing}
              onClick={() => handleRunAnalysis(true)}
            >
              Retry Analysis
            </Button>
          </div>
        </div>
      )}

      {/* Loading In-Progress State */}
      {isProcessing && !analysis && (
        <div className="p-8 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-3 animate-pulse">
          <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground">Safety NLP Engine in Progress</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Extracting potential consequence vectors, hazardous energy levels, and barrier degradation signals from report narrative...
            </p>
          </div>
        </div>
      )}

      {/* No Analysis yet (and not failed) */}
      {!analysis && !isProcessing && !isFailed && (
        <div className="p-8 rounded-xl border border-dashed border-border bg-card/40 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-muted text-muted-foreground">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground">Awaiting Safety AI Analysis</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Click <strong>Analyze Report</strong> above to run the report narrative through the Safety NLP Engine for SIF Potential classification, indicator extraction, and evidence grounding.
            </p>
          </div>
        </div>
      )}

      {/* Detailed Analysis Result Display */}
      {analysis && (
        <div className="space-y-6 animate-in fade-in duration-200" id="analysis-result-content">
          {/* Top Classification Metric Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. SIF Classification */}
            <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                SIF Classification
              </span>
              <div className="flex items-center gap-2.5 pt-1">
                {analysis.classification === 'SIF_POTENTIAL' ? (
                  <Badge variant="danger" size="md" className="font-semibold text-xs px-2.5 py-1">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    SIF POTENTIAL
                  </Badge>
                ) : analysis.classification === 'NON_SIF_POTENTIAL' ? (
                  <Badge variant="success" size="md" className="font-semibold text-xs px-2.5 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    NON-SIF POTENTIAL
                  </Badge>
                ) : (
                  <Badge variant="warning" size="md" className="font-semibold text-xs px-2.5 py-1">
                    <HelpCircle className="w-3.5 h-3.5 mr-1" />
                    NEEDS REVIEW
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                {analysis.classification === 'SIF_POTENTIAL'
                  ? 'High likelihood of fatal or life-altering event under marginally shifted conditions.'
                  : analysis.classification === 'NON_SIF_POTENTIAL'
                  ? 'Controlled energy release without credible critical injury vector.'
                  : 'Ambiguous precursors detected; requires safety supervisor evaluation.'}
              </p>
            </div>

            {/* 2. Confidence & Priority */}
            <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Confidence & Priority
              </span>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xl font-bold font-mono text-foreground">
                  {Math.round(analysis.confidence_estimate * 100)}%
                </span>
                <Badge
                  variant={
                    analysis.confidence_band === 'HIGH'
                      ? 'success'
                      : analysis.confidence_band === 'MEDIUM'
                      ? 'warning'
                      : 'secondary'
                  }
                  size="sm"
                >
                  {analysis.confidence_band} Confidence
                </Badge>
              </div>
              <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full ${
                    analysis.confidence_band === 'HIGH'
                      ? 'bg-emerald-500'
                      : analysis.confidence_band === 'MEDIUM'
                      ? 'bg-amber-500'
                      : 'bg-muted-foreground'
                  }`}
                  style={{ width: `${Math.round(analysis.confidence_estimate * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>Priority Level:</span>
                <span className="font-semibold font-mono text-foreground">{analysis.priority}</span>
              </div>
            </div>

            {/* 3. Precursor Summary */}
            <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Hazardous Energy & Precursors
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {analysis.hazards && analysis.hazards.length > 0 ? (
                  analysis.hazards.map((h, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    >
                      <Zap className="w-3 h-3" />
                      {h}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Standard energy regime</span>
                )}
              </div>
              {analysis.precursor_summary && (
                <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
                  {analysis.precursor_summary}
                </p>
              )}
            </div>
          </div>

          {/* Safety Indicators */}
          <div className="p-5 rounded-xl border border-border/80 bg-card space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Safety Indicators Extracted</h4>
            </div>
            {analysis.safety_indicators && analysis.safety_indicators.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {analysis.safety_indicators.map((indicator, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/60 text-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span className="text-foreground leading-relaxed">{indicator}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No specific precursor indicators detected.</p>
            )}
          </div>

          {/* Evidence Grounding */}
          <div className="p-5 rounded-xl border border-border/80 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">
                  Factual Grounded Evidence
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Verbatim excerpts from incident narrative
              </span>
            </div>
            {analysis.evidence && analysis.evidence.length > 0 ? (
              <div className="space-y-2">
                {analysis.evidence.map((snippet, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border/60 bg-muted/20 text-xs font-mono text-foreground leading-relaxed border-l-3 border-l-primary"
                  >
                    "{snippet}"
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No explicit text quotations flagged.</p>
            )}
          </div>

          {/* Explanation */}
          <div className="p-5 rounded-xl border border-border/80 bg-card space-y-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Explanation & Rationale</h4>
            </div>
            <div className="p-3.5 rounded-lg bg-muted/20 border border-border/60 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {analysis.explanation || 'No rationale explanation provided by model.'}
            </div>
          </div>

          {/* Outcome Comparison (Actual vs Potential) */}
          {(analysis.actual_outcome || analysis.potential_consequence) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border/80 bg-card space-y-1.5">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Actual Outcome
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {analysis.actual_outcome || report.actualOutcome || 'No physical injury reported.'}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border/80 bg-card space-y-1.5">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Potential Consequence (If Unmitigated)
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {analysis.potential_consequence || 'Potential fatal strike or severe blunt force trauma.'}
                </p>
              </div>
            </div>
          )}

          {/* Model Governance Footer */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground px-1 pt-2 border-t border-border/60 gap-2">
            <div className="flex items-center gap-3">
              <span>
                Model: <strong className="font-mono text-foreground">{analysis.model_name || 'suchak_nlp'}</strong>
              </span>
              <span>
                Version: <strong className="font-mono text-foreground">{analysis.model_version || 'v1.0'}</strong>
              </span>
              {analysis.prompt_version && (
                <span>
                  Prompt: <strong className="font-mono text-foreground">{analysis.prompt_version}</strong>
                </span>
              )}
            </div>
            {analysis.created_at && (
              <span>
                Analyzed: {new Date(analysis.created_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
