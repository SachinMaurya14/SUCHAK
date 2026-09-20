/**
 * Advanced Data Governance & Data Lifecycle Types
 * SUCHAK HSE Safety Intelligence Platform - Phase 18
 */

export type DataClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export type GovernanceDataDomain =
  | 'reports'
  | 'attachments'
  | 'ai_analysis'
  | 'reviews'
  | 'actions'
  | 'alerts'
  | 'analytics'
  | 'evaluations'
  | 'audit_logs'
  | 'identity_federation'
  | 'integration_data'
  | 'sre_telemetry';

export type DataProvenanceCategory =
  | 'SOURCE_DATA'
  | 'AI_GENERATED'
  | 'HUMAN_CORRECTED'
  | 'DERIVED'
  | 'SYSTEM_GENERATED';

export type DataQualityStatus =
  | 'VALID'
  | 'INVALID'
  | 'PARTIAL'
  | 'UNKNOWN'
  | 'REVIEW_REQUIRED';

export type ArchiveBehavior =
  | 'COLD_STORAGE'
  | 'COMPRESSED_OBJECT_STORE'
  | 'OFFLINE_VAULT'
  | 'RESTRICTED_IMMUTABLE_PARTITION';

export type DeletionMethod =
  | 'SOFT_DELETE'
  | 'CRYPTOGRAPHIC_ERASURE'
  | 'CONTROLLED_PURGE'
  | 'LOGICAL_DEPRECATION';

export interface DomainGovernancePolicy {
  domain: GovernanceDataDomain;
  default_classification: DataClassification;
  purpose: string;
  data_owner_role: string;
  retention_days: number;
  archive_behavior: ArchiveBehavior;
  deletion_method: DeletionMethod;
  approval_required_for_purge: boolean;
  sensitive_minimization_rules: string[];
  audit_level: 'STANDARD' | 'ELEVATED' | 'STRICT_IMMUTABLE';
}

export interface LegalHoldRecord {
  hold_id: string;
  organization_id: string;
  record_type: 'REPORT' | 'REVIEW' | 'ACTION' | 'AUDIT_PACKAGE' | 'INVESTIGATION_DOSSIER';
  record_id: string;
  status: 'ON_HOLD' | 'RELEASED';
  matter_reference: string;
  reason: string;
  placed_by: string;
  placed_at: string;
  released_by?: string | null;
  released_at?: string | null;
  release_reason?: string | null;
}

export interface DataLineageNode {
  id: string;
  label: string;
  stage:
    | 'SOURCE'
    | 'INGESTION'
    | 'REPORT'
    | 'AI_ANALYSIS'
    | 'SAFETY_INTEL'
    | 'RISK_CALCULATION'
    | 'PATTERN_DISCOVERY'
    | 'HUMAN_REVIEW'
    | 'CAPA_ACTION'
    | 'SAFETY_ALERT'
    | 'ANALYTICS'
    | 'EXPORT';
  provenance: DataProvenanceCategory;
  classification: DataClassification;
  timestamp: string;
  actor: string;
  details: Record<string, any>;
}

export interface DataLineageEdge {
  from_node_id: string;
  to_node_id: string;
  relationship: 'PRODUCES' | 'DERIVES' | 'ENRICHES' | 'REVIEWS' | 'MITIGATES' | 'AGGREGATES' | 'EXPORTS';
}

export interface ReportDataLineage {
  report_id: string;
  report_number: string;
  nodes: DataLineageNode[];
  edges: DataLineageEdge[];
  generated_at: string;
}

export interface DataQualityRecord {
  record_id: string;
  domain: GovernanceDataDomain;
  status: DataQualityStatus;
  validation_score: number; // 0 to 100
  checks_passed: string[];
  checks_failed: string[];
  evaluated_at: string;
}

export interface DataExportGovernanceEvaluation {
  export_id: string;
  user_email: string;
  user_role: string;
  organization_id: string;
  requested_domain: GovernanceDataDomain;
  highest_classification: DataClassification;
  is_permitted: boolean;
  required_permission: string;
  masked_sensitive_fields: string[];
  reason_code?: string;
  audit_timestamp: string;
}
