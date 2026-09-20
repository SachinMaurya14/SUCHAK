/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 9: Human-in-the-Loop (HITL) HSE Review & Validation Types
 *
 * Core Principle:
 * AI generates PROPOSED SAFETY INTELLIGENCE.
 * Authorized HSE reviewer provides HUMAN VALIDATION.
 * Original AI interpretations are never silently overwritten or destroyed.
 */

export type ReviewStatus =
  | 'QUEUED'
  | 'ASSIGNED'
  | 'IN_REVIEW'
  | 'REVIEW_CONFIRMED'
  | 'REVIEW_CORRECTED'
  | 'REVIEW_REJECTED'
  | 'NEEDS_MORE_REVIEW'
  | 'STALE'
  | 'RE_REVIEW_REQUIRED';

export type ReviewDecision =
  | 'CONFIRM'
  | 'CORRECT'
  | 'REJECT'
  | 'NEEDS_MORE_REVIEW';

export type ReviewEligibilityReason =
  | 'SIF_UNCERTAIN'
  | 'INSUFFICIENT_EVIDENCE'
  | 'NEEDS_REVIEW_CLASSIFICATION'
  | 'IOGP_MAPPING_UNCERTAIN'
  | 'SAFETY_INTELLIGENCE_UNKNOWN'
  | 'RISK_FLAGGED_FOR_REVIEW'
  | 'PATTERN_ASSOCIATION_UNCERTAIN'
  | 'MANUAL_REVIEW_REQUESTED'
  | 'SOURCE_DATA_CHANGED';

export const ALLOWED_CORRECTION_FIELDS = [
  'sif_classification',
  'primary_hazard',
  'primary_precursor',
  'barrier_failure',
  'iogp_rule',
  'energy_context',
] as const;

export type AllowedCorrectionField = typeof ALLOWED_CORRECTION_FIELDS[number];

export interface ReviewSourceSnapshots {
  analysis_version: string;
  safety_intelligence_version: string;
  risk_assessment_version: string;
  pattern_version: string;
  report_updated_at: string;
  description_hash: string;
}

export interface ReviewCorrection {
  id: string;
  review_id: string;
  field: AllowedCorrectionField;
  ai_value: any;
  reviewed_value: any;
  reason: string;
  reviewer_id: string;
  reviewer_name?: string;
  created_at: string;
}

export interface ReviewComment {
  id: string;
  review_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  field_ref?: AllowedCorrectionField | 'general' | 'risk_context' | 'pattern_context';
  content: string;
  created_at: string;
}

export interface ReviewRecord {
  id: string;
  organization_id: string;
  report_id: string;
  report_number: string;
  reviewer_id: string | null;
  reviewer_name: string | null;
  reviewer_role: string | null;
  status: ReviewStatus;
  decision: ReviewDecision | null;
  eligibility_reasons: ReviewEligibilityReason[];
  reviewer_comment: string | null;
  reviewer_summary: string | null;
  corrections: ReviewCorrection[];
  comments: ReviewComment[];
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  lock_token: string | null;
  lock_acquired_at: string | null;
  review_version: string;
  source_snapshots: ReviewSourceSnapshots;
  is_stale: boolean;
  stale_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewedSafetyRecord {
  id: string;
  organization_id: string;
  report_id: string;
  review_id: string;
  review_version: string;
  decision: ReviewDecision;
  reviewed_sif_classification: string;
  reviewed_hazards: string[];
  reviewed_precursors: string[];
  reviewed_barrier_failures: string[];
  reviewed_iogp_rule: string | null;
  reviewed_energy_context: string[];
  original_ai_sif_classification: string;
  original_ai_hazards: string[];
  original_ai_precursor: string;
  original_ai_barrier_failure: string;
  original_ai_iogp_rule: string;
  corrections_count: number;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_role: string;
  reviewer_summary: string;
  is_current: boolean;
  created_at: string;
}

export interface ReviewAuditEvent {
  id: string;
  review_id: string;
  report_id: string;
  organization_id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  event_type:
    | 'REVIEW_CREATED'
    | 'REVIEW_ASSIGNED'
    | 'REVIEW_STARTED'
    | 'REVIEW_COMMENT_ADDED'
    | 'FIELD_CORRECTION_STAGED'
    | 'REVIEW_CONFIRMED'
    | 'REVIEW_CORRECTED'
    | 'REVIEW_REJECTED'
    | 'REVIEW_MORE_INFORMATION_REQUESTED'
    | 'REVIEW_REOPENED'
    | 'REVIEW_BECAME_STALE';
  details: Record<string, any>;
  created_at: string;
}

export interface ReviewSummaryKPIs {
  pending: number;
  assigned: number;
  in_review: number;
  completed: number;
  confirmed: number;
  corrected: number;
  rejected: number;
  needs_more_review: number;
  stale: number;
  total_in_queue: number;
  average_review_age_hours: number;
  human_confirmation_rate: number;
}

export interface ReviewQueueFilterOptions {
  organization_id: string;
  status?: ReviewStatus | 'ALL' | 'PENDING_ACTIONS';
  assigned_to?: string | 'UNASSIGNED' | 'ME' | 'ALL';
  current_user_id?: string;
  site_id?: string;
  activity_id?: string;
  sif_classification?: string;
  priority_band?: string;
  search_query?: string;
  sort_by?: 'oldest_pending' | 'newest_report' | 'priority' | 'review_age' | 'recently_updated';
  page?: number;
  limit?: number;
}

export interface ReviewQueueItemResponse {
  review_id: string;
  report_id: string;
  report_number: string;
  report_date: string;
  site_name: string;
  activity_name: string;
  description_snippet: string;
  status: ReviewStatus;
  decision: ReviewDecision | null;
  eligibility_reasons: ReviewEligibilityReason[];
  assigned_to: {
    id: string;
    name: string;
    role: string;
  } | null;
  ai_sif_classification: string;
  ai_confidence: number;
  ai_primary_rule: string;
  risk_priority_band: string;
  pattern_title?: string | null;
  pattern_number?: string | null;
  review_age_hours: number;
  is_stale: boolean;
  review_version: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewWorkspacePayload {
  review: ReviewRecord;
  report: {
    id: string;
    report_number: string;
    report_type: string;
    report_datetime: string;
    site_id: string;
    site_name: string;
    location_name: string;
    activity_name: string;
    description: string;
    actual_outcome?: string | null;
    source: string;
    attachments_count: number;
  };
  ai_analysis: {
    classification: string;
    confidence_estimate: number;
    explanation: string;
    safety_indicators: string[];
    risk_level: string;
    model: string;
    model_version: string;
    analyzed_at: string;
  } | null;
  safety_intelligence: {
    hazards: string[];
    precursors: string[];
    exposures: string[];
    barrier_failures: string[];
    iogp_rules: string[];
    energy_context: string[];
    equipment: string[];
    potential_consequences: string[];
  };
  risk_context: {
    priority_band: string;
    score: number;
    factors: Array<{
      key: string;
      name: string;
      status: string;
      contribution: number;
      evidence: string;
    }>;
  } | null;
  pattern_context: {
    pattern_id: string;
    pattern_number: string;
    title: string;
    status: string;
    strength: number;
    support_count: number;
    precursor: string;
    barrier_failure: string;
  } | null;
  reviewed_record: ReviewedSafetyRecord | null;
  history: ReviewRecord[];
  audit_trail: ReviewAuditEvent[];
}
