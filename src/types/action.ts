/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 10: HSE Action Center & CAPA Client Types
 */

export type ActionType = 'CORRECTIVE' | 'PREVENTIVE' | 'CONTAINMENT';

export type ActionStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'VERIFICATION_REQUIRED'
  | 'VERIFIED'
  | 'CLOSED'
  | 'REOPENED'
  | 'CANCELLED';

export type ActionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SourceFindingType =
  | 'SIF_CLASSIFICATION'
  | 'PRECURSOR'
  | 'BARRIER_FAILURE'
  | 'IOGP_MAPPING'
  | 'PATTERN'
  | 'OTHER_REVIEWED_FINDING';

export type VerificationStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'VERIFICATION_FAILED'
  | 'NOT_REQUIRED';

export type ActionEventType =
  | 'ACTION_CREATED'
  | 'ACTION_UPDATED'
  | 'ACTION_ASSIGNED'
  | 'ACTION_STARTED'
  | 'ACTION_PROGRESS_UPDATED'
  | 'ACTION_COMPLETED'
  | 'ACTION_VERIFICATION_REQUESTED'
  | 'ACTION_VERIFIED'
  | 'ACTION_VERIFICATION_FAILED'
  | 'ACTION_CLOSED'
  | 'ACTION_REOPENED'
  | 'ACTION_CANCELLED'
  | 'ACTION_COMMENTED'
  | 'ACTION_EVIDENCE_ATTACHED'
  | 'DUE_DATE_CHANGED'
  | 'OWNER_CHANGED'
  | 'PRIORITY_CHANGED';

export interface ActionActor {
  id: string;
  name: string;
  role: string;
  organization_id?: string;
}

export interface ActionComment {
  id: string;
  action_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
}

export interface ActionEvidence {
  id: string;
  action_id: string;
  file_name: string;
  media_type: string;
  file_size: number;
  evidence_type: 'IMPLEMENTATION' | 'VERIFICATION';
  description: string;
  storage_ref?: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface ActionEvent {
  id: string;
  action_id: string;
  organization_id: string;
  actor: ActionActor;
  event_type: ActionEventType;
  previous_status?: ActionStatus | null;
  new_status?: ActionStatus | null;
  details: Record<string, any>;
  created_at: string;
}

export interface ActionRecord {
  id: string;
  action_number: string;
  organization_id: string;
  action_type: ActionType;
  title: string;
  description: string;

  // Traceability
  source_report_id?: string | null;
  source_report_number?: string | null;
  source_review_id?: string | null;
  source_pattern_id?: string | null;
  source_pattern_number?: string | null;
  source_finding_type?: SourceFindingType | null;
  source_finding_summary?: string | null;

  // Operational Context
  site_id?: string | null;
  site_name?: string | null;
  location_name?: string | null;
  activity_name?: string | null;

  // Ownership
  owner_user_id?: string | null;
  owner_user_name?: string | null;
  owner_user_role?: string | null;
  owner_team_name?: string | null;
  assigned_at?: string | null;
  created_by: ActionActor;

  // Workflow Priority & State
  priority: ActionPriority;
  status: ActionStatus;
  progress_pct: number;

  // Verification
  verification_required: boolean;
  verification_status: VerificationStatus;
  verifier_user_id?: string | null;
  verifier_user_name?: string | null;
  verification_notes?: string | null;
  verified_at?: string | null;

  // Due Dates & Lifecycles
  due_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  completion_summary?: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  closure_summary?: string | null;
  reopened_at?: string | null;
  reopened_by?: string | null;
  reopen_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;

  // Overdue status
  is_overdue: boolean;
  days_overdue: number;

  comments: ActionComment[];
  evidence: ActionEvidence[];
  created_at: string;
  updated_at: string;
}

export interface ActionSummaryKPIs {
  total_actions: number;
  open_actions: number;
  assigned_actions: number;
  in_progress_actions: number;
  completed_actions: number;
  verification_required_actions: number;
  verified_actions: number;
  closed_actions: number;
  overdue_actions: number;
  reopened_actions: number;
  corrective_count: number;
  preventive_count: number;
  containment_count: number;
  average_completion_days: number;
}

export interface CreateActionPayload {
  organization_id?: string;
  action_type: ActionType;
  title: string;
  description: string;
  source_report_id?: string;
  source_report_number?: string;
  source_review_id?: string;
  source_pattern_id?: string;
  source_pattern_number?: string;
  source_finding_type?: SourceFindingType;
  source_finding_summary?: string;
  site_id?: string;
  site_name?: string;
  location_name?: string;
  activity_name?: string;
  owner_user_id?: string;
  owner_team_name?: string;
  priority: ActionPriority;
  due_at: string;
  verification_required?: boolean;
  comments?: string;
}

export interface ActionFilterParams {
  organization_id?: string;
  status?: ActionStatus | 'ALL' | 'ACTIVE_OPEN';
  priority?: ActionPriority | 'ALL';
  action_type?: ActionType | 'ALL';
  owner_id?: string;
  site_id?: string;
  source_report_id?: string;
  source_pattern_id?: string;
  overdue_only?: boolean;
  verification_required_only?: boolean;
  search?: string;
  sort_by?: 'due_at' | 'priority' | 'created_at' | 'updated_at' | 'status';
  sort_direction?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface PaginatedActionResponse {
  data: ActionRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
