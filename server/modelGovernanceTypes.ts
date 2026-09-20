/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: AI Evaluation, Model Governance, Safety QA & Quality Gates Types
 */

export type ModelStatus =
  | 'DRAFT'
  | 'EVALUATING'
  | 'APPROVED'
  | 'REVIEW_REQUIRED'
  | 'REJECTED'
  | 'RETIRED';

export type ModelTask =
  | 'SIF_CLASSIFICATION'
  | 'SAFETY_INTELLIGENCE'
  | 'HAZARD_EXTRACTION'
  | 'BARRIER_EVALUATION'
  | 'IOGP_CONCORDANCE'
  | 'MULTI_TASK';

export type PromptStatus = 'ACTIVE' | 'DEPRECATED' | 'DRAFT';

export type DatasetType = 'BENCHMARK' | 'REGRESSION' | 'RELEASE_TEST';

export type DatasetStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';

export type ProvenanceType =
  | 'HUMAN_CURATED'
  | 'REVIEW_QUEUE_EXTRACT'
  | 'SYNTHETIC_DEMO';

export type AnnotatorAgreement =
  | 'FULL_CONSENSUS'
  | 'MAJORITY'
  | 'ANNOTATION_CONFLICT';

export type QualityGateStatus = 'PASS' | 'FAIL' | 'NOT_EVALUATED';

export type EvaluationRunStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export type ReleaseReadiness =
  | 'READY_FOR_AUTHORIZED_APPROVAL'
  | 'NOT_READY'
  | 'REVIEW_REQUIRED';

export type CorrectionCategory =
  | 'SIF_MISCLASSIFICATION'
  | 'MISSED_PRECURSOR'
  | 'WRONG_PRECURSOR'
  | 'MISSED_HAZARD'
  | 'WRONG_HAZARD'
  | 'WRONG_BARRIER'
  | 'MISSED_BARRIER'
  | 'WRONG_IOGP_MAPPING'
  | 'MISSING_EVIDENCE'
  | 'UNSUPPORTED_EVIDENCE'
  | 'SCHEMA_FAILURE'
  | 'OTHER';

export interface ModelRecord {
  model_id: string;
  provider: string;
  model_name: string;
  model_version: string;
  model_family: string;
  tasks: ModelTask[];
  status: ModelStatus;
  created_at: string;
  created_by: string;
  configuration: Record<string, any>;
  supported_schema_version: string;
  notes: string;
  latest_evaluation_id?: string | null;
  latest_evaluation_status?: EvaluationRunStatus | null;
  latest_quality_gate_status?: QualityGateStatus | null;
  release_readiness?: ReleaseReadiness | null;
  is_production_active?: boolean;
  retired_at?: string | null;
  retired_by?: string | null;
}

export interface PromptRecord {
  prompt_id: string;
  prompt_name: string;
  prompt_version: string;
  task: ModelTask;
  effective_at: string;
  status: PromptStatus;
  hash: string;
  prompt_template: string;
  supported_models: string[];
  created_by: string;
  notes: string;
}

export interface ExpectedBarrier {
  barrier_name: string;
  status: 'FAILED' | 'BYPASSED' | 'INADEQUATE' | 'FUNCTIONING' | 'UNKNOWN';
}

export interface EvaluationCase {
  case_id: string;
  dataset_id: string;
  input_text: string;
  actual_outcome?: string;
  expected_sif: 'SIF_POTENTIAL' | 'NON_SIF_POTENTIAL' | 'NEEDS_REVIEW';
  expected_precursors: string[];
  expected_hazards: string[];
  expected_exposure: string[];
  expected_barriers: ExpectedBarrier[];
  expected_iogp_mapping: string[];
  expected_priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  annotation_version: string;
  annotator_id: string;
  annotator_role: string;
  annotator_agreement: AnnotatorAgreement;
  agreement_notes?: string;
  provenance: ProvenanceType;
  is_synthetic: boolean;
  tags: string[];
}

export interface EvaluationDataset {
  dataset_id: string;
  dataset_version: string;
  name: string;
  purpose: string;
  task: ModelTask;
  description: string;
  source: string;
  provenance: ProvenanceType;
  dataset_type: DatasetType;
  record_count: number;
  cases: EvaluationCase[];
  created_at: string;
  approved_by?: string;
  status: DatasetStatus;
  organization_id?: string;
  class_distribution: {
    sif_potential: number;
    non_sif_potential: number;
    needs_review: number;
  };
}

export interface QualityGateRule {
  id: string;
  name: string;
  metric_key: string;
  operator: '>=' | '<=' | '==' | '>' | '<';
  threshold: number;
  severity: 'CRITICAL' | 'WARNING';
  rationale: string;
  is_prototype_preset: boolean;
}

export interface QualityGateEvaluation {
  rule_id: string;
  rule_name: string;
  metric_key: string;
  operator: string;
  threshold: number;
  actual_value: number | null;
  status: QualityGateStatus;
  message: string;
}

export interface ConfusionMatrix {
  actual_sif_pred_sif: number;
  actual_sif_pred_non_sif: number; // Critical False Negatives!
  actual_sif_pred_review: number;
  actual_non_sif_pred_sif: number;
  actual_non_sif_pred_non_sif: number;
  actual_non_sif_pred_review: number;
  actual_review_pred_sif: number;
  actual_review_pred_non_sif: number;
  actual_review_pred_review: number;
}

export interface SifMetrics {
  dataset_size: number;
  class_distribution: {
    sif_potential: number;
    non_sif_potential: number;
    needs_review: number;
  };
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  true_positives: number;
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
  false_negative_rate: number;
  needs_review_count: number;
  needs_review_correctly_escalated: number;
  needs_review_unnecessary_escalated: number;
  confusion_matrix: ConfusionMatrix;
}

export interface MultiLabelMetrics {
  hazard_precision: number;
  hazard_recall: number;
  hazard_f1: number;
  precursor_precision: number;
  precursor_recall: number;
  precursor_f1: number;
  barrier_precision: number;
  barrier_recall: number;
  barrier_f1: number;
  iogp_precision: number;
  iogp_recall: number;
  iogp_f1: number;
  exact_match_rate: number;
  normalized_match_rate: number;
}

export interface SchemaMetrics {
  total_responses: number;
  valid_json_count: number;
  valid_fields_count: number;
  schema_pass_rate: number;
  syntax_errors: number;
  missing_required_fields: number;
  invalid_enums: number;
}

export interface ExplanationGroundingMetrics {
  evaluated_explanations: number;
  grounded_claims_count: number;
  ungrounded_claims_count: number;
  grounding_rate: number;
}

export interface CaseEvaluationResult {
  case_id: string;
  input_summary: string;
  expected: {
    sif: string;
    hazards: string[];
    precursors: string[];
    barriers: string[];
    iogp: string[];
  };
  predicted: {
    sif: string;
    hazards: string[];
    precursors: string[];
    barriers: string[];
    iogp: string[];
    explanation?: string;
    confidence?: number;
  };
  status: 'PASS' | 'FAIL' | 'PARTIAL' | 'CASE_FAILED';
  is_false_negative_sif: boolean;
  is_false_positive_sif: boolean;
  schema_valid: boolean;
  grounding_valid: boolean;
  error_types: CorrectionCategory[];
  error_details?: string;
  latency_ms: number;
}

export interface EvaluationRun {
  evaluation_id: string;
  organization_id: string;
  dataset_id: string;
  dataset_version: string;
  dataset_name: string;
  dataset_provenance: ProvenanceType;
  dataset_type: DatasetType;
  model_id: string;
  model_version: string;
  model_name: string;
  prompt_id: string;
  prompt_version: string;
  schema_version: string;
  taxonomy_version: string;
  evaluator_version: string;
  configuration: Record<string, any>;
  evaluation_fingerprint: string;
  status: EvaluationRunStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  executed_by: { id: string; name: string; role: string };
  cancellation_reason?: string;
  sif_metrics: SifMetrics;
  multi_label_metrics: MultiLabelMetrics;
  schema_metrics: SchemaMetrics;
  grounding_metrics: ExplanationGroundingMetrics;
  case_results: CaseEvaluationResult[];
  false_negative_cases: CaseEvaluationResult[];
  quality_gate_evaluations: QualityGateEvaluation[];
  overall_quality_gate_status: QualityGateStatus;
  release_readiness: ReleaseReadiness;
  governance_decision?: {
    status: 'APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED';
    decided_by: { id: string; name: string; role: string };
    decided_at: string;
    justification: string;
  };
  performance: {
    total_cases: number;
    completed_cases: number;
    avg_latency_ms: number;
    estimated_calls: number;
    estimated_cost_usd?: number;
  };
  is_repeat_run?: boolean;
  repeated_from_id?: string;
}

export interface HumanAiComparisonSummary {
  total_reviewed_reports: number;
  human_confirmed_count: number;
  human_corrected_count: number;
  human_rejected_count: number;
  confirmation_rate: number;
  correction_rate: number;
  sif_misclassification_count: number;
  false_negative_sif_corrections: number;
  false_positive_sif_corrections: number;
  top_correction_categories: {
    category: CorrectionCategory;
    count: number;
    percentage: number;
  }[];
  recent_corrections: {
    report_id: string;
    report_number?: string;
    reviewer_name: string;
    reviewer_role: string;
    reviewed_at: string;
    ai_sif: string;
    human_sif: string;
    corrections: { field: string; before: any; after: any; reason: string }[];
    error_category: CorrectionCategory;
  }[];
}

export interface ControlledComparisonValidation {
  is_valid: boolean;
  reasons: string[];
  shared_dataset_id?: string;
  shared_dataset_version?: string;
  shared_case_count?: number;
}

export interface ModelComparisonResult {
  baseline_model: { id: string; version: string; name: string };
  candidate_model: { id: string; version: string; name: string };
  validation: ControlledComparisonValidation;
  dataset: { id: string; version: string; name: string; case_count: number };
  metric_diffs: {
    metric: string;
    baseline_value: number;
    candidate_value: number;
    diff: number;
    better: boolean;
  }[];
  false_negative_diff: { baseline: number; candidate: number; diff: number };
  schema_pass_diff: { baseline: number; candidate: number; diff: number };
  avg_latency_diff_ms: { baseline: number; candidate: number; diff: number };
  quality_gate_comparison: {
    baseline_gates: QualityGateStatus;
    candidate_gates: QualityGateStatus;
  };
}

export interface PromptComparisonResult {
  baseline_prompt: { id: string; version: string; name: string };
  candidate_prompt: { id: string; version: string; name: string };
  model: { id: string; version: string; name: string };
  validation: ControlledComparisonValidation;
  dataset: { id: string; version: string; name: string; case_count: number };
  metric_diffs: {
    metric: string;
    baseline_value: number;
    candidate_value: number;
    diff: number;
    better: boolean;
  }[];
  false_negative_diff: { baseline: number; candidate: number; diff: number };
  quality_gate_comparison: {
    baseline_gates: QualityGateStatus;
    candidate_gates: QualityGateStatus;
  };
}

export type GovernanceAuditEventType =
  | 'EVALUATION_CREATED'
  | 'EVALUATION_STARTED'
  | 'EVALUATION_COMPLETED'
  | 'EVALUATION_FAILED'
  | 'EVALUATION_CANCELLED'
  | 'MODEL_REGISTERED'
  | 'MODEL_STATUS_CHANGED'
  | 'PROMPT_REGISTERED'
  | 'QUALITY_GATE_FAILED'
  | 'QUALITY_GATE_PASSED'
  | 'EVALUATION_EXPORTED'
  | 'MODEL_RETIRED'
  | 'GOVERNANCE_DECISION_RECORDED';

export interface GovernanceAuditEvent {
  id: string;
  event_type: GovernanceAuditEventType;
  organization_id: string;
  actor: { id: string; name: string; role: string };
  entity_id: string;
  entity_type: 'MODEL' | 'PROMPT' | 'DATASET' | 'EVALUATION' | 'QUALITY_GATE';
  details: Record<string, any>;
  timestamp: string;
}
