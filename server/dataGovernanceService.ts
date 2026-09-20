/**
 * Advanced Data Governance, Provenance, Lineage & Lifecycle Service
 * SUCHAK HSE Safety Intelligence Platform - Phase 18
 */

import {
  DataClassification,
  GovernanceDataDomain,
  DataProvenanceCategory,
  DomainGovernancePolicy,
  LegalHoldRecord,
  ReportDataLineage,
  DataLineageNode,
  DataLineageEdge,
  DataExportGovernanceEvaluation,
  DataQualityRecord,
} from './dataGovernanceTypes.ts';
import { dataStore, ReportRecord } from './dataStore.ts';
import { reviewStore } from './reviewStore.ts';
import { actionStore } from './actionStore.ts';
import { alertStore } from './alertStore.ts';
import { logger } from './logger.ts';

export class DataGovernanceService {
  private domainPolicies: Map<GovernanceDataDomain, DomainGovernancePolicy> = new Map();
  private legalHolds: Map<string, LegalHoldRecord> = new Map();
  private exportGovernanceAudits: DataExportGovernanceEvaluation[] = [];

  constructor() {
    this.initializeDomainPolicies();
    this.initializeDefaultHolds();
  }

  private initializeDomainPolicies() {
    const policies: DomainGovernancePolicy[] = [
      {
        domain: 'reports',
        default_classification: 'INTERNAL',
        purpose: 'Primary repository of operational HSE observation, near-miss, and incident narratives.',
        data_owner_role: 'HSEOfficer',
        retention_days: 2555, // 7 Years regulatory standard
        archive_behavior: 'COMPRESSED_OBJECT_STORE',
        deletion_method: 'SOFT_DELETE',
        approval_required_for_purge: true,
        sensitive_minimization_rules: ['Redact personally identifiable contractor names in public summaries'],
        audit_level: 'STRICT_IMMUTABLE',
      },
      {
        domain: 'attachments',
        default_classification: 'CONFIDENTIAL',
        purpose: 'Photographic evidence, P&ID diagrams, and equipment inspection sheets.',
        data_owner_role: 'HSEOfficer',
        retention_days: 2555,
        archive_behavior: 'COLD_STORAGE',
        deletion_method: 'CONTROLLED_PURGE',
        approval_required_for_purge: true,
        sensitive_minimization_rules: ['EXIF geolocation scrubbing', 'Facial pixelation on site photos'],
        audit_level: 'STRICT_IMMUTABLE',
      },
      {
        domain: 'ai_analysis',
        default_classification: 'INTERNAL',
        purpose: 'Deterministic and LLM safety intelligence outputs, SIF precursor probabilities, and barrier mappings.',
        data_owner_role: 'SafetyReviewer',
        retention_days: 1095, // 3 Years
        archive_behavior: 'COMPRESSED_OBJECT_STORE',
        deletion_method: 'LOGICAL_DEPRECATION',
        approval_required_for_purge: false,
        sensitive_minimization_rules: ['Strip raw prompt debugging tokens from analytical archives'],
        audit_level: 'ELEVATED',
      },
      {
        domain: 'reviews',
        default_classification: 'INTERNAL',
        purpose: 'Human verification decisions, reviewer notes, and consensus outcomes.',
        data_owner_role: 'SafetyReviewer',
        retention_days: 2555,
        archive_behavior: 'COMPRESSED_OBJECT_STORE',
        deletion_method: 'SOFT_DELETE',
        approval_required_for_purge: true,
        sensitive_minimization_rules: [],
        audit_level: 'STRICT_IMMUTABLE',
      },
      {
        domain: 'actions',
        default_classification: 'INTERNAL',
        purpose: 'Corrective and Preventive Action (CAPA) tracking, assignments, and verification evidence.',
        data_owner_role: 'SiteManager',
        retention_days: 2555,
        archive_behavior: 'COMPRESSED_OBJECT_STORE',
        deletion_method: 'SOFT_DELETE',
        approval_required_for_purge: true,
        sensitive_minimization_rules: [],
        audit_level: 'STRICT_IMMUTABLE',
      },
      {
        domain: 'alerts',
        default_classification: 'INTERNAL',
        purpose: 'Early-warning notifications, cluster surge triggers, and supervisor broadcasts.',
        data_owner_role: 'HSEOfficer',
        retention_days: 365,
        archive_behavior: 'COMPRESSED_OBJECT_STORE',
        deletion_method: 'LOGICAL_DEPRECATION',
        approval_required_for_purge: false,
        sensitive_minimization_rules: [],
        audit_level: 'STANDARD',
      },
      {
        domain: 'analytics',
        default_classification: 'INTERNAL',
        purpose: 'Aggregated risk heatmaps, frequency rates, and executive trend dashboards.',
        data_owner_role: 'OrgAdmin',
        retention_days: 1825, // 5 Years
        archive_behavior: 'COMPRESSED_OBJECT_STORE',
        deletion_method: 'LOGICAL_DEPRECATION',
        approval_required_for_purge: false,
        sensitive_minimization_rules: ['K-anonymity on low-incident remote asset locations'],
        audit_level: 'STANDARD',
      },
      {
        domain: 'evaluations',
        default_classification: 'RESTRICTED',
        purpose: 'Model governance benchmark runs, false-negative logs, and prompt experiment datasets.',
        data_owner_role: 'OrgAdmin',
        retention_days: 730,
        archive_behavior: 'COLD_STORAGE',
        deletion_method: 'SOFT_DELETE',
        approval_required_for_purge: true,
        sensitive_minimization_rules: [],
        audit_level: 'STRICT_IMMUTABLE',
      },
      {
        domain: 'audit_logs',
        default_classification: 'RESTRICTED',
        purpose: 'Immutable security, compliance, authentication, and governance access records.',
        data_owner_role: 'OrgAdmin',
        retention_days: 3650, // 10 Years immutable
        archive_behavior: 'RESTRICTED_IMMUTABLE_PARTITION',
        deletion_method: 'CONTROLLED_PURGE',
        approval_required_for_purge: true,
        sensitive_minimization_rules: ['Strict redaction of authorization tokens and user credentials'],
        audit_level: 'STRICT_IMMUTABLE',
      },
      {
        domain: 'identity_federation',
        default_classification: 'RESTRICTED',
        purpose: 'OIDC provider configurations, subject bindings, and group role mapping rules.',
        data_owner_role: 'OrgAdmin',
        retention_days: 1825,
        archive_behavior: 'COLD_STORAGE',
        deletion_method: 'SOFT_DELETE',
        approval_required_for_purge: true,
        sensitive_minimization_rules: ['Client secrets never stored in plaintext'],
        audit_level: 'STRICT_IMMUTABLE',
      },
      {
        domain: 'integration_data',
        default_classification: 'INTERNAL',
        purpose: 'External connector payloads, raw schemas, synchronization checkpoints, and reconciliation logs.',
        data_owner_role: 'OrgAdmin',
        retention_days: 730,
        archive_behavior: 'COMPRESSED_OBJECT_STORE',
        deletion_method: 'SOFT_DELETE',
        approval_required_for_purge: false,
        sensitive_minimization_rules: ['Mask external vendor API keys and header tokens'],
        audit_level: 'ELEVATED',
      },
      {
        domain: 'sre_telemetry',
        default_classification: 'INTERNAL',
        purpose: 'HTTP request golden signals, circuit breaker trips, trace spans, and worker queue telemetry.',
        data_owner_role: 'OrgAdmin',
        retention_days: 90, // Fast rotating
        archive_behavior: 'COMPRESSED_OBJECT_STORE',
        deletion_method: 'CONTROLLED_PURGE',
        approval_required_for_purge: false,
        sensitive_minimization_rules: ['Exclude request body payloads from high-throughput trace buffers'],
        audit_level: 'STANDARD',
      },
    ];

    for (const p of policies) {
      this.domainPolicies.set(p.domain, p);
    }
  }

  private initializeDefaultHolds() {
    // Demonstration Legal Hold: Inquiry on High Pressure Gas Barrier Disruption
    const defaultHold: LegalHoldRecord = {
      hold_id: 'hold-2026-001',
      organization_id: 'oil-india-demo',
      record_type: 'REPORT',
      record_id: 'rep-uuid-0891',
      status: 'ON_HOLD',
      matter_reference: 'REGULATORY-INQUIRY-DGMS-2026-A',
      reason: 'Statutory hold ordered for high pressure gas manifold flange line-of-fire event investigation.',
      placed_by: 'r.sharma@oil-enterprise.com',
      placed_at: '2026-09-18T16:00:00.000Z',
    };
    this.legalHolds.set(defaultHold.hold_id, defaultHold);
  }

  // --- Policy Access ---

  public getPolicies(): DomainGovernancePolicy[] {
    return Array.from(this.domainPolicies.values());
  }

  public getPolicy(domain: GovernanceDataDomain): DomainGovernancePolicy | null {
    return this.domainPolicies.get(domain) || null;
  }

  public updatePolicy(
    domain: GovernanceDataDomain,
    updates: Partial<DomainGovernancePolicy>,
    actor: string
  ): DomainGovernancePolicy {
    const existing = this.domainPolicies.get(domain);
    if (!existing) throw new Error(`Domain ${domain} not found in governance catalog`);

    const updated: DomainGovernancePolicy = {
      ...existing,
      ...updates,
    };
    this.domainPolicies.set(domain, updated);
    logger.info(`[DataGovernance] Policy updated for domain ${domain} by ${actor}`);
    return updated;
  }

  // --- Legal / Administrative Hold Management ---

  public getLegalHolds(organizationId?: string): LegalHoldRecord[] {
    const list = Array.from(this.legalHolds.values());
    if (organizationId) {
      return list.filter((h) => h.organization_id === organizationId);
    }
    return list;
  }

  public isRecordOnHold(recordType: string, recordId: string): boolean {
    return Array.from(this.legalHolds.values()).some(
      (h) => h.record_type === recordType && h.record_id === recordId && h.status === 'ON_HOLD'
    );
  }

  public placeLegalHold(params: {
    organization_id: string;
    record_type: 'REPORT' | 'REVIEW' | 'ACTION' | 'AUDIT_PACKAGE' | 'INVESTIGATION_DOSSIER';
    record_id: string;
    matter_reference: string;
    reason: string;
    placed_by: string;
  }): LegalHoldRecord {
    const holdId = `hold-${Date.now().toString(36)}`;
    const hold: LegalHoldRecord = {
      hold_id: holdId,
      organization_id: params.organization_id,
      record_type: params.record_type,
      record_id: params.record_id,
      status: 'ON_HOLD',
      matter_reference: params.matter_reference,
      reason: params.reason,
      placed_by: params.placed_by,
      placed_at: new Date().toISOString(),
    };

    this.legalHolds.set(holdId, hold);

    // If target is a report, reflect hold flag on report record
    if (params.record_type === 'REPORT') {
      const report = dataStore.getReportById(params.record_id);
      if (report) {
        report.legal_hold = true;
        report.legal_hold_id = holdId;
      }
    }

    logger.info(`[DataGovernance] Legal Hold ${holdId} placed on ${params.record_type}:${params.record_id} by ${params.placed_by}`);
    return hold;
  }

  public releaseLegalHold(
    holdId: string,
    releaseReason: string,
    releasedBy: string
  ): { success: boolean; hold?: LegalHoldRecord; error?: string } {
    const hold = this.legalHolds.get(holdId);
    if (!hold) return { success: false, error: 'Legal hold not found' };

    hold.status = 'RELEASED';
    hold.released_by = releasedBy;
    hold.released_at = new Date().toISOString();
    hold.release_reason = releaseReason;

    // Reset report hold flag if no other holds active on it
    if (hold.record_type === 'REPORT') {
      const remaining = Array.from(this.legalHolds.values()).some(
        (h) => h.record_id === hold.record_id && h.status === 'ON_HOLD' && h.hold_id !== holdId
      );
      if (!remaining) {
        const report = dataStore.getReportById(hold.record_id);
        if (report) {
          report.legal_hold = false;
          report.legal_hold_id = null;
        }
      }
    }

    logger.info(`[DataGovernance] Legal Hold ${holdId} released by ${releasedBy}`);
    return { success: true, hold };
  }

  // --- Data Lineage Construction ---

  public getReportLineage(reportId: string): ReportDataLineage | null {
    const report = dataStore.getReportById(reportId);
    if (!report) return null;

    const nodes: DataLineageNode[] = [];
    const edges: DataLineageEdge[] = [];

    // Node 1: Origin Source
    const sourceNodeId = `node-src-${report.id}`;
    nodes.push({
      id: sourceNodeId,
      label: report.source_system ? `External ${report.source_system}` : `SUCHAK Ingress (${report.source})`,
      stage: 'SOURCE',
      provenance: 'SOURCE_DATA',
      classification: report.data_classification || 'INTERNAL',
      timestamp: report.created_at,
      actor: report.source_system ? `System:${report.source_system}` : 'Observer / Field Worker',
      details: {
        source_system: report.source_system || 'PORTAL_WEB',
        source_record_id: report.source_record_id || report.report_number,
        source_schema_version: report.source_schema_version || '1.0',
      },
    });

    // Node 2: Canonical Ingestion & Validation
    const ingestNodeId = `node-ingest-${report.id}`;
    nodes.push({
      id: ingestNodeId,
      label: 'Canonical Ingestion & Validation',
      stage: 'INGESTION',
      provenance: 'SYSTEM_GENERATED',
      classification: 'INTERNAL',
      timestamp: report.created_at,
      actor: 'SUCHAK Ingestion Engine',
      details: {
        connector_id: report.connector_id || 'internal_web_form',
        site_mapped: report.site?.name,
        activity_mapped: report.activity?.name,
      },
    });
    edges.push({ from_node_id: sourceNodeId, to_node_id: ingestNodeId, relationship: 'PRODUCES' });

    // Node 3: Canonical Report Record
    const reportNodeId = `node-rep-${report.id}`;
    nodes.push({
      id: reportNodeId,
      label: `Safety Report ${report.report_number}`,
      stage: 'REPORT',
      provenance: 'SOURCE_DATA',
      classification: report.data_classification || 'INTERNAL',
      timestamp: report.created_at,
      actor: 'SUCHAK DataStore',
      details: {
        report_number: report.report_number,
        report_type: report.report_type,
        legal_hold: report.legal_hold || false,
      },
    });
    edges.push({ from_node_id: ingestNodeId, to_node_id: reportNodeId, relationship: 'PRODUCES' });

    // Node 4: AI SIF Classification & Safety Analysis
    if (report.latest_analysis) {
      const aiNodeId = `node-ai-${report.id}`;
      nodes.push({
        id: aiNodeId,
        label: 'AI SIF Precursor Detection',
        stage: 'AI_ANALYSIS',
        provenance: 'AI_GENERATED',
        classification: 'INTERNAL',
        timestamp: report.latest_analysis.analyzed_at || new Date().toISOString(),
        actor: 'gemini-2.5-flash',
        details: {
          sif_potential: report.latest_analysis.sif_potential,
          classification: report.latest_analysis.classification,
          confidence: report.latest_analysis.confidence_estimate,
          hazards: report.latest_analysis.hazards,
        },
      });
      edges.push({ from_node_id: reportNodeId, to_node_id: aiNodeId, relationship: 'DERIVES' });

      // Node 5: Safety Intelligence & Barrier Analysis
      const intelNodeId = `node-intel-${report.id}`;
      nodes.push({
        id: intelNodeId,
        label: 'Barrier Integrity Mapping',
        stage: 'SAFETY_INTEL',
        provenance: 'AI_GENERATED',
        classification: 'INTERNAL',
        timestamp: report.latest_analysis.analyzed_at || report.updated_at,
        actor: 'SUCHAK SafetyEngine',
        details: {
          hazards: report.latest_analysis.hazards,
          safety_indicators: report.latest_analysis.safety_indicators,
          precursor_summary: report.latest_analysis.precursor_summary,
        },
      });
      edges.push({ from_node_id: aiNodeId, to_node_id: intelNodeId, relationship: 'ENRICHES' });
    }

    // Node 6: Risk Assessment
    if (report.latest_risk_assessment) {
      const riskNodeId = `node-risk-${report.id}`;
      nodes.push({
        id: riskNodeId,
        label: `Risk Prioritization (${report.latest_risk_assessment.priority})`,
        stage: 'RISK_CALCULATION',
        provenance: 'DERIVED',
        classification: 'INTERNAL',
        timestamp: report.latest_risk_assessment.calculated_at,
        actor: 'RiskIntelligenceService',
        details: {
          score: report.latest_risk_assessment.score,
          priority: report.latest_risk_assessment.priority,
          status: report.latest_risk_assessment.status,
        },
      });
      edges.push({ from_node_id: reportNodeId, to_node_id: riskNodeId, relationship: 'DERIVES' });
    }

    // Node 7: Human HSE Review
    const review = reviewStore.getReviewByReportId(report.id, report.organization_id || 'oil-india-demo');
    if (review) {
      const reviewNodeId = `node-rev-${report.id}`;
      nodes.push({
        id: reviewNodeId,
        label: `HSE Review (${review.status})`,
        stage: 'HUMAN_REVIEW',
        provenance: 'HUMAN_CORRECTED',
        classification: 'INTERNAL',
        timestamp: review.completed_at || review.assigned_at || report.updated_at,
        actor: review.reviewer_name || 'Safety Reviewer',
        details: {
          status: review.status,
          decision: review.decision,
          has_corrections: (review.corrections && review.corrections.length > 0),
        },
      });
      edges.push({ from_node_id: reportNodeId, to_node_id: reviewNodeId, relationship: 'REVIEWS' });

      // Node 8: CAPA Actions (if actions linked)
      const actions = actionStore.getActions({
        organization_id: report.organization_id || 'oil-india-demo',
        source_report_id: report.id,
      }).data;
      if (actions.length > 0) {
        const actionNodeId = `node-act-${report.id}`;
        nodes.push({
          id: actionNodeId,
          label: `${actions.length} CAPA Actions Assigned`,
          stage: 'CAPA_ACTION',
          provenance: 'HUMAN_CORRECTED',
          classification: 'INTERNAL',
          timestamp: actions[0].created_at,
          actor: actions[0].owner_user_name || 'Action Owner',
          details: {
            action_count: actions.length,
            priority: actions[0].priority,
          },
        });
        edges.push({ from_node_id: reviewNodeId, to_node_id: actionNodeId, relationship: 'MITIGATES' });
      }
    }

    return {
      report_id: report.id,
      report_number: report.report_number,
      nodes,
      edges,
      generated_at: new Date().toISOString(),
    };
  }

  // --- Data Export Governance ---

  public evaluateExportRequest(params: {
    user_email: string;
    user_role: string;
    organization_id: string;
    domain: GovernanceDataDomain;
    format: 'CSV' | 'JSON' | 'EXECUTIVE_SUMMARY';
  }): DataExportGovernanceEvaluation {
    const policy = this.domainPolicies.get(params.domain);
    const classification = policy?.default_classification || 'INTERNAL';

    let isPermitted = true;
    let reasonCode = 'AUTHORIZED';
    const maskedFields: string[] = [];

    // Authorization evaluation matrix:
    // RESTRICTED domains (audit logs, model evaluation, identity) require OrgAdmin
    if (classification === 'RESTRICTED' && params.user_role !== 'OrgAdmin') {
      isPermitted = false;
      reasonCode = 'INSUFFICIENT_ROLE_FOR_RESTRICTED_DATA';
    }

    // Role-based sensitive field masking
    if (params.domain === 'reports' && params.user_role !== 'OrgAdmin' && params.user_role !== 'HSEOfficer') {
      maskedFields.push('contractor_worker_name', 'external_vendor_id', 'exact_gps_coordinates');
    }

    const evaluation: DataExportGovernanceEvaluation = {
      export_id: `exp-${Date.now().toString(36)}`,
      user_email: params.user_email,
      user_role: params.user_role,
      organization_id: params.organization_id,
      requested_domain: params.domain,
      highest_classification: classification,
      is_permitted: isPermitted,
      required_permission: classification === 'RESTRICTED' ? 'admin.audit' : 'reports.export',
      masked_sensitive_fields: maskedFields,
      reason_code: reasonCode,
      audit_timestamp: new Date().toISOString(),
    };

    this.exportGovernanceAudits.push(evaluation);
    if (this.exportGovernanceAudits.length > 200) {
      this.exportGovernanceAudits.shift();
    }

    logger.info(
      `[DataGovernance] Export evaluated for ${params.user_email} on ${params.domain} (${classification}): ${
        isPermitted ? 'PERMITTED' : 'DENIED'
      }`
    );

    return evaluation;
  }

  public getExportGovernanceAudits(): DataExportGovernanceEvaluation[] {
    return [...this.exportGovernanceAudits].reverse();
  }

  // --- Data Quality Evaluation ---

  public evaluateDataQuality(organizationId: string): {
    total_evaluated: number;
    valid_count: number;
    partial_count: number;
    review_required_count: number;
    average_quality_score: number;
    records: DataQualityRecord[];
  } {
    const reports = dataStore.getAllReports().filter((r) => !organizationId || r.organization_id === organizationId);
    let validCount = 0;
    let partialCount = 0;
    let reviewRequiredCount = 0;
    let totalScore = 0;
    const records: DataQualityRecord[] = [];

    for (const r of reports.slice(0, 50)) {
      const checksPassed: string[] = [];
      const checksFailed: string[] = [];
      let score = 0;

      // Check 1: Mandatory Description length
      if (r.description && r.description.length >= 20) {
        checksPassed.push('Sufficient narrative detail (>= 20 chars)');
        score += 25;
      } else {
        checksFailed.push('Description is terse (< 20 chars)');
      }

      // Check 2: Valid Site Mapping
      if (r.site_id && r.site) {
        checksPassed.push('Valid enterprise site binding');
        score += 25;
      } else {
        checksFailed.push('Unmapped site identifier');
      }

      // Check 3: Valid Activity Mapping
      if (r.activity_id && r.activity) {
        checksPassed.push('IOGP activity categorized');
        score += 25;
      } else {
        checksFailed.push('Activity unclassified');
      }

      // Check 4: AI Analysis Available
      if (r.latest_analysis) {
        checksPassed.push('Safety analysis executed');
        score += 25;
      } else {
        checksFailed.push('Pending AI safety analysis');
      }

      let status: 'VALID' | 'PARTIAL' | 'REVIEW_REQUIRED' = 'VALID';
      if (score === 100) {
        validCount++;
      } else if (score >= 50) {
        partialCount++;
        status = 'PARTIAL';
      } else {
        reviewRequiredCount++;
        status = 'REVIEW_REQUIRED';
      }

      totalScore += score;
      records.push({
        record_id: r.id,
        domain: 'reports',
        status,
        validation_score: score,
        checks_passed: checksPassed,
        checks_failed: checksFailed,
        evaluated_at: new Date().toISOString(),
      });
    }

    const totalEvaluated = reports.length || 1;
    return {
      total_evaluated: reports.length,
      valid_count: validCount,
      partial_count: partialCount,
      review_required_count: reviewRequiredCount,
      average_quality_score: Math.round(totalScore / (records.length || 1)),
      records,
    };
  }

  // --- Retention & Lifecycle Actions ---

  public executeRetentionScan(organizationId: string): {
    evaluated_records: number;
    eligible_for_archival: number;
    held_by_legal_matter: number;
    active_retained: number;
    archival_action_log: Array<{ record_id: string; domain: string; action: string; note: string }>;
  } {
    const reports = dataStore.getAllReports().filter((r) => !organizationId || r.organization_id === organizationId);
    let eligible = 0;
    let held = 0;
    let active = 0;
    const actionLog: Array<{ record_id: string; domain: string; action: string; note: string }> = [];

    const now = Date.now();
    const policy = this.domainPolicies.get('reports');
    const retentionMs = (policy?.retention_days || 2555) * 24 * 60 * 60 * 1000;

    for (const r of reports) {
      const createdAge = now - new Date(r.created_at).getTime();
      const onHold = this.isRecordOnHold('REPORT', r.id) || r.legal_hold;

      if (onHold) {
        held++;
        actionLog.push({
          record_id: r.id,
          domain: 'reports',
          action: 'RETENTION_HOLD_ENFORCED',
          note: `Record protected by active legal hold matter ${r.legal_hold_id || 'STATUTORY'}. Archival purge blocked.`,
        });
      } else if (createdAge > retentionMs) {
        eligible++;
        actionLog.push({
          record_id: r.id,
          domain: 'reports',
          action: 'ELIGIBLE_FOR_COLD_ARCHIVE',
          note: `Record age exceeds 7-year retention limit (${Math.round(createdAge / (24 * 3600 * 1000))} days). Eligible for compressed archive partition.`,
        });
      } else {
        active++;
      }
    }

    return {
      evaluated_records: reports.length,
      eligible_for_archival: eligible,
      held_by_legal_matter: held,
      active_retained: active,
      archival_action_log: actionLog,
    };
  }
}

export const dataGovernanceService = new DataGovernanceService();
