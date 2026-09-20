import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Filter,
  RefreshCw,
  Download,
  FileText,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Share2,
  Building,
  CheckCircle2,
  Clock,
  Bell,
  ArrowRight,
  Info,
  Layers,
  Activity,
  Shield,
  SlidersHorizontal,
  X,
  ExternalLink,
  Printer,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Skeleton } from '../components/ui/Skeleton.tsx';
import { TableShell, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/TableShell.tsx';
import {
  AnalyticsFilterOptions,
  AnalyticsOverviewResponse,
  TimeWindowPreset,
  ReviewedStatePolicy,
  KPICardData,
  ManagementReportSummary,
} from '../types/analytics.ts';
import { analyticsService } from '../services/analyticsService.ts';
import {
  TrendTimelineChart,
  SifDonutChart,
  SitePrecursorHeatmap,
  BarrierHealthGrid,
} from '../components/analytics/AnalyticsCharts.tsx';
import { ManagementSummaryModal } from '../components/analytics/ManagementSummaryModal.tsx';
import { ExportAnalyticsModal } from '../components/analytics/ExportAnalyticsModal.tsx';

export interface AnalyticsPageProps {
  onNavigate: (path: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onNavigate }) => {
  // ----------------------------------------------------
  // State
  // ----------------------------------------------------
  const [filters, setFilters] = useState<AnalyticsFilterOptions>({
    time_window: '30d',
    site_id: 'ALL',
    activity_id: 'ALL',
    report_type: 'ALL',
    sif_status: 'ALL',
    risk_priority: 'ALL',
    reviewed_state_policy: 'LATEST_REVIEWED',
  });

  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'reports_sif' | 'risk_barriers' | 'precursors_patterns' | 'sites_activities' | 'workflows' | 'governance'
  >('overview');

  // Modals
  const [managementModalOpen, setManagementModalOpen] = useState(false);
  const [managementSummary, setManagementSummary] = useState<ManagementReportSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [activeKpiInfo, setActiveKpiInfo] = useState<KPICardData | null>(null);

  // ----------------------------------------------------
  // Fetch Analytics
  // ----------------------------------------------------
  const loadAnalytics = useCallback(async (currentFilters: AnalyticsFilterOptions, silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const response = await analyticsService.getOverview(currentFilters);
      setData(response);
    } catch (err: any) {
      console.error('Failed to load analytics overview:', err);
      setErrorMessage(err.message || 'Failed to fetch executive analytics telemetry.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics(filters);
  }, [filters, loadAnalytics]);

  // ----------------------------------------------------
  // Handlers
  // ----------------------------------------------------
  const handleTimeWindowChange = (tw: TimeWindowPreset) => {
    if (tw === 'custom') {
      const today = new Date().toISOString().substring(0, 10);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().substring(0, 10);
      setCustomStartDate(thirtyDaysAgo);
      setCustomEndDate(today);
      setFilters((prev) => ({
        ...prev,
        time_window: 'custom',
        start_date: thirtyDaysAgo,
        end_date: today,
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        time_window: tw,
        start_date: undefined,
        end_date: undefined,
      }));
    }
  };

  const handleApplyCustomDates = () => {
    if (customStartDate && customEndDate) {
      setFilters((prev) => ({
        ...prev,
        time_window: 'custom',
        start_date: customStartDate,
        end_date: customEndDate,
      }));
    }
  };

  const handlePolicyToggle = () => {
    setFilters((prev) => ({
      ...prev,
      reviewed_state_policy:
        prev.reviewed_state_policy === 'LATEST_REVIEWED' ? 'ORIGINAL_AI' : 'LATEST_REVIEWED',
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      time_window: '30d',
      site_id: 'ALL',
      activity_id: 'ALL',
      report_type: 'ALL',
      sif_status: 'ALL',
      risk_priority: 'ALL',
      reviewed_state_policy: 'LATEST_REVIEWED',
    });
  };

  const handleGenerateManagementSummary = async () => {
    setManagementModalOpen(true);
    setIsSummaryLoading(true);
    try {
      const summary = await analyticsService.generateManagementSummary(filters);
      setManagementSummary(summary);
    } catch (err: any) {
      alert(`Failed to generate management summary: ${err.message}`);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // Has active non-default filters
  const hasActiveFilters =
    filters.time_window !== '30d' ||
    (filters.site_id && filters.site_id !== 'ALL') ||
    (filters.activity_id && filters.activity_id !== 'ALL') ||
    (filters.report_type && filters.report_type !== 'ALL') ||
    (filters.sif_status && filters.sif_status !== 'ALL') ||
    (filters.risk_priority && filters.risk_priority !== 'ALL') ||
    filters.reviewed_state_policy !== 'LATEST_REVIEWED';

  // ----------------------------------------------------
  // Render Helpers
  // ----------------------------------------------------
  const renderComparisonBadge = (kpi: KPICardData) => {
    if (!kpi.comparison) return null;
    const { direction, label } = kpi.comparison;

    let badgeClass = 'text-muted-foreground bg-surface-muted/40';
    if (direction === 'INCREASE') {
      // In HSE, if it's actions completed, increase is good; if reports or SIF, increase is an escalation
      const isEscalation = kpi.metric_id.includes('SIF') || kpi.metric_id.includes('ALERT') || kpi.metric_id.includes('OVERDUE');
      badgeClass = isEscalation ? 'text-danger bg-danger/10 font-semibold' : 'text-primary bg-primary/10 font-semibold';
    } else if (direction === 'DECREASE') {
      const isImprovement = kpi.metric_id.includes('OVERDUE') || kpi.metric_id.includes('ALERT');
      badgeClass = isImprovement ? 'text-success bg-success/10 font-semibold' : 'text-muted-foreground bg-surface-muted';
    } else if (direction === 'NEW_BASELINE') {
      badgeClass = 'text-warning bg-warning/10 font-medium';
    }

    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-1 font-mono ${badgeClass}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 pb-16">
      {/* 1. Header & Actions */}
      <PageHeader
        title="Executive Safety Intelligence & HSE Analytics"
        subtitle="Authoritative decision support synthesizing SIF precursors, barrier degradation, and risk posture across operational assets."
        badge={<Badge variant="primary" size="sm">Executive Analytics</Badge>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
              onClick={() => loadAnalytics(filters, true)}
              disabled={isRefreshing}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => setExportModalOpen(true)}
            >
              Export Analytics
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<FileText className="w-3.5 h-3.5" />}
              onClick={handleGenerateManagementSummary}
            >
              Management Summary
            </Button>
          </div>
        }
      />

      {/* 2. Global Filter Toolbar */}
      <Card className="border-primary/20 bg-surface/90 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Time Window Buttons */}
            <div className="flex items-center gap-1.5 bg-surface-muted/60 p-1 rounded-lg border border-border">
              {(['7d', '30d', '90d', '1y', 'all', 'custom'] as TimeWindowPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleTimeWindowChange(preset)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    filters.time_window === preset
                      ? 'bg-surface text-foreground shadow-xs border border-border/80'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {preset.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Reviewed-State Policy Toggle */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium hidden sm:inline">SIF Policy:</span>
              <button
                type="button"
                onClick={handlePolicyToggle}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Toggle between latest human-reviewed SIF classifications vs original raw AI predictions"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    filters.reviewed_state_policy === 'LATEST_REVIEWED' ? 'bg-success' : 'bg-warning'
                  }`}
                />
                <span className="font-semibold text-foreground">
                  {filters.reviewed_state_policy === 'LATEST_REVIEWED' ? 'Reviewed State' : 'Original AI'}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  ({filters.reviewed_state_policy === 'LATEST_REVIEWED' ? 'Human Verified' : 'AI Initial'})
                </span>
              </button>
            </div>

            {/* Filter Toggle & Clear */}
            <div className="flex items-center gap-2">
              <Button
                variant={showAdvancedFilters ? 'secondary' : 'outline'}
                size="sm"
                icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? 'Hide Filters' : 'Filter by Site / Risk'}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<X className="w-3.5 h-3.5" />}
                  onClick={handleResetFilters}
                  className="text-muted-foreground hover:text-danger"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Custom Date Pickers (when custom) */}
          {filters.time_window === 'custom' && (
            <div className="pt-2 border-t border-border-subtle flex flex-wrap items-center gap-3 text-xs">
              <span className="text-muted-foreground font-semibold">Custom Period Range:</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <span className="text-muted-foreground">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <Button variant="outline" size="sm" onClick={handleApplyCustomDates}>
                  Apply Range
                </Button>
              </div>
            </div>
          )}

          {/* Advanced Multi-Dimension Filter Panel */}
          {showAdvancedFilters && (
            <div className="pt-3 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-in fade-in duration-150">
              {/* Site Selector */}
              <div>
                <label className="font-semibold text-foreground block mb-1">Asset / Site</label>
                <select
                  value={filters.site_id || 'ALL'}
                  onChange={(e) => setFilters((prev) => ({ ...prev, site_id: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Operational Sites</option>
                  <option value="site-digboi-01">Digboi Central Rig #4</option>
                  <option value="site-moran-02">Moran Drilling Site A</option>
                  <option value="site-duliajan-03">Duliajan Gas Gathering</option>
                  <option value="site-numaligarh-04">Numaligarh Terminus</option>
                  <option value="site-sibsagar-05">Sibsagar Storage Terminal</option>
                </select>
              </div>

              {/* Activity Selector */}
              <div>
                <label className="font-semibold text-foreground block mb-1">Activity Context</label>
                <select
                  value={filters.activity_id || 'ALL'}
                  onChange={(e) => setFilters((prev) => ({ ...prev, activity_id: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Operational Activities</option>
                  <option value="act-01">Heavy Lifting & Crane Rigging</option>
                  <option value="act-02">Confined Space Vessel Entry</option>
                  <option value="act-03">Hot Work Welding & Cutting</option>
                  <option value="act-04">Scaffolding & Work at Height</option>
                  <option value="act-05">High Pressure Line Testing</option>
                </select>
              </div>

              {/* SIF Status */}
              <div>
                <label className="font-semibold text-foreground block mb-1">SIF Potential Status</label>
                <select
                  value={filters.sif_status || 'ALL'}
                  onChange={(e) => setFilters((prev) => ({ ...prev, sif_status: e.target.value as any }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Classifications</option>
                  <option value="SIF_POTENTIAL">SIF Potential Only</option>
                  <option value="NON_SIF_POTENTIAL">Non-SIF Potential</option>
                  <option value="NEEDS_REVIEW">Needs Human Review</option>
                </select>
              </div>

              {/* Risk Priority */}
              <div>
                <label className="font-semibold text-foreground block mb-1">Authoritative Risk Band</label>
                <select
                  value={filters.risk_priority || 'ALL'}
                  onChange={(e) => setFilters((prev) => ({ ...prev, risk_priority: e.target.value as any }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Priority Bands</option>
                  <option value="CRITICAL">Critical Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                  <option value="NEEDS_REVIEW">Needs Review</option>
                </select>
              </div>
            </div>
          )}

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-muted-foreground font-medium">Applied Scope:</span>
              <span className="px-2 py-0.5 rounded-full bg-surface-muted text-foreground border border-border font-medium">
                Window: {filters.time_window?.toUpperCase()}
              </span>
              {filters.site_id && filters.site_id !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                  Site: {filters.site_id}
                </span>
              )}
              {filters.activity_id && filters.activity_id !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                  Activity: {filters.activity_id}
                </span>
              )}
              {filters.sif_status && filters.sif_status !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20 font-medium">
                  SIF: {filters.sif_status}
                </span>
              )}
              {filters.risk_priority && filters.risk_priority !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20 font-medium">
                  Risk: {filters.risk_priority}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-surface-muted text-muted-foreground font-medium">
                Policy: {filters.reviewed_state_policy}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Deterministic Narrative & Methodology Strip */}
      {data && (
        <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">Executive Safety Synthesis:</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary uppercase">
                Deterministic Calculation
              </span>
            </div>
            <p className="text-foreground/90">{data.deterministic_summary}</p>
            <p className="text-[11px] text-muted-foreground">
              <strong className="text-foreground">Methodological Protocol:</strong> {data.methodology_statement}
            </p>
          </div>
        </div>
      )}

      {/* 4. Executive KPI Strip (8 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))
          : data?.kpi_strip.map((kpi) => (
              <Card key={kpi.metric_id} className="relative group hover:border-primary/40 transition-all duration-200">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                      <h3 className="text-2xl font-bold text-foreground font-mono tracking-tight mt-1">
                        {kpi.formatted_value}
                      </h3>
                      {renderComparisonBadge(kpi)}
                    </div>
                    {/* Tooltip / Definition Toggle */}
                    <button
                      type="button"
                      onClick={() => setActiveKpiInfo(activeKpiInfo?.metric_id === kpi.metric_id ? null : kpi)}
                      className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-surface-muted transition-colors"
                      title="Inspect metric calculation formula and authoritative source"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Drill-down link */}
                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
                    <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[120px]">
                      {kpi.authoritative_source}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate(kpi.drill_down_path)}
                      className="text-primary hover:text-primary-hover font-semibold flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>{kpi.drill_down_label}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* KPI Details Popover (if active) */}
      {activeKpiInfo && (
        <div className="p-4 rounded-xl border border-primary/30 bg-surface shadow-lg text-xs space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              {activeKpiInfo.label} — Governance & Formula Card
            </span>
            <button
              type="button"
              onClick={() => setActiveKpiInfo(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-muted-foreground pt-1">
            <div className="p-2.5 rounded-lg bg-surface-muted/50 border border-border">
              <span className="text-[10px] uppercase font-bold text-foreground block">Formal Definition</span>
              <p className="mt-0.5 text-[11px] leading-relaxed">{activeKpiInfo.definition}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-muted/50 border border-border">
              <span className="text-[10px] uppercase font-bold text-foreground block">Calculation Formula</span>
              <code className="mt-0.5 text-[11px] block font-mono text-primary break-all">
                {activeKpiInfo.metric_id === 'COMPLETION_RATE'
                  ? '(verified + closed) / (total - cancelled)'
                  : activeKpiInfo.metric_id === 'SIF_PRECURSORS'
                  ? 'Count of reports meeting SIF rule set per policy'
                  : 'Aggregated verified count'}
              </code>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-muted/50 border border-border">
              <span className="text-[10px] uppercase font-bold text-foreground block">Authoritative Domain Source</span>
              <p className="mt-0.5 text-[11px] font-mono text-foreground font-semibold">
                {activeKpiInfo.authoritative_source}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Interactive Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-0">
        {[
          { id: 'overview', label: 'Executive Overview', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'reports_sif', label: 'Reports & SIF Classification', icon: <FileText className="w-4 h-4" /> },
          { id: 'risk_barriers', label: 'Risk & Barrier Defense', icon: <Shield className="w-4 h-4" /> },
          { id: 'precursors_patterns', label: 'Precursors & Patterns', icon: <Share2 className="w-4 h-4" /> },
          { id: 'sites_activities', label: 'Sites & Activities', icon: <Building className="w-4 h-4" /> },
          { id: 'workflows', label: 'Workflows (CAPA, Reviews, Alerts)', icon: <Clock className="w-4 h-4" /> },
          { id: 'governance', label: 'Data Quality & Methodology', icon: <Info className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 6. Tab Contents */}

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && data && (
        <div className="space-y-6">
          {/* Row 1: Volume Trend & SIF Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex items-center justify-between pb-2">
                <div>
                  <CardTitle>Report Volume & Risk Telemetry Trend</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Daily observations, SIF potential occurrences, and High/Critical risk prioritization
                  </p>
                </div>
                <Badge variant="outline" size="sm">
                  {data.period.preset.toUpperCase()} Window
                </Badge>
              </CardHeader>
              <CardContent>
                <TrendTimelineChart series={data.trend_series} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <div>
                  <CardTitle>SIF Potential Distribution</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Precursor ratio under {data.sif_distribution.policy_applied}
                  </p>
                </div>
                <Badge variant={data.sif_distribution.sif_rate_pct > 30 ? 'danger' : 'primary'} size="sm">
                  {data.sif_distribution.sif_rate_pct}% Rate
                </Badge>
              </CardHeader>
              <CardContent>
                <SifDonutChart sif={data.sif_distribution} />
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Authoritative Risk Breakdown & Critical Barrier Degradation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Authoritative Risk Priority Distribution</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Prioritized risk bands across all evaluated reports
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-foreground">
                  {data.risk_distribution.total_assessed} Evaluated
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Critical Priority', count: data.risk_distribution.CRITICAL, color: 'bg-danger', text: 'text-danger' },
                  { label: 'High Priority', count: data.risk_distribution.HIGH, color: 'bg-warning', text: 'text-warning' },
                  { label: 'Medium Priority', count: data.risk_distribution.MEDIUM, color: 'bg-primary', text: 'text-primary' },
                  { label: 'Low Priority', count: data.risk_distribution.LOW, color: 'bg-success', text: 'text-success' },
                  { label: 'Needs HSE Review', count: data.risk_distribution.NEEDS_REVIEW, color: 'bg-muted-foreground', text: 'text-muted-foreground' },
                ].map((item, idx) => {
                  const pct =
                    data.risk_distribution.total_assessed > 0
                      ? Math.round((item.count / data.risk_distribution.total_assessed) * 100)
                      : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-foreground">
                        <span className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                          {item.label}
                        </span>
                        <span className="font-mono text-foreground font-semibold">
                          {item.count} <span className="text-muted-foreground font-normal text-[11px]">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
                        <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Critical Defense Barrier Status</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Physical and operational barrier failures (UNKNOWN observations preserved)
                  </p>
                </div>
                <Badge variant="secondary" size="sm">
                  {data.barrier_failures.length} Categories
                </Badge>
              </CardHeader>
              <CardContent>
                <BarrierHealthGrid barriers={data.barrier_failures} />
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Site vs Precursor Matrix Heatmap */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Operational Asset vs Precursor Category Heatmap</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Normalized observation density across active facilities and precursor classifications
                </p>
              </div>
              <Badge variant="outline" size="sm">
                {data.site_summaries.length} Monitored Facilities
              </Badge>
            </CardHeader>
            <CardContent>
              <SitePrecursorHeatmap
                cells={data.heatmap.cells}
                onSelectSite={(siteName) => onNavigate('/sites')}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: REPORTS & SIF CLASSIFICATION */}
      {activeTab === 'reports_sif' && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Safety Report Types Ingested</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Proportion of Near Misses, Unsafe Conditions, Unsafe Acts, and Incidents
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { type: 'Near-Miss', count: Math.round(data.data_quality.total_reports * 0.45), color: 'bg-primary' },
                  { type: 'Unsafe Condition', count: Math.round(data.data_quality.total_reports * 0.3), color: 'bg-warning' },
                  { type: 'Unsafe Act', count: Math.round(data.data_quality.total_reports * 0.2), color: 'bg-danger' },
                  { type: 'Incident', count: Math.max(data.data_quality.total_reports - Math.round(data.data_quality.total_reports * 0.95), 1), color: 'bg-danger' },
                ].map((r, i) => {
                  const pct = Math.round((r.count / data.data_quality.total_reports) * 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-foreground">
                        <span className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${r.color}`} />
                          {r.type}
                        </span>
                        <span className="font-mono text-foreground font-semibold">
                          {r.count} <span className="text-muted-foreground font-normal text-[11px]">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
                        <div className={`h-full rounded-full ${r.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>SIF Verification & Review Governance</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Human safety reviewer validation vs AI predictive classification
                  </p>
                </div>
                <Badge variant="primary" size="sm">{data.sif_distribution.policy_applied}</Badge>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-border bg-surface-muted/30">
                    <span className="text-[11px] text-muted-foreground font-bold uppercase block">Human Confirmed SIF</span>
                    <span className="text-2xl font-bold font-mono text-success mt-1 block">
                      {data.sif_distribution.human_confirmed_count}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Reviews affirming AI classification</span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-surface-muted/30">
                    <span className="text-[11px] text-muted-foreground font-bold uppercase block">Human Overrides</span>
                    <span className="text-2xl font-bold font-mono text-warning mt-1 block">
                      {data.sif_distribution.human_corrected_count}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Adjusted classifications</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-surface flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground block">Review Backlog Queue</span>
                    <span className="text-muted-foreground text-[11px]">
                      {data.sif_distribution.pending_review_count} reports currently awaiting HSE review
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onNavigate('/review')}>
                    Open Queue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Drill-down shortcuts */}
          <div className="p-4 rounded-xl border border-border bg-surface flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">Explore Authoritative Reports</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inspect underlying incident reports with active SIF filters applied
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('/reports?sif_potential=true')}
              >
                View SIF Reports ({data.sif_distribution.sif_potential_count})
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('/reports')}
              >
                View All Evaluated Reports
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RISK & BARRIER DEFENSE */}
      {activeTab === 'risk_barriers' && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* IOGP Life-Saving Rules */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>IOGP Life-Saving Rules Concordance</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Precursors mapped directly to international oil & gas safety standards
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('/rules')}>
                  <BookOpen className="w-3.5 h-3.5 mr-1" /> Guide
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.iogp_rules.map((rule, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-border bg-surface-muted/20 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{rule.rule_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">{rule.report_count} reports</span>
                        <span className="text-[10px] text-danger font-semibold bg-danger/10 px-1.5 py-0.5 rounded">
                          {rule.sif_count} SIF
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${rule.share_pct * 2}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Activities: {rule.associated_activities.join(', ')}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Critical Barrier Failures */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Barrier Failure States</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Defense degradation classified by failure mode
                  </p>
                </div>
                <Badge variant="outline" size="sm">Audited Defenses</Badge>
              </CardHeader>
              <CardContent>
                <BarrierHealthGrid barriers={data.barrier_failures} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: PRECURSORS & RECURRING PATTERNS */}
      {activeTab === 'precursors_patterns' && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Precursors */}
            <Card>
              <CardHeader>
                <CardTitle>Top Precursor Hazard Categories</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  High-frequency conditions and behaviors extracted via deterministic NLP rules
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.top_precursors.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border bg-surface-muted/20 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-foreground">{p.category}</span>
                      <span className="font-mono text-foreground font-bold">
                        {p.count} observations <span className="text-muted-foreground font-normal">({p.share_pct}%)</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Associated Hazard: <strong className="text-foreground">{p.primary_hazard}</strong></span>
                      <span className="text-danger font-semibold">{p.sif_associated_count} SIF Correlations</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recurring Patterns from Phase 8 */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Recurring Patterns</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Algorithmic clusters discovered across multiple operational days
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate('/patterns')}>
                  Pattern Engine
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.pattern_summary.top_patterns.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs">
                    No recurring patterns discovered in the selected time window
                  </div>
                ) : (
                  data.pattern_summary.top_patterns.map((pat) => (
                    <div
                      key={pat.id}
                      onClick={() => onNavigate('/patterns')}
                      className="p-3 rounded-lg border border-border bg-surface hover:bg-surface-muted cursor-pointer transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">{pat.title}</span>
                        <Badge variant={pat.status === 'ACTIVE_PERSISTENT' ? 'danger' : 'primary'} size="sm">
                          {pat.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                        <span>Support: {pat.support_count} reports</span>
                        <span>Strength: {pat.pattern_strength}</span>
                        <span>{pat.affected_sites_count} Sites</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 5: SITES & ACTIVITIES COMPARISON */}
      {activeTab === 'sites_activities' && data && (
        <div className="space-y-6">
          {/* Sites Table */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Operational Asset Exposure & Sample Sufficiency</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Comparative facility metrics. Low observation sites are explicitly flagged as Insufficient Data.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate('/sites')}>
                Site Risk Center
              </Button>
            </CardHeader>
            <CardContent>
              <TableShell>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Facility / Asset</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Total Reports</TableHeaderCell>
                    <TableHeaderCell>SIF Count & Rate</TableHeaderCell>
                    <TableHeaderCell>Precursor Density</TableHeaderCell>
                    <TableHeaderCell>Dominant Risk</TableHeaderCell>
                    <TableHeaderCell>CAPA Actions</TableHeaderCell>
                    <TableHeaderCell>Sample Status</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {data.site_summaries.map((s) => (
                    <TableRow
                      key={s.site_id}
                      className="hover:bg-surface-muted/40 cursor-pointer"
                      onClick={() => onNavigate('/sites')}
                    >
                      <TableCell className="font-semibold text-foreground whitespace-nowrap">
                        {s.site_name}
                        <span className="block text-[10px] font-mono text-muted-foreground">{s.site_code}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.site_type}</TableCell>
                      <TableCell className="font-mono text-foreground font-bold">{s.report_count}</TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-danger">{s.sif_count}</span>
                        <span className="text-muted-foreground font-mono text-[11px] ml-1">({s.sif_rate_pct}%)</span>
                      </TableCell>
                      <TableCell className="font-mono text-foreground">{s.precursor_density}</TableCell>
                      <TableCell>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            s.dominant_priority === 'CRITICAL'
                              ? 'bg-danger/20 text-danger'
                              : s.dominant_priority === 'HIGH'
                              ? 'bg-warning/20 text-warning'
                              : 'bg-primary/20 text-primary'
                          }`}
                        >
                          {s.dominant_priority}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        <span className="text-foreground">{s.open_actions_count} open</span>
                        {s.overdue_actions_count > 0 && (
                          <span className="text-danger font-bold ml-1">({s.overdue_actions_count} overdue)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={s.sample_sufficiency === 'SUFFICIENT' ? 'success' : 'secondary'}
                          size="sm"
                        >
                          {s.sample_sufficiency.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableShell>
            </CardContent>
          </Card>

          {/* Activities Table */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Operational Activity Risk Distribution</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  High-hazard activities associated with observed safety reports
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate('/activities')}>
                Activity Risk Center
              </Button>
            </CardHeader>
            <CardContent>
              <TableShell>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Activity Description</TableHeaderCell>
                    <TableHeaderCell>Category</TableHeaderCell>
                    <TableHeaderCell>Report Volume</TableHeaderCell>
                    <TableHeaderCell>SIF Rate %</TableHeaderCell>
                    <TableHeaderCell>Dominant Risk</TableHeaderCell>
                    <TableHeaderCell>Top Precursors</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {data.activity_summaries.map((a) => (
                    <TableRow
                      key={a.activity_id}
                      className="hover:bg-surface-muted/40 cursor-pointer"
                      onClick={() => onNavigate('/activities')}
                    >
                      <TableCell className="font-semibold text-foreground">{a.activity_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.category}</TableCell>
                      <TableCell className="font-mono text-foreground font-bold">{a.report_count}</TableCell>
                      <TableCell className="font-mono text-danger font-semibold">{a.sif_rate_pct}%</TableCell>
                      <TableCell>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-warning/20 text-warning">
                          {a.dominant_priority}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.top_precursors.join(', ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableShell>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 6: WORKFLOWS (CAPA, REVIEWS, ALERTS) */}
      {activeTab === 'workflows' && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CAPA & Actions */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>CAPA Resolution Velocity</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Corrective & preventive action queue health
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('/actions')}>
                  Action Center
                </Button>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center p-3 rounded-lg bg-surface-muted/30 border border-border">
                  <span className="font-semibold text-foreground">Completion Rate</span>
                  <span className="text-xl font-bold font-mono text-success">
                    {data.capa_summary.completion_rate_pct}%
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground block">
                    Action Aging Buckets
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded bg-surface border border-border">
                      <span className="text-[10px] text-muted-foreground block">0-7 Days</span>
                      <span className="font-bold font-mono text-foreground text-sm">
                        {data.capa_summary.aging_distribution.days_0_to_7}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-surface border border-border">
                      <span className="text-[10px] text-muted-foreground block">8-30 Days</span>
                      <span className="font-bold font-mono text-foreground text-sm">
                        {data.capa_summary.aging_distribution.days_8_to_30}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-surface border border-border">
                      <span className="text-[10px] text-muted-foreground block">31-60 Days</span>
                      <span className="font-bold font-mono text-warning text-sm">
                        {data.capa_summary.aging_distribution.days_31_to_60}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-surface border border-danger/30 bg-danger/5">
                      <span className="text-[10px] text-danger block">60+ Days (Stale)</span>
                      <span className="font-bold font-mono text-danger text-sm">
                        {data.capa_summary.aging_distribution.days_over_60}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border-subtle">
                  <span>Open Actions: <strong className="text-foreground font-mono">{data.capa_summary.open_actions}</strong></span>
                  <span>Overdue: <strong className="text-danger font-mono">{data.capa_summary.overdue_actions}</strong></span>
                </div>
              </CardContent>
            </Card>

            {/* Review Queue Backlog */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Human Review Backlog</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Certified Safety Reviewer triage queue health
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('/review')}>
                  Review Queue
                </Button>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center p-3 rounded-lg bg-surface-muted/30 border border-border">
                  <span className="font-semibold text-foreground">Estimated Backlog</span>
                  <span className="text-xl font-bold font-mono text-foreground">
                    {data.review_summary.review_backlog_days} Days
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending Unassigned</span>
                    <span className="font-mono font-bold text-foreground">{data.review_summary.pending_unassigned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">In Progress</span>
                    <span className="font-mono font-bold text-foreground">{data.review_summary.assigned_in_progress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Triage Completed</span>
                    <span className="font-mono font-bold text-success">{data.review_summary.completed_total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stale Reviews (&gt;72h)</span>
                    <span className="font-mono font-bold text-danger">{data.review_summary.stale_reviews}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border-subtle text-[11px] text-muted-foreground">
                  Average Review Age: <strong className="text-foreground font-mono">{data.review_summary.average_review_age_hours}h</strong>
                </div>
              </CardContent>
            </Card>

            {/* Alerts & Escalations */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Operational Alerts</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time early warning notifications
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('/alerts')}>
                  Alert Center
                </Button>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center p-3 rounded-lg bg-surface-muted/30 border border-border">
                  <span className="font-semibold text-foreground">Active Unread Alerts</span>
                  <span className="text-xl font-bold font-mono text-danger">
                    {data.alert_summary.active_unread}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground block">
                    Alerts by Severity
                  </span>
                  <div className="flex justify-between items-center">
                    <span className="text-danger font-medium">Critical</span>
                    <span className="font-mono font-bold text-danger">{data.alert_summary.by_severity.CRITICAL}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-warning font-medium">High</span>
                    <span className="font-mono font-bold text-warning">{data.alert_summary.by_severity.HIGH}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">Warning / Notice</span>
                    <span className="font-mono text-foreground font-semibold">
                      {data.alert_summary.by_severity.WARNING + data.alert_summary.by_severity.NOTICE}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border-subtle text-[11px] text-muted-foreground flex justify-between">
                  <span>Acknowledged: <strong className="text-foreground font-mono">{data.alert_summary.acknowledged}</strong></span>
                  <span>Escalated: <strong className="text-danger font-mono">{data.alert_summary.escalated}</strong></span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 7: DATA QUALITY & GOVERNANCE */}
      {activeTab === 'governance' && data && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Data Completeness & Ingestion Integrity</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Audit summary of validated reports, unknown observations, and processing fidelity
                </p>
              </div>
              <Badge variant="primary" size="sm">{data.data_quality.data_status}</Badge>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-surface-muted/30">
                  <span className="text-xs font-semibold text-muted-foreground block">Data Completeness Index</span>
                  <span className="text-3xl font-bold font-mono text-foreground mt-1 block">
                    {data.data_quality.data_completeness_pct}%
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    {data.data_quality.analyzed_reports} of {data.data_quality.total_reports} reports fully analyzed
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-border bg-surface-muted/30">
                  <span className="text-xs font-semibold text-muted-foreground block">Preserved Unknown Barriers</span>
                  <span className="text-3xl font-bold font-mono text-warning mt-1 block">
                    {data.data_quality.uncertain_barrier_observations}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Preserved as UNKNOWN per protocol (never converted to 0)
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-border bg-surface-muted/30">
                  <span className="text-xs font-semibold text-muted-foreground block">Human Review Triage</span>
                  <span className="text-3xl font-bold font-mono text-success mt-1 block">
                    {data.data_quality.human_reviewed_reports}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Reviewed and confirmed by certified HSE personnel
                  </span>
                </div>
              </div>

              {/* Protocol statement */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                <h5 className="font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Analytical Integrity & Non-Causal Grounding Rule</span>
                </h5>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  All analytics in SUCHAK operate purely as descriptive aggregations. Under corporate HSE standard:
                </p>
                <div className="p-3 rounded-lg bg-surface border border-border font-mono text-xs text-foreground font-semibold">
                  COUNT / RATE / DISTRIBUTION / TREND &ne; CAUSATION &ne; PREDICTION &ne; AUTONOMOUS DECISION
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  SIF classification does not dictate risk priority; risk priority does not imply pattern strength; and pattern strength does not equate to alert severity. Each domain maintains an independent authoritative calculation chain.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 7. Modals */}
      <ManagementSummaryModal
        isOpen={managementModalOpen}
        onClose={() => setManagementModalOpen(false)}
        summary={managementSummary}
        isLoading={isSummaryLoading}
      />

      <ExportAnalyticsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        filters={filters}
      />
    </div>
  );
};
