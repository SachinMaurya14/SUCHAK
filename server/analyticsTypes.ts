/**
 * Phase 12 - Advanced HSE Analytics, Executive Intelligence & Reporting
 * Server Analytics Data Contracts & Metric Definitions
 */

export const ANALYTICS_SCHEMA_VERSION = 'ANALYTICS_V1';
export const METRIC_DEFINITION_VERSION = '2026.1';

export type TimeWindowPreset = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';
export type ReviewedStatePolicy = 'LATEST_REVIEWED' | 'ORIGINAL_AI';

export interface AnalyticsDateRange {
  start_date?: string; // ISO string
  end_date?: string;   // ISO string
  window_preset: TimeWindowPreset;
}

export interface AnalyticsFilterOptions {
  organization_id?: string;
  time_window?: TimeWindowPreset;
  start_date?: string;
  end_date?: string;
  site_id?: string;
  activity_id?: string;
  report_type?: string;
  sif_status?: 'SIF_POTENTIAL' | 'NON_SIF_POTENTIAL' | 'NEEDS_REVIEW' | 'ALL';
  risk_priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'NEEDS_REVIEW' | 'ALL';
  reviewed_state_policy?: ReviewedStatePolicy;
}

export interface MetricDefinition {
  metric_id: string;
  display_name: string;
  definition: string;
  authoritative_source: string;
  calculation_formula: string;
  unit: string;
  is_rate: boolean;
  notes?: string;
}

export interface MetricChange {
  current_value: number;
  previous_value: number;
  absolute_change: number;
  percentage_change: number | null; // null if previous is 0
  direction: 'INCREASE' | 'DECREASE' | 'UNCHANGED' | 'NEW_BASELINE';
  label: string; // e.g., "+20.0%", "No prior-period baseline", "Unchanged"
}

export interface KPICardData {
  metric_id: string;
  label: string;
  value: number;
  formatted_value: string;
  unit?: string;
  comparison?: MetricChange;
  definition: string;
  authoritative_source: string;
  drill_down_path: string;
  drill_down_label: string;
}

export interface DataQualitySummary {
  total_reports: number;
  analyzed_reports: number;
  pending_analysis_reports: number;
  human_reviewed_reports: number;
  uncertain_barrier_observations: number;
  uncertain_iogp_mappings: number;
  data_completeness_pct: number;
  data_status: 'SYNTHETIC_DEMO' | 'APPROVED_PROTOCOL';
  disclaimer: string;
}

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD or Month label
  timestamp: string;
  total_reports: number;
  sif_potential: number;
  non_sif_potential: number;
  high_critical_risk: number;
  alerts_count?: number;
  actions_completed?: number;
}

export interface SifDistributionMetrics {
  sif_potential_count: number;
  non_sif_potential_count: number;
  needs_review_count: number;
  total_analyzed: number;
  sif_rate_pct: number;
  policy_applied: ReviewedStatePolicy;
  human_confirmed_count: number;
  human_corrected_count: number;
  pending_review_count: number;
}

export interface RiskDistributionMetrics {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
  NEEDS_REVIEW: number;
  total_assessed: number;
  high_critical_count: number;
  high_critical_pct: number;
  average_score: number;
}

export interface PrecursorMetricItem {
  category: string;
  count: number;
  share_pct: number;
  sif_associated_count: number;
  primary_hazard: string;
}

export interface BarrierMetricItem {
  barrier_category: string;
  observed_state: 'FAILED' | 'BYPASSED' | 'INADEQUATE' | 'UNKNOWN' | 'NOT_VERIFIED';
  count: number;
  share_pct: number;
  affected_sites: string[];
}

export interface IogpRuleMetricItem {
  rule_name: string;
  report_count: number;
  share_pct: number;
  sif_count: number;
  associated_activities: string[];
}

export interface SiteAnalyticsItem {
  site_id: string;
  site_code: string;
  site_name: string;
  site_type: string;
  report_count: number;
  sif_count: number;
  sif_rate_pct: number;
  precursor_density: number;
  dominant_priority: string;
  recurring_patterns_count: number;
  open_actions_count: number;
  overdue_actions_count: number;
  pending_reviews_count: number;
  sample_sufficiency: 'SUFFICIENT' | 'INSUFFICIENT_DATA';
}

export interface ActivityAnalyticsItem {
  activity_id: string;
  activity_code: string;
  activity_name: string;
  category: string;
  report_count: number;
  sif_count: number;
  sif_rate_pct: number;
  dominant_priority: string;
  top_precursors: string[];
  sample_sufficiency: 'SUFFICIENT' | 'INSUFFICIENT_DATA';
}

export interface PatternAnalyticsMetrics {
  total_patterns: number;
  active_emerging: number;
  active_persistent: number;
  inactive_archived: number;
  top_patterns: Array<{
    id: string;
    title: string;
    pattern_type: string;
    status: string;
    support_count: number;
    pattern_strength: number;
    affected_sites_count: number;
    first_seen_at: string;
    last_seen_at: string;
  }>;
}

export interface ReviewAnalyticsMetrics {
  total_in_queue: number;
  pending_unassigned: number;
  assigned_in_progress: number;
  completed_total: number;
  confirmed_ai: number;
  corrected_ai: number;
  rejected_ai: number;
  stale_reviews: number;
  average_review_age_hours: number;
  review_backlog_days: number;
}

export interface CapaAnalyticsMetrics {
  total_actions: number;
  open_actions: number;
  assigned_actions: number;
  in_progress_actions: number;
  verification_required_actions: number;
  verified_actions: number;
  closed_actions: number;
  overdue_actions: number;
  reopened_actions: number;
  completion_rate_pct: number; // closed/verified / (total non-cancelled)
  aging_distribution: {
    days_0_to_7: number;
    days_8_to_30: number;
    days_31_to_60: number;
    days_over_60: number;
  };
}

export interface AlertAnalyticsMetrics {
  total_alerts: number;
  active_unread: number;
  acknowledged: number;
  resolved: number;
  escalated: number;
  dismissed: number;
  by_severity: {
    CRITICAL: number;
    HIGH: number;
    WARNING: number;
    NOTICE: number;
    INFO: number;
  };
  by_category: Record<string, number>;
}

export interface HeatmapCell {
  x_label: string; // e.g. Site Name
  y_label: string; // e.g. Precursor Category
  value: number;   // Report count
  intensity: number; // 0 to 1 normalized
}

export interface AnalyticsOverviewResponse {
  schema_version: string;
  metric_version: string;
  generated_at: string;
  period: {
    start: string;
    end: string;
    preset: TimeWindowPreset;
    previous_start?: string;
    previous_end?: string;
  };
  filters: AnalyticsFilterOptions;
  kpi_strip: KPICardData[];
  sif_distribution: SifDistributionMetrics;
  risk_distribution: RiskDistributionMetrics;
  top_precursors: PrecursorMetricItem[];
  barrier_failures: BarrierMetricItem[];
  iogp_rules: IogpRuleMetricItem[];
  site_summaries: SiteAnalyticsItem[];
  activity_summaries: ActivityAnalyticsItem[];
  pattern_summary: PatternAnalyticsMetrics;
  review_summary: ReviewAnalyticsMetrics;
  capa_summary: CapaAnalyticsMetrics;
  alert_summary: AlertAnalyticsMetrics;
  trend_series: TimeSeriesPoint[];
  heatmap: {
    x_axis: string;
    y_axis: string;
    cells: HeatmapCell[];
  };
  data_quality: DataQualitySummary;
  deterministic_summary: string;
  methodology_statement: string;
}

export interface ManagementReportSummary {
  report_id: string;
  organization_id: string;
  generated_at: string;
  reporting_period: {
    start_date: string;
    end_date: string;
    preset: string;
  };
  headline_metrics: {
    total_reports: number;
    sif_potential_count: number;
    high_critical_risk_count: number;
    recurring_patterns_count: number;
    open_actions_count: number;
    overdue_actions_count: number;
    pending_reviews_count: number;
    active_alerts_count: number;
  };
  sif_distribution: SifDistributionMetrics;
  top_precursor_clusters: Array<{ name: string; count: number; share_pct: number }>;
  barrier_defense_health: Array<{ barrier: string; failure_count: number; state: string }>;
  capa_status: {
    open: number;
    overdue: number;
    completed: number;
    completion_rate_pct: number;
  };
  data_quality: DataQualitySummary;
  disclaimer: string;
}
