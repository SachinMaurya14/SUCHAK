/**
 * Phase 8: Precursor Pattern Discovery & Pattern Intelligence Data Contracts
 * STRICT BOUNDARY: Pattern discovery identifies recurring precursor configurations
 * supported by multiple observations. It is explicitly separate from single-report
 * semantic similarity (Phase 7) and SIF risk prioritization (Phase 6).
 */

export type PatternStatus =
  | 'INSUFFICIENT_SUPPORT' // support < min_support threshold (e.g. < 3)
  | 'CANDIDATE'            // meets support count, undergoing validation
  | 'RECURRING'            // repeated historical support across multiple dates
  | 'EMERGING'             // recent repeated support (< 45 days) with limited long-term history
  | 'PERSISTENT'           // established recurrence spanning multiple observation windows
  | 'INACTIVE';            // previously active but zero observations in recent periods

export type PatternType =
  | 'PRECURSOR_PATTERN'
  | 'ACTIVITY_PATTERN'
  | 'LOCATION_PATTERN'
  | 'BARRIER_FAILURE_PATTERN'
  | 'HAZARD_PATTERN'
  | 'ENERGY_EXPOSURE_PATTERN'
  | 'EQUIPMENT_CONTEXT_PATTERN'
  | 'LIFESAVING_RULE_PATTERN'
  | 'COMPOSITE_PATTERN';

export interface PatternFeatureRepresentation {
  report_id: string;
  report_number: string;
  organization_id: string;
  primary_precursor: string;
  related_precursors: string[];
  primary_hazard: string;
  hazards: string[];
  barrier_failures: string[];
  activity_id: string;
  activity_name: string;
  site_id: string;
  site_name: string;
  location_name: string;
  energy_context: string[];
  equipment_context: string[];
  iogp_rules: string[];
  sif_potential: boolean;
  priority_baseline: string;
  report_type: string;
  report_datetime: string;
  content_hash: string;
  vector?: number[];
}

export interface PatternMember {
  pattern_id: string;
  report_id: string;
  report_number: string;
  report_datetime: string;
  site_id: string;
  site_name: string;
  activity_id: string;
  activity_name: string;
  report_type: string;
  precursor: string;
  hazard: string;
  barrier_failure: string;
  iogp_rule: string;
  similarity_to_centroid: number; // Cosine similarity to cluster center (0.00 - 1.00)
  membership_score: number;       // Combined structured + semantic score (0.00 - 1.00)
  membership_reason: string;
  description_snippet: string;
  created_at: string;
}

export interface PatternEvidenceSummary {
  total_reports: number;
  unique_dates: number;
  distinct_sites: number;
  distinct_activities: number;
  common_precursor: string;
  common_hazard: string;
  common_barrier_failure: string;
  mapped_iogp_rules: { rule: string; count: number }[];
  traceable_evidence_bullets: string[];
}

export interface PatternTrendBucket {
  period: string;       // e.g. "2026-W37" or "2026-09"
  count: number;
  date_start: string;
  date_end: string;
}

export interface PatternTrend {
  first_seen_at: string;
  last_seen_at: string;
  span_days: number;
  recent_occurrences_30d: number;
  prior_occurrences_30d: number;
  timeline: PatternTrendBucket[];
  trend_direction: 'INCREASING' | 'STABLE' | 'DECREASING' | 'INSUFFICIENT_TIMELINE';
  trend_description: string; // Neutral description: e.g. "Observation count increased over recent 30-day window"
}

export interface PatternDistribution {
  sites: { site_id: string; site_name: string; count: number; percentage: number }[];
  activities: { activity_id: string; activity_name: string; count: number; percentage: number }[];
  hazards: { hazard: string; count: number }[];
  barrier_failures: { barrier: string; count: number }[];
  iogp_rules: { rule: string; count: number }[];
}

export interface PrecursorPattern {
  id: string;
  pattern_number: string;        // e.g. 'PAT-2026-01'
  organization_id: string;
  pattern_type: PatternType;
  title: string;                 // Evidence-grounded concise title (e.g. "Recurring Energized Maintenance Exposure")
  summary: string;
  status: PatternStatus;
  pattern_strength: number;      // 0 - 100 transparent evidence strength (NOT risk/incident probability)
  support_count: number;         // Total unique supporting reports
  unique_date_count: number;     // Number of distinct observation calendar days
  first_seen_at: string;
  last_seen_at: string;
  primary_precursor: string;
  related_precursors: string[];
  primary_hazard: string;
  related_hazards: string[];
  primary_barrier_failure: string;
  barrier_failures: string[];
  primary_activity: string;
  related_activities: string[];
  primary_site: string;
  related_sites: string[];
  energy_context: string[];
  equipment_context: string[];
  iogp_rules: string[];
  evidence_count: number;
  evidence_summary: PatternEvidenceSummary;
  trend: PatternTrend;
  distributions: PatternDistribution;
  members: PatternMember[];
  centroid_vector?: number[];
  discovery_run_id: string;
  discovery_version: string;     // e.g. 'PATTERN_DISCOVERY_V1'
  created_at: string;
  updated_at: string;
  methodology_disclaimer: string;
}

export interface PatternSummaryKPIs {
  total_patterns: number;
  recurring_patterns: number;
  emerging_patterns: number;
  persistent_patterns: number;
  inactive_patterns: number;
  insufficient_support_patterns: number;
  average_pattern_strength: number;
  distinct_precursors_tracked: number;
  active_version_id: string;
  last_run_at: string | null;
}

export interface DiscoveryConfiguration {
  min_support: number;                     // Default 3
  min_unique_dates: number;                 // Default 2
  semantic_similarity_threshold: number;   // Default 0.70
  time_window_preset: string;              // '30d' | '90d' | '180d' | '1y' | 'all'
  algorithm_version: string;               // 'PATTERN_DISCOVERY_V1'
}

export interface DiscoveryRun {
  run_id: string;
  organization_id: string;
  start_time: string;
  end_time: string | null;
  algorithm_version: string;
  configuration: DiscoveryConfiguration;
  input_reports_count: number;
  eligible_reports_count: number;
  patterns_discovered: number;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
  error_message?: string;
  duration_ms?: number;
}
