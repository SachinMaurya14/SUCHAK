/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: Model, Prompt & Quality Gate Registries
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ModelRecord,
  PromptRecord,
  QualityGateRule,
  GovernanceAuditEvent,
  ModelStatus,
  ReleaseReadiness,
  QualityGateStatus,
} from './modelGovernanceTypes.ts';

export const DEFAULT_MODELS: ModelRecord[] = [
  {
    model_id: 'model-deterministic-rules-v1',
    provider: 'SUCHAK Embedded',
    model_name: 'suchak_deterministic_nlp_engine',
    model_version: 'v1.0.0-rules',
    model_family: 'Deterministic Rule Heuristic',
    tasks: ['SIF_CLASSIFICATION', 'SAFETY_INTELLIGENCE', 'HAZARD_EXTRACTION', 'BARRIER_EVALUATION'],
    status: 'APPROVED',
    created_at: '2026-01-10T00:00:00Z',
    created_by: 'SUCHAK System Core',
    configuration: {
      engine: 'deterministic_regex_iogp',
      energy_threshold_psi: 5000,
      height_threshold_m: 1.8,
      fallback_behavior: 'NEEDS_REVIEW',
    },
    supported_schema_version: 'SUCHAK_SAFETY_CONTRACT_V1',
    notes: 'Primary authoritative deterministic fallback engine grounded in IOGP Life-Saving Rules and high-energy hazard indicators.',
    is_production_active: true,
    latest_quality_gate_status: 'PASS',
    release_readiness: 'READY_FOR_AUTHORIZED_APPROVAL',
  },
  {
    model_id: 'model-gemini-2.5-flash',
    provider: 'Google Gemini',
    model_name: 'gemini-2.5-flash',
    model_version: 'v2.5',
    model_family: 'Gemini Flash Multimodal LLM',
    tasks: ['SIF_CLASSIFICATION', 'SAFETY_INTELLIGENCE', 'HAZARD_EXTRACTION', 'BARRIER_EVALUATION', 'IOGP_CONCORDANCE', 'MULTI_TASK'],
    status: 'APPROVED',
    created_at: '2026-03-01T00:00:00Z',
    created_by: 'Dr. Alok Baruah (Chief Safety Officer)',
    configuration: {
      temperature: 0.1,
      response_mime_type: 'application/json',
      max_output_tokens: 1024,
      safety_settings: 'HARM_BLOCK_STRICT',
    },
    supported_schema_version: 'SUCHAK_SAFETY_CONTRACT_V1',
    notes: 'Production cloud LLM providing semantic nuance, high-energy classification, and structured safety intelligence extraction.',
    is_production_active: true,
    latest_quality_gate_status: 'PASS',
    release_readiness: 'READY_FOR_AUTHORIZED_APPROVAL',
  },
  {
    model_id: 'model-domain-transformer-candidate',
    provider: 'SUCHAK Applied AI Lab',
    model_name: 'suchak-domain-transformer-o&g',
    model_version: 'v1.2.0-beta',
    model_family: 'Domain-Specialized Encoder-Decoder',
    tasks: ['SIF_CLASSIFICATION', 'HAZARD_EXTRACTION', 'IOGP_CONCORDANCE'],
    status: 'EVALUATING',
    created_at: '2026-08-15T09:30:00Z',
    created_by: 'AI Engineering Team',
    configuration: {
      quantization: 'int8',
      context_length: 2048,
      tokenizer: 'o&g-hse-vocab-32k',
    },
    supported_schema_version: 'SUCHAK_SAFETY_CONTRACT_V1',
    notes: 'Candidate domain model evaluated for low-latency on-premise refinery edge deployments.',
    is_production_active: false,
    latest_quality_gate_status: 'PASS',
    release_readiness: 'READY_FOR_AUTHORIZED_APPROVAL',
  },
  {
    model_id: 'model-legacy-keyword-v0',
    provider: 'Legacy HSE Systems',
    model_name: 'suchak_keyword_matcher_v0',
    model_version: 'v0.9.1-legacy',
    model_family: 'Unweighted Substring Matcher',
    tasks: ['SIF_CLASSIFICATION'],
    status: 'RETIRED',
    created_at: '2025-05-01T00:00:00Z',
    created_by: 'Legacy Safety Database',
    configuration: {
      match_mode: 'case_insensitive_any',
    },
    supported_schema_version: 'LEGACY_V0',
    notes: 'Historical keyword script retired due to unacceptable false positive rates on trivial near-misses. Historical evaluation records preserved.',
    is_production_active: false,
    retired_at: '2026-02-15T00:00:00Z',
    retired_by: 'Dr. Alok Baruah',
    latest_quality_gate_status: 'FAIL',
    release_readiness: 'NOT_READY',
  },
];

export const DEFAULT_PROMPTS: PromptRecord[] = [
  {
    prompt_id: 'prompt-suchak-sif-v1',
    prompt_name: 'SUCHAK_SIF_ANALYSIS_V1',
    prompt_version: '1.0.0',
    task: 'SIF_CLASSIFICATION',
    effective_at: '2026-03-01T00:00:00Z',
    status: 'ACTIVE',
    hash: 'h_sif_v1_f87e2b',
    prompt_template: `You are SUCHAK, an Enterprise HSE Safety Intelligence AI system for oil & gas drilling and refinery operations.
Analyze the following safety observation narrative and classify if it represents a Serious Injury or Fatality (SIF) Precursor.

Report Narrative:
"{{description}}"
Actual Outcome:
"{{actualOutcome}}"

Return ONLY a valid JSON object matching this exact schema:
{
  "classification": "SIF_POTENTIAL" | "NON_SIF_POTENTIAL" | "NEEDS_REVIEW",
  "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "confidence_estimate": number,
  "confidence_band": "HIGH" | "MEDIUM" | "LOW",
  "hazards": string[],
  "safety_indicators": string[],
  "precursor_summary": string,
  "evidence": string[],
  "potential_consequence": string,
  "explanation": string
}`,
    supported_models: ['model-gemini-2.5-flash', 'model-domain-transformer-candidate'],
    created_by: 'Priyanka Saikia (HSE Officer)',
    notes: 'Authoritative operational prompt running in Phase 4 safety intelligence engine.',
  },
  {
    prompt_id: 'prompt-suchak-sif-v2-grounded',
    prompt_name: 'SUCHAK_SIF_ANALYSIS_V2_GROUNDED',
    prompt_version: '2.0.0',
    task: 'SIF_CLASSIFICATION',
    effective_at: '2026-08-20T00:00:00Z',
    status: 'DRAFT',
    hash: 'h_sif_v2_9a1c4d',
    prompt_template: `You are SUCHAK, an Enterprise HSE Safety Intelligence AI system.
Strict Evidence-Grounding Rule: Only cite facts directly stated in the report narrative. Do NOT extrapolate unmentioned conditions.

Report Narrative:
"{{description}}"
Actual Outcome:
"{{actualOutcome}}"

Extract verified physical energy presence, barrier status (FAILED, BYPASSED, INADEQUATE, UNKNOWN), and IOGP Life-Saving Rules concordance.`,
    supported_models: ['model-gemini-2.5-flash'],
    created_by: 'AI Engineering Team',
    notes: 'Candidate prompt enforcing strict non-extrapolation and explicit barrier status categorization.',
  },
  {
    prompt_id: 'prompt-iogp-mapping-v1',
    prompt_name: 'IOGP_RULE_CONCORDANCE_V1',
    prompt_version: '1.0.0',
    task: 'IOGP_CONCORDANCE',
    effective_at: '2026-04-10T00:00:00Z',
    status: 'ACTIVE',
    hash: 'h_iogp_v1_c34b12',
    prompt_template: `Map safety observations strictly to the 9 IOGP Life-Saving Rules:
Bypassing Safety Controls, Confined Space, Driving, Energy Isolation, Hot Work, Line of Fire, Safe Mechanical Lifting, Work at Height, Toxic Gas Exposure.`,
    supported_models: ['model-gemini-2.5-flash'],
    created_by: 'Dr. Alok Baruah',
    notes: 'Standardized international oil & gas concordance prompt.',
  },
  {
    prompt_id: 'prompt-deterministic-rules-v1',
    prompt_name: 'DETERMINISTIC_RULES_V1',
    prompt_version: '1.0.0',
    task: 'MULTI_TASK',
    effective_at: '2026-01-10T00:00:00Z',
    status: 'ACTIVE',
    hash: 'h_rules_v1_000001',
    prompt_template: 'Deterministic Regex & Keyword Heuristics Pattern Catalog (Embedded Coded Rules).',
    supported_models: ['model-deterministic-rules-v1'],
    created_by: 'SUCHAK System Core',
    notes: 'Symbolic baseline ruleset for local deterministic inference.',
  },
];

export const DEFAULT_QUALITY_GATE_RULES: QualityGateRule[] = [
  {
    id: 'gate-sif-recall',
    name: 'SIF Classification Recall Floor',
    metric_key: 'sif_metrics.recall',
    operator: '>=',
    threshold: 0.85,
    severity: 'CRITICAL',
    rationale: 'In high-hazard environments, missed SIF precursors pose immediate life-safety consequences. Recall must meet or exceed 85%.',
    is_prototype_preset: true,
  },
  {
    id: 'gate-zero-false-negatives-gold',
    name: 'Critical Benchmark False Negatives',
    metric_key: 'sif_metrics.false_negatives',
    operator: '<=',
    threshold: 1, // At most 1 in standard benchmark
    severity: 'CRITICAL',
    rationale: 'False negatives (actual SIF misclassified as NON_SIF) on verified high-consequence cases cannot exceed configured safety limits.',
    is_prototype_preset: true,
  },
  {
    id: 'gate-schema-pass-rate',
    name: 'Safety Schema Validation Pass Rate',
    metric_key: 'schema_metrics.schema_pass_rate',
    operator: '>=',
    threshold: 0.95,
    severity: 'CRITICAL',
    rationale: 'AI responses must conform to the typed safety intelligence schema to prevent downstream ingestion failures.',
    is_prototype_preset: true,
  },
  {
    id: 'gate-multilabel-f1',
    name: 'Precursor & Hazard Extraction F1',
    metric_key: 'multi_label_metrics.precursor_f1',
    operator: '>=',
    threshold: 0.70,
    severity: 'WARNING',
    rationale: 'Adequate multi-label extraction balance between precision and recall across standardized precursor taxonomies.',
    is_prototype_preset: true,
  },
  {
    id: 'gate-explanation-grounding',
    name: 'Explanation Evidence Grounding Rate',
    metric_key: 'grounding_metrics.grounding_rate',
    operator: '>=',
    threshold: 0.80,
    severity: 'WARNING',
    rationale: 'Explanations must be backed by narrative evidence without fabricated unmentioned facts.',
    is_prototype_preset: true,
  },
];

export class ModelGovernanceRegistry {
  private models: Map<string, ModelRecord> = new Map();
  private prompts: Map<string, PromptRecord> = new Map();
  private qualityGateRules: Map<string, QualityGateRule> = new Map();
  private auditEvents: GovernanceAuditEvent[] = [];
  private persistencePath: string;

  constructor(persistencePath?: string) {
    this.persistencePath =
      persistencePath || path.join(process.cwd(), 'data', 'suchak_model_governance.json');
    this.initDefaults();
    this.loadFromDisk();
  }

  private initDefaults(): void {
    for (const m of DEFAULT_MODELS) {
      this.models.set(m.model_id, { ...m });
    }
    for (const p of DEFAULT_PROMPTS) {
      this.prompts.set(p.prompt_id, { ...p });
    }
    for (const g of DEFAULT_QUALITY_GATE_RULES) {
      this.qualityGateRules.set(g.id, { ...g });
    }
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const payload = {
        models: Array.from(this.models.values()),
        prompts: Array.from(this.prompts.values()),
        qualityGateRules: Array.from(this.qualityGateRules.values()),
        auditEvents: this.auditEvents.slice(-500),
      };
      fs.writeFileSync(this.persistencePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[SUCHAK GovernanceRegistry] Could not save to disk:', err);
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.persistencePath)) {
        const raw = fs.readFileSync(this.persistencePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.models)) {
          for (const m of parsed.models) {
            this.models.set(m.model_id, m);
          }
        }
        if (Array.isArray(parsed.prompts)) {
          for (const p of parsed.prompts) {
            this.prompts.set(p.prompt_id, p);
          }
        }
        if (Array.isArray(parsed.qualityGateRules)) {
          for (const g of parsed.qualityGateRules) {
            this.qualityGateRules.set(g.id, g);
          }
        }
        if (Array.isArray(parsed.auditEvents)) {
          this.auditEvents = parsed.auditEvents;
        }
      }
    } catch (err) {
      console.warn('[SUCHAK GovernanceRegistry] Could not load from disk:', err);
    }
  }

  public recordAuditEvent(
    eventType: GovernanceAuditEvent['event_type'],
    entityId: string,
    entityType: GovernanceAuditEvent['entity_type'],
    actor: { id: string; name: string; role: string },
    organizationId: string,
    details: Record<string, any>
  ): GovernanceAuditEvent {
    const event: GovernanceAuditEvent = {
      id: `gov-evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      event_type: eventType,
      organization_id: organizationId,
      actor,
      entity_id: entityId,
      entity_type: entityType,
      details,
      timestamp: new Date().toISOString(),
    };
    this.auditEvents.push(event);
    this.saveToDisk();
    return event;
  }

  // Model Operations
  public getModels(): ModelRecord[] {
    return Array.from(this.models.values());
  }

  public getModelById(modelId: string): ModelRecord | null {
    return this.models.get(modelId) || null;
  }

  public getModel(modelId: string): ModelRecord | null {
    return this.getModelById(modelId);
  }

  public getActiveProductionModel(): ModelRecord | null {
    return Array.from(this.models.values()).find((m) => m.is_production_active) || null;
  }

  public registerModel(
    model: Omit<ModelRecord, 'created_at'>,
    actor: { id: string; name: string; role: string },
    organizationId = 'oil-india-demo'
  ): ModelRecord {
    const record: ModelRecord = {
      ...model,
      created_at: new Date().toISOString(),
    };
    this.models.set(record.model_id, record);
    this.recordAuditEvent('MODEL_REGISTERED', record.model_id, 'MODEL', actor, organizationId, {
      model_name: record.model_name,
      model_version: record.model_version,
      provider: record.provider,
    });
    this.saveToDisk();
    return record;
  }

  public updateModelStatus(
    modelId: string,
    newStatus: ModelStatus,
    actor: { id: string; name: string; role: string },
    organizationId = 'oil-india-demo',
    notes?: string
  ): ModelRecord {
    const model = this.getModelById(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found.`);
    }

    const prevStatus = model.status;
    model.status = newStatus;

    if (newStatus === 'RETIRED') {
      model.retired_at = new Date().toISOString();
      model.retired_by = actor.name;
      model.is_production_active = false;
      this.recordAuditEvent('MODEL_RETIRED', model.model_id, 'MODEL', actor, organizationId, {
        prev_status: prevStatus,
        notes,
      });
    } else {
      this.recordAuditEvent('MODEL_STATUS_CHANGED', model.model_id, 'MODEL', actor, organizationId, {
        prev_status: prevStatus,
        new_status: newStatus,
        notes,
      });
    }

    this.saveToDisk();
    return model;
  }

  public updateModelEvaluationOutcome(
    modelId: string,
    evaluationId: string,
    runStatus: any,
    qualityGateStatus: QualityGateStatus,
    releaseReadiness: ReleaseReadiness
  ): void {
    const model = this.getModelById(modelId);
    if (model) {
      model.latest_evaluation_id = evaluationId;
      model.latest_evaluation_status = runStatus;
      model.latest_quality_gate_status = qualityGateStatus;
      model.release_readiness = releaseReadiness;
      this.saveToDisk();
    }
  }

  // Prompt Operations
  public getPrompts(): PromptRecord[] {
    return Array.from(this.prompts.values());
  }

  public getPromptById(promptId: string): PromptRecord | null {
    return this.prompts.get(promptId) || null;
  }

  public registerPrompt(
    prompt: Omit<PromptRecord, 'hash' | 'effective_at'>,
    actor: { id: string; name: string; role: string },
    organizationId = 'oil-india-demo'
  ): PromptRecord {
    const hash = crypto.createHash('sha256').update(prompt.prompt_template).digest('hex').substring(0, 12);
    const record: PromptRecord = {
      ...prompt,
      hash: `h_${hash}`,
      effective_at: new Date().toISOString(),
    };
    this.prompts.set(record.prompt_id, record);
    this.recordAuditEvent('PROMPT_REGISTERED', record.prompt_id, 'PROMPT', actor, organizationId, {
      prompt_name: record.prompt_name,
      prompt_version: record.prompt_version,
      hash: record.hash,
    });
    this.saveToDisk();
    return record;
  }

  // Quality Gates
  public getQualityGateRules(): QualityGateRule[] {
    return Array.from(this.qualityGateRules.values());
  }

  public updateQualityGateRule(
    ruleId: string,
    updates: Partial<QualityGateRule>,
    actor: { id: string; name: string; role: string },
    organizationId = 'oil-india-demo'
  ): QualityGateRule {
    const rule = this.qualityGateRules.get(ruleId);
    if (!rule) {
      throw new Error(`Quality gate rule ${ruleId} not found.`);
    }
    const updated = { ...rule, ...updates, is_prototype_preset: false };
    this.qualityGateRules.set(ruleId, updated);
    this.recordAuditEvent('MODEL_STATUS_CHANGED', ruleId, 'QUALITY_GATE', actor, organizationId, {
      previous_threshold: rule.threshold,
      new_threshold: updated.threshold,
    });
    this.saveToDisk();
    return updated;
  }

  public getAuditEvents(limit = 100): GovernanceAuditEvent[] {
    return [...this.auditEvents].reverse().slice(0, limit);
  }
}

export const modelGovernanceRegistry = new ModelGovernanceRegistry();
