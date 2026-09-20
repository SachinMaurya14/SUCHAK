/**
 * Phase 12 - Advanced HSE Analytics, Executive Intelligence & Reporting
 * Frontend Client Service
 */

import { apiClient } from './apiClient.ts';
import {
  AnalyticsFilterOptions,
  AnalyticsOverviewResponse,
  ManagementReportSummary,
  TimeSeriesPoint,
  SifDistributionMetrics,
  RiskDistributionMetrics,
  PrecursorMetricItem,
  BarrierMetricItem,
  IogpRuleMetricItem,
  SiteAnalyticsItem,
  ActivityAnalyticsItem,
  PatternAnalyticsMetrics,
  ReviewAnalyticsMetrics,
  CapaAnalyticsMetrics,
  AlertAnalyticsMetrics,
  KPICardData,
} from '../types/analytics.ts';

function buildQueryString(options: AnalyticsFilterOptions = {}): string {
  const params = new URLSearchParams();
  if (options.organization_id) params.set('organization_id', options.organization_id);
  if (options.time_window) params.set('time_window', options.time_window);
  if (options.start_date) params.set('start_date', options.start_date);
  if (options.end_date) params.set('end_date', options.end_date);
  if (options.site_id && options.site_id !== 'ALL') params.set('site_id', options.site_id);
  if (options.activity_id && options.activity_id !== 'ALL') params.set('activity_id', options.activity_id);
  if (options.report_type && options.report_type !== 'ALL') params.set('report_type', options.report_type);
  if (options.sif_status && options.sif_status !== 'ALL') params.set('sif_status', options.sif_status);
  if (options.risk_priority && options.risk_priority !== 'ALL') params.set('risk_priority', options.risk_priority);
  if (options.reviewed_state_policy) params.set('reviewed_state_policy', options.reviewed_state_policy);

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const analyticsService = {
  /**
   * Fetch complete executive analytics overview
   */
  async getOverview(options: AnalyticsFilterOptions = {}): Promise<AnalyticsOverviewResponse> {
    return apiClient<AnalyticsOverviewResponse>(`/api/v1/analytics/overview${buildQueryString(options)}`);
  },

  /**
   * Fetch report volume & status metrics
   */
  async getReportMetrics(options: AnalyticsFilterOptions = {}): Promise<{
    period: AnalyticsOverviewResponse['period'];
    filters: AnalyticsFilterOptions;
    total_reports?: KPICardData;
    trend_series: TimeSeriesPoint[];
    data_quality: AnalyticsOverviewResponse['data_quality'];
    methodology_version: string;
  }> {
    return apiClient(`/api/v1/analytics/reports${buildQueryString(options)}`);
  },

  /**
   * Fetch SIF distribution and verification statistics
   */
  async getSifMetrics(options: AnalyticsFilterOptions = {}): Promise<{
    period: AnalyticsOverviewResponse['period'];
    sif_distribution: SifDistributionMetrics;
    trend_series: Array<{ date: string; sif_potential: number; non_sif_potential: number }>;
    methodology_version: string;
  }> {
    return apiClient(`/api/v1/analytics/sif${buildQueryString(options)}`);
  },

  /**
   * Fetch Phase 6 authoritative risk priority distributions
   */
  async getRiskMetrics(options: AnalyticsFilterOptions = {}): Promise<{
    period: AnalyticsOverviewResponse['period'];
    risk_distribution: RiskDistributionMetrics;
    trend_series: Array<{ date: string; high_critical_risk: number }>;
    methodology_version: string;
  }> {
    return apiClient(`/api/v1/analytics/risk${buildQueryString(options)}`);
  },

  /**
   * Fetch precursor clustering metrics
   */
  async getPrecursorMetrics(options: AnalyticsFilterOptions = {}): Promise<{
    period: AnalyticsOverviewResponse['period'];
    precursors: PrecursorMetricItem[];
    methodology_version: string;
  }> {
    return apiClient(`/api/v1/analytics/precursors${buildQueryString(options)}`);
  },

  /**
   * Fetch barrier defense failure and degradation states
   */
  async getBarrierMetrics(options: AnalyticsFilterOptions = {}): Promise<{
    period: AnalyticsOverviewResponse['period'];
    barriers: BarrierMetricItem[];
    methodology_version: string;
  }> {
    return apiClient(`/api/v1/analytics/barriers${buildQueryString(options)}`);
  },

  /**
   * Fetch IOGP Life-Saving Rules concordance metrics
   */
  async getIogpMetrics(options: AnalyticsFilterOptions = {}): Promise<{
    period: AnalyticsOverviewResponse['period'];
    iogp_rules: IogpRuleMetricItem[];
    methodology_version: string;
  }> {
    return apiClient(`/api/v1/analytics/iogp${buildQueryString(options)}`);
  },

  /**
   * Fetch site-level summaries and sample sufficiency indicators
   */
  async getSiteMetrics(options: AnalyticsFilterOptions = {}): Promise<{
    period: AnalyticsOverviewResponse['period'];
    sites: SiteAnalyticsItem[];
    methodology_version: string;
  }> {
    return apiClient(`/api/v1/analytics/sites${buildQueryString(options)}`);
  },

  /**
   * Fetch activity-level risk and precursor correlations
   */
  async getActivityMetrics(options: AnalyticsFilterOptions = {}): Promise<{
    period: AnalyticsOverviewResponse['period'];
    activities: ActivityAnalyticsItem[];
    methodology_version: string;
  }> {
    return apiClient(`/api/v1/analytics/activities${buildQueryString(options)}`);
  },

  /**
   * Fetch recurring pattern discovery metrics
   */
  async getPatternMetrics(options: AnalyticsFilterOptions = {}): Promise<{
    period: AnalyticsOverviewResponse['period'];
    patterns: PatternAnalyticsMetrics;
    methodology_version: string;
  }> {
    return apiClient(`/api/v1/analytics/patterns${buildQueryString(options)}`);
  },

  /**
   * Fetch human HSE review queue metrics
   */
  async getReviewMetrics(options: AnalyticsFilterOptions = {}): Promise<{
    period: AnalyticsOverviewResponse['period'];
    reviews: ReviewAnalyticsMetrics;
    methodology_version: string;
  }> {
    return apiClient(`/api/v1/analytics/reviews${buildQueryString(options)}`);
  },

  /**
   * Fetch CAPA and action resolution aging metrics
   */
  async getActionMetrics(options: AnalyticsFilterOptions = {}): Promise<{
    period: AnalyticsOverviewResponse['period'];
    capa: CapaAnalyticsMetrics;
    methodology_version: string;
  }> {
    return apiClient(`/api/v1/analytics/actions${buildQueryString(options)}`);
  },

  /**
   * Fetch alert signals and severity distributions
   */
  async getAlertMetrics(options: AnalyticsFilterOptions = {}): Promise<{
    period: AnalyticsOverviewResponse['period'];
    alerts: AlertAnalyticsMetrics;
    methodology_version: string;
  }> {
    return apiClient(`/api/v1/analytics/alerts${buildQueryString(options)}`);
  },

  /**
   * Fetch time-series trend telemetry
   */
  async getTrends(options: AnalyticsFilterOptions = {}): Promise<{
    period: AnalyticsOverviewResponse['period'];
    series: TimeSeriesPoint[];
    methodology_version: string;
  }> {
    return apiClient(`/api/v1/analytics/trends${buildQueryString(options)}`);
  },

  /**
   * Generate official Management Summary Document
   */
  async generateManagementSummary(options: AnalyticsFilterOptions = {}): Promise<ManagementReportSummary> {
    return apiClient<ManagementReportSummary>(`/api/v1/analytics/management-summary${buildQueryString(options)}`);
  },

  /**
   * Export dataset as CSV file download
   */
  async exportCsv(
    datasetType: 'reports' | 'sif' | 'sites' | 'precursors' | 'capa' | 'overview',
    filters: AnalyticsFilterOptions = {}
  ): Promise<void> {
    const res = await fetch('/api/v1/analytics/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_type: datasetType, filters, format: 'csv' }),
    });

    if (!res.ok) {
      throw new Error(`Export failed: ${res.statusText}`);
    }

    const blob = await res.blob();
    const contentDisposition = res.headers.get('Content-Disposition');
    let filename = `suchak_${datasetType}_analytics_${new Date().toISOString().substring(0, 10)}.csv`;
    if (contentDisposition && contentDisposition.includes('filename="')) {
      filename = contentDisposition.split('filename="')[1].split('"')[0];
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Export overview as raw JSON
   */
  async exportJson(filters: AnalyticsFilterOptions = {}): Promise<void> {
    const res = await fetch('/api/v1/analytics/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters, format: 'json' }),
    });

    if (!res.ok) {
      throw new Error(`JSON export failed: ${res.statusText}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suchak_analytics_export_${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
