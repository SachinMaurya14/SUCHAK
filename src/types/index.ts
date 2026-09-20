/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Core Type Definitions - Phase 1 Foundation
 */

export type UserRole = 
  | 'OrgAdmin'
  | 'HSEOfficer'
  | 'SafetyReviewer'
  | 'SiteManager';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  siteAccess: string[];
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type ReportType = 
  | 'Unsafe Act'
  | 'Unsafe Condition'
  | 'Near-Miss'
  | 'Incident';

export type ProcessingStatus = 
  | 'Pending'
  | 'Processing'
  | 'Classified'
  | 'Failed'
  | 'ANALYZED'
  | 'ANALYSIS_FAILED'
  | 'REVIEW_REQUIRED'
  | 'SUBMITTED'
  | 'DRAFT';

export type ReviewStatus = 
  | 'Unreviewed'
  | 'Under Review'
  | 'Verified SIF'
  | 'Overridden Non-SIF'
  | 'Action Assigned'
  | 'Closed';

export type SifPotential = 'SIF_POTENTIAL' | 'NON_SIF' | 'INCONCLUSIVE';

export type RiskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Normalized Report Data Contract
 */
export interface SafetyReport {
  id: string;
  reportNumber?: string;
  organizationId: string;
  siteId: string;
  siteName: string;
  location: string;
  activity: string;
  reportType: ReportType;
  dateTime: string;
  reporter?: {
    anonymous: boolean;
    name?: string;
    department?: string;
    role?: string;
  };
  description: string;
  actualOutcome?: string;
  attachments?: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    url?: string;
  }[];
  processingStatus: ProcessingStatus;
  reviewStatus: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  latestAnalysis?: BackendAnalysisResponse | null;
  latestRiskAssessment?: RiskAssessmentResponse | null;
}

export type PriorityBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'NEEDS_REVIEW';
export type FactorEvidenceStatus = 'PRESENT' | 'NOT_PRESENT' | 'UNKNOWN';
export type EvidenceStrength = 'STRONG' | 'MODERATE' | 'WEAK' | 'INSUFFICIENT';

export interface RiskFactorEvaluation {
  key: string;
  name: string;
  status: FactorEvidenceStatus;
  raw_score: number;
  weight: number;
  contribution: number;
  evidence: string;
  notes?: string;
}

export interface RiskAssessmentResponse {
  id: string;
  report_id: string;
  analysis_id?: string | null;
  risk_policy_version_id: string;
  policy_version: string;
  score: number;
  priority: PriorityBand;
  status: 'COMPLETED' | 'NEEDS_REVIEW' | 'RISK_ASSESSMENT_UNAVAILABLE';
  evidence_strength: EvidenceStrength;
  evidence_summary: string[];
  factor_breakdown: RiskFactorEvaluation[];
  explanation: string;
  calculated_at: string;
  sample_sufficiency?: 'SUFFICIENT' | 'INSUFFICIENT_DATA';
}

export interface SiteRiskAggregation {
  site_id: string;
  site_name: string;
  site_code: string;
  site_type: string;
  total_reports: number;
  sif_reports: number;
  sif_precursor_density: number;
  sif_precursor_density_pct: number;
  average_score: number;
  priority_distribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
    NEEDS_REVIEW: number;
  };
  dominant_priority: PriorityBand;
  sample_count: number;
  sample_sufficiency: 'SUFFICIENT' | 'INSUFFICIENT_DATA';
  time_window: {
    start_date?: string;
    end_date?: string;
    window_preset?: string;
  };
  metric_disclaimer: string;
}

export interface ActivityRiskAggregation {
  activity_id: string;
  activity_name: string;
  activity_code: string;
  category: string;
  total_reports: number;
  sif_reports: number;
  sif_precursor_density: number;
  sif_precursor_density_pct: number;
  average_score: number;
  priority_distribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
    NEEDS_REVIEW: number;
  };
  dominant_priority: PriorityBand;
  sample_count: number;
  sample_sufficiency: 'SUFFICIENT' | 'INSUFFICIENT_DATA';
  time_window: {
    start_date?: string;
    end_date?: string;
    window_preset?: string;
  };
  metric_disclaimer: string;
}

export interface BackendAnalysisResponse {
  id: string;
  report_id: string;
  model_version_id?: string | null;
  status: string;
  classification: 'SIF_POTENTIAL' | 'NON_SIF_POTENTIAL' | 'NEEDS_REVIEW';
  sif_potential?: boolean | null;
  confidence_estimate: number;
  confidence_band: 'LOW' | 'MEDIUM' | 'HIGH';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  safety_indicators: string[];
  hazards: string[];
  precursor_summary?: string | null;
  evidence: string[];
  actual_outcome?: string | null;
  potential_consequence?: string | null;
  explanation?: string | null;
  model_name?: string | null;
  model_version?: string | null;
  prompt_version?: string | null;
  analyzed_at?: string | null;
  created_at: string;
}

/**
 * Normalized AI Analysis Result Contract
 */
export interface AnalysisResult {
  report_id: string;
  sif_potential: SifPotential;
  confidence: number;
  priority: RiskPriority;
  sif_score: number;
  life_saving_rules: {
    rule_id: string;
    rule_name: string;
    relevance_score: number;
    icon?: string;
  }[];
  hazards: string[];
  precursors: string[];
  activity: string;
  location: string;
  barrier_failures: string[];
  evidence: {
    text_snippet: string;
    signal_type: string;
    weight: number;
  }[];
  explanation: string;
  similar_reports: {
    report_id: string;
    similarity_score: number;
    title: string;
  }[];
  pattern_ids: string[];
  model_version: string;
  analysis_timestamp: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  iconName: string;
  badge?: string;
  section: 'PRIMARY' | 'INTELLIGENCE' | 'HSE WORKFLOW' | 'DATA' | 'ADMIN';
  rolesAllowed?: UserRole[];
}

export interface HealthCheckResponse {
  status: string;
  app?: string;
  version?: string;
  phase?: string;
  architecture?: string;
  timestamp?: string;
}

export interface SimilarReportItem {
  report_id: string;
  report_number: string;
  report_type: string;
  site_id: string;
  site_name: string;
  activity_name: string;
  report_datetime: string;
  description_snippet: string;
  similarity: number; // 0.00 - 1.00
  similarity_label: string;
  why_similar: string[];
  explanation_summary: string;
}

export interface SimilarReportsResponse {
  source_report: any;
  similar_reports: SimilarReportItem[];
  model: string;
  total_found: number;
  disclaimer: string;
}

export interface SemanticSearchResponse {
  query: string;
  total_matches: number;
  top_k: number;
  filters_applied: Record<string, any>;
  results: SimilarReportItem[];
  execution_time_ms: number;
  model: string;
  disclaimer: string;
}

export interface VectorHealthResponse {
  status: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  backend: string;
  index_loaded: boolean;
  index_version: string;
  total_vectors: number;
  dimension: number;
  embedding_model: string;
  last_rebuilt_at: string | null;
  persistence_path: string;
}

export interface VectorConsistencyResponse {
  is_consistent: boolean;
  total_reports_expected: number;
  total_vectors_indexed: number;
  missing_vectors: string[];
  orphaned_vectors: string[];
  stale_vectors: string[];
  model_mismatches: string[];
}

export interface ReportEmbeddingMetadata {
  report_id: string;
  report_number: string;
  status: 'NOT_INDEXED' | 'INDEXING' | 'INDEXED' | 'INDEX_FAILED' | 'STALE';
  content_hash: string | null;
  document_version: string | null;
  model_name: string;
  dimension: number;
  vector_preview: number[];
  created_at: string | null;
  updated_at: string | null;
  semantic_document_text: string | null;
}

/**
 * Phase 8: Recurring Precursor Pattern Discovery Types
 */
export type PatternStatus =
  | 'INSUFFICIENT_SUPPORT'
  | 'CANDIDATE'
  | 'RECURRING'
  | 'EMERGING'
  | 'PERSISTENT'
  | 'INACTIVE';

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
  similarity_to_centroid: number;
  membership_score: number;
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
  period: string;
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
  trend_description: string;
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
  pattern_number: string;
  organization_id: string;
  pattern_type: PatternType;
  title: string;
  summary: string;
  status: PatternStatus;
  pattern_strength: number;
  support_count: number;
  unique_date_count: number;
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
  discovery_run_id: string;
  discovery_version: string;
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

export interface DiscoveryRun {
  run_id: string;
  organization_id: string;
  start_time: string;
  end_time: string | null;
  algorithm_version: string;
  configuration: {
    min_support: number;
    min_unique_dates: number;
    semantic_similarity_threshold: number;
    time_window_preset: string;
  };
  input_reports_count: number;
  eligible_reports_count: number;
  patterns_discovered: number;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
  error_message?: string;
  duration_ms?: number;
}


