import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  FileText,
  User,
  MapPin,
  Calendar,
  Share2,
  Sparkles,
  ShieldCheck,
  Building,
  Check,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { RiskBadge } from '../components/ui/RiskBadge.tsx';
import { StatusBadge } from '../components/ui/StatusBadge.tsx';
import { Tabs } from '../components/ui/Tabs.tsx';
import { SafetyAnalysisView } from '../components/analysis/SafetyAnalysisView.tsx';
import { RiskIntelligenceView } from '../components/safety/RiskIntelligenceView.tsx';
import { SimilarReportsView } from '../components/safety/SimilarReportsView.tsx';
import { reportService } from '../services/reportService.ts';
import { SafetyReport, BackendAnalysisResponse, RiskAssessmentResponse } from '../types/index.ts';

export interface ReportDetailPageProps {
  reportId: string;
  onNavigate: (path: string) => void;
}

export const ReportDetailPage: React.FC<ReportDetailPageProps> = ({
  reportId = 'REP-2026-0891',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [associatedPatterns, setAssociatedPatterns] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/v1/reports/${reportId}/patterns?organization_id=oil-india-demo`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAssociatedPatterns(data);
        }
      })
      .catch(() => {});
  }, [reportId]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    reportService
      .getReportById(reportId)
      .then((data) => {
        if (active && data) {
          setReport(data);
        }
      })
      .catch(() => {
        // Keep null to fall back to structured baseline details
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reportId]);

  const siteName = report?.siteName || 'Digboi Central Asset';
  const locationName = report?.location || 'Rig Floor #4 - High Pressure Manifold';
  const timestamp = report?.dateTime || '2026-09-18 14:22 UTC';
  const reportType = report?.reportType || 'Near-Miss';
  const reviewStatus = report?.reviewStatus || 'Under Review';
  const narrative = report?.description ||
    'During hydrostatic pressure testing at 5,000 PSI on manifold #4, a junior technician stepped across the barricaded zone directly in front of the pressurized swivel joint while pressure was ramping up. The safety whip check was found to be disconnected. The test engineer spotted the breach and immediately aborted the test via emergency bleed-off valve before any component rupture occurred.';

  const isSifPotential =
    narrative.toLowerCase().includes('pressure') ||
    narrative.toLowerCase().includes('height') ||
    narrative.toLowerCase().includes('voltage') ||
    narrative.toLowerCase().includes('confined');

  const effectiveReport: SafetyReport = report || {
    id: reportId,
    organizationId: 'org-oil-india',
    siteId: 'site-digboi',
    siteName: siteName,
    location: locationName,
    activity: 'High Pressure Line Testing',
    reportType: reportType,
    dateTime: timestamp,
    description: narrative,
    processingStatus: 'Pending',
    reviewStatus: reviewStatus as any,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const handleAnalysisUpdated = (
    newAnalysis: BackendAnalysisResponse,
    updatedReport?: SafetyReport
  ) => {
    if (updatedReport) {
      setReport(updatedReport);
    } else {
      setReport((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          latestAnalysis: newAnalysis,
          processingStatus: (newAnalysis.classification === 'NEEDS_REVIEW'
            ? 'REVIEW_REQUIRED'
            : 'ANALYZED') as any,
        };
      });
    }
  };

  const renderHeaderBadge = () => {
    if (effectiveReport.processingStatus === 'ANALYSIS_FAILED') {
      return (
        <Badge variant="danger" size="md">
          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
          Review Required (Analysis Failed)
        </Badge>
      );
    }
    if (effectiveReport.latestAnalysis?.classification === 'SIF_POTENTIAL') {
      return <RiskBadge level="SIF_POTENTIAL" />;
    }
    if (effectiveReport.latestAnalysis?.classification === 'NON_SIF_POTENTIAL') {
      return <RiskBadge level="LOW" />;
    }
    if (effectiveReport.latestAnalysis?.classification === 'NEEDS_REVIEW') {
      return (
        <Badge variant="warning" size="md">
          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
          Review Required
        </Badge>
      );
    }
    return <RiskBadge level={isSifPotential ? 'SIF_POTENTIAL' : 'HIGH'} />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title={`Report Inspection: ${reportId}`}
        subtitle={`${report?.activity || 'High Pressure Line Testing'} — Barrier Failure and SIF Precursor Evaluation`}
        breadcrumbs={[
          { label: 'Reports Repository', onClick: () => onNavigate('/reports') },
          { label: reportId },
        ]}
        badge={renderHeaderBadge()}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('/reports')}
            >
              Back to List
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('/review')}
            >
              Triage / Review
            </Button>
          </div>
        }
      />

      {/* Report Header Metadata Panel */}
      <Card>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs p-5">
          <div>
            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider font-bold">
              Operational Site
            </span>
            <span className="font-semibold text-foreground flex items-center gap-1.5 mt-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{siteName} ({locationName})</span>
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider font-bold">
              Date & Timestamp
            </span>
            <span className="font-semibold text-foreground flex items-center gap-1.5 mt-1.5 tabular-nums">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {timestamp}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider font-bold">
              Processing Status
            </span>
            <div className="mt-1.5">
              <StatusBadge status={effectiveReport.processingStatus} />
            </div>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider font-bold">
              Review Status
            </span>
            <div className="mt-1.5">
              <StatusBadge status={reviewStatus as any} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'overview', label: 'Report Overview' },
          { id: 'similar', label: 'Similar Reports', badge: 'Phase 7' },
          { id: 'risk', label: 'SIF Risk Prioritization', badge: 'Phase 6' },
          {
            id: 'analysis',
            label: 'Safety NLP Engine',
            badge: effectiveReport.latestAnalysis
              ? effectiveReport.latestAnalysis.classification === 'SIF_POTENTIAL'
                ? 'SIF Detected'
                : 'Analyzed'
              : effectiveReport.processingStatus === 'ANALYSIS_FAILED'
              ? 'Failed'
              : 'Pending',
          },
          { id: 'precursors', label: 'SIF Precursors & Barriers', badge: '3 Signals' },
          { id: 'rules', label: 'IOGP Rule Concordance', badge: 'Line of Fire' },
          { id: 'trail', label: 'Audit Trail & Verification' },
        ]}
      />

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Field Observation Narrative</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-foreground leading-relaxed">
                <div className="p-4 rounded-xl bg-surface-muted/60 border border-border leading-relaxed font-normal text-foreground text-[13px]">
                  {narrative}
                </div>

                <div className="space-y-1.5 pt-2">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">Immediate Corrective Actions Recorded</h4>
                  <p className="text-foreground leading-relaxed text-xs">
                    Hydrostatic proof test was aborted immediately. Barricade perimeter expanded by 15 meters to prevent personnel exposure. Secondary whip check re-rigged and inspected by Senior Rig Specialist. Toolbox talk re-conducted.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Intelligence Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-border-subtle">
                  <span className="text-muted-foreground">SIF Potential:</span>
                  <span className={`font-bold ${effectiveReport.latestAnalysis?.classification === 'SIF_POTENTIAL' ? 'text-danger' : 'text-foreground'}`}>
                    {effectiveReport.latestAnalysis?.classification?.replace('_', ' ') || (isSifPotential ? 'HIGH PRECURSOR' : 'EVALUATING')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border-subtle">
                  <span className="text-muted-foreground">Confidence Score:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {effectiveReport.latestAnalysis ? `${Math.round(effectiveReport.latestAnalysis.confidence_estimate * 100)}%` : '88% (Baseline)'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border-subtle">
                  <span className="text-muted-foreground">Primary Rule:</span>
                  <span className="font-semibold text-warning">
                    {effectiveReport.latestAnalysis?.safety_indicators?.[0] || 'Line of Fire'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground">Precursor Pattern:</span>
                  {associatedPatterns.length > 0 ? (
                    <span
                      className="text-primary font-medium hover:underline cursor-pointer flex items-center gap-1"
                      onClick={() => onNavigate('/patterns')}
                      title={associatedPatterns[0].title}
                    >
                      <span className="font-mono font-bold text-xs">{associatedPatterns[0].pattern_number}</span>
                      <span className="truncate max-w-[150px] text-xs">({associatedPatterns[0].title})</span>
                    </span>
                  ) : (
                    <span
                      className="text-muted-foreground text-xs hover:text-primary cursor-pointer hover:underline"
                      onClick={() => onNavigate('/patterns')}
                    >
                      Inspect Patterns
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Phase 6: SIF Risk Intelligence View */}
          <RiskIntelligenceView
            report={effectiveReport}
            onRiskUpdated={(newRisk) => {
              setReport((prev) => (prev ? { ...prev, latestRiskAssessment: newRisk } : null));
            }}
          />

          {/* Embedded Safety NLP Engine on Overview Tab */}
          <SafetyAnalysisView
            report={effectiveReport}
            onAnalysisUpdated={handleAnalysisUpdated}
          />
        </div>
      )}

      {activeTab === 'similar' && (
        <SimilarReportsView
          reportId={effectiveReport.id}
          reportNumber={effectiveReport.reportNumber || reportId}
          onSelectReport={(selectedId) => onNavigate(`/reports/${selectedId}`)}
        />
      )}

      {activeTab === 'risk' && (
        <RiskIntelligenceView
          report={effectiveReport}
          onRiskUpdated={(newRisk) => {
            setReport((prev) => (prev ? { ...prev, latestRiskAssessment: newRisk } : null));
          }}
        />
      )}

      {activeTab === 'analysis' && (
        <SafetyAnalysisView
          report={effectiveReport}
          onAnalysisUpdated={handleAnalysisUpdated}
        />
      )}

      {activeTab === 'precursors' && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Precursor Signals & Barrier Defenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-danger/20 bg-danger/5 space-y-2">
                <span className="font-bold text-danger uppercase tracking-wider text-[11px] block">
                  Defeated / Failed Physical Barrier
                </span>
                <p className="font-semibold text-foreground">Missing Safety Whip Check Cable</p>
                <p className="text-muted-foreground leading-relaxed">
                  The secondary mechanical restraint intended to prevent whipping of ruptured high-pressure hose was unlatched.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-warning/20 bg-warning/5 space-y-2">
                <span className="font-bold text-warning uppercase tracking-wider text-[11px] block">
                  Defeated Administrative Barrier
                </span>
                <p className="font-semibold text-foreground">Unauthorized Barricade Breach</p>
                <p className="text-muted-foreground leading-relaxed">
                  Personnel ingress into the red-zone exclusionary radius during active pressurized proofing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'rules' && (
        <Card>
          <CardHeader>
            <CardTitle>IOGP Life-Saving Rule Concordance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-4 rounded-xl border border-border bg-surface-muted/30">
              <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                <ShieldAlert className="w-4 h-4 text-warning" />
                <span>Line of Fire — Rule 4</span>
              </div>
              <p className="text-muted-foreground mt-2 leading-relaxed">
                "I position myself for safety and protect myself and others from moving equipment, stored energy, and dropped objects."
              </p>
              <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Relevance Confidence: 94% (High Alignment)</span>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('/rules')}>
                  View Rule Guidance →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'trail' && (
        <Card>
          <CardHeader>
            <CardTitle>Review Trail & Verification History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-start gap-3 pb-3 border-b border-border-subtle">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Report Ingested via Field Observation Terminal</p>
                <p className="text-[11px] text-muted-foreground">{timestamp} by Field Operator ({siteName})</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-warning mt-1.5 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Auto-Triaged to HSE Officer Review Queue</p>
                <p className="text-[11px] text-muted-foreground">Classified as High SIF Precursor under Oil India Limited tenant isolation.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
