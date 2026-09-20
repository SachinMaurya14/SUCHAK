/**
 * Enterprise Compliance Control Catalog & Evidence Types
 * SUCHAK HSE Safety Intelligence Platform - Phase 18
 */

export type ComplianceControlArea =
  | 'Identity'
  | 'Access Control'
  | 'Tenant Isolation'
  | 'Secrets'
  | 'Encryption'
  | 'Logging'
  | 'Audit'
  | 'Data Governance'
  | 'Incident Response'
  | 'Backup'
  | 'Recovery'
  | 'Change Management'
  | 'Vulnerability Management'
  | 'Third-Party Integrations'
  | 'Data Retention';

export type ComplianceControlStatus =
  | 'IMPLEMENTED'
  | 'PARTIAL'
  | 'NOT_IMPLEMENTED'
  | 'EXTERNAL_DEPENDENCY'
  | 'MANUAL_VERIFICATION_REQUIRED';

export interface ComplianceControlEvidence {
  code_references: string[];
  configuration_keys: string[];
  automated_test_suite?: string;
  documentation_file: string;
  operational_procedure: string;
  verification_method: 'AUTOMATED_SUITE' | 'CONFIGURATION_AUDIT' | 'CODE_REVIEW' | 'EXTERNAL_MANUAL';
  last_verified_at: string;
  verification_verdict: 'PASS' | 'WARN' | 'PENDING_ACTIVATION';
}

export interface ComplianceControlItem {
  id: string; // e.g. IDN-01, ACC-02, TNT-01, INT-01
  area: ComplianceControlArea;
  title: string;
  statement: string;
  status: ComplianceControlStatus;
  status_label: 'CONTROL IMPLEMENTED' | 'CONTROL PREPARED' | 'CONTROL REQUIRES EXTERNAL VERIFICATION' | 'EXTERNAL DEPENDENCY' | 'NOT IMPLEMENTED';
  is_external_dependency: boolean;
  external_dependency_notes?: string;
  evidence: ComplianceControlEvidence;
}

export interface ComplianceSummary {
  total_controls: number;
  implemented_count: number;
  prepared_count: number;
  external_dependency_count: number;
  manual_verification_count: number;
  not_implemented_count: number;
  all_internal_controls_satisfied: boolean;
  certification_disclaimer: string;
}
