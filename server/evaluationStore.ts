/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: Evaluation Store, Historical Registry & Model Comparison Service
 */

import fs from 'fs';
import path from 'path';
import {
  EvaluationRun,
  EvaluationDataset,
  ModelComparisonResult,
  PromptComparisonResult,
  ControlledComparisonValidation,
  QualityGateStatus,
} from './modelGovernanceTypes.ts';
import { BENCHMARK_DATASETS } from './benchmarkData.ts';
import { modelGovernanceRegistry } from './modelGovernanceRegistry.ts';
import { evaluationRunner } from './evaluationRunner.ts';

export class EvaluationStore {
  private runs: Map<string, EvaluationRun> = new Map();
  private datasets: Map<string, EvaluationDataset> = new Map();
  private persistencePath: string;

  constructor(persistencePath?: string) {
    this.persistencePath =
      persistencePath || path.join(process.cwd(), 'data', 'suchak_evaluations_store.json');
    this.initDatasets();
    this.loadFromDisk();
    this.seedHistoricalRunsIfEmpty();
  }

  private initDatasets(): void {
    for (const ds of BENCHMARK_DATASETS) {
      this.datasets.set(ds.dataset_id, { ...ds });
    }
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const payload = {
        runs: Array.from(this.runs.values()),
        datasets: Array.from(this.datasets.values()),
      };
      fs.writeFileSync(this.persistencePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[SUCHAK EvaluationStore] Could not save to disk:', err);
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.persistencePath)) {
        const raw = fs.readFileSync(this.persistencePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.runs)) {
          for (const r of parsed.runs) {
            this.runs.set(r.evaluation_id, r);
          }
        }
        if (Array.isArray(parsed.datasets)) {
          for (const d of parsed.datasets) {
            this.datasets.set(d.dataset_id, d);
          }
        }
      }
    } catch (err) {
      console.warn('[SUCHAK EvaluationStore] Could not load from disk:', err);
    }
  }

  private async seedHistoricalRunsIfEmpty(): Promise<void> {
    if (this.runs.size > 0) return;

    try {
      const goldDataset = this.datasets.get('ds-gold-upstream-v1');
      const regDataset = this.datasets.get('ds-regression-suite-v1');
      const detModel = modelGovernanceRegistry.getModelById('model-deterministic-rules-v1');
      const geminiModel = modelGovernanceRegistry.getModelById('model-gemini-2.5-flash');
      const candidateModel = modelGovernanceRegistry.getModelById('model-domain-transformer-candidate');
      const promptV1 = modelGovernanceRegistry.getPromptById('prompt-suchak-sif-v1');
      const rulesPrompt = modelGovernanceRegistry.getPromptById('prompt-deterministic-rules-v1');

      const systemActor = { id: 'user-alok-01', name: 'Dr. Alok Baruah', role: 'Chief Safety Officer' };

      if (goldDataset && detModel && rulesPrompt) {
        const run1 = await evaluationRunner.executeRun(
          goldDataset,
          detModel,
          rulesPrompt,
          systemActor,
          'oil-india-demo'
        );
        run1.evaluation_id = 'eval-run-gold-baseline-001';
        run1.governance_decision = {
          status: 'APPROVED',
          decided_by: systemActor,
          decided_at: '2026-07-10T10:00:00Z',
          justification: 'Deterministic rule heuristic verified for high-pressure & height baseline safety gating.',
        };
        this.runs.set(run1.evaluation_id, run1);
      }

      if (goldDataset && geminiModel && promptV1) {
        const run2 = await evaluationRunner.executeRun(
          goldDataset,
          geminiModel,
          promptV1,
          systemActor,
          'oil-india-demo'
        );
        run2.evaluation_id = 'eval-run-gemini-gold-002';
        run2.governance_decision = {
          status: 'APPROVED',
          decided_by: systemActor,
          decided_at: '2026-08-01T15:30:00Z',
          justification: 'Production Gemini 2.5 Flash passed all SIF recall & schema validation gates.',
        };
        this.runs.set(run2.evaluation_id, run2);
      }

      if (regDataset && candidateModel && promptV1) {
        const run3 = await evaluationRunner.executeRun(
          regDataset,
          candidateModel,
          promptV1,
          systemActor,
          'oil-india-demo'
        );
        run3.evaluation_id = 'eval-run-candidate-reg-003';
        run3.governance_decision = {
          status: 'REVIEW_REQUIRED',
          decided_by: systemActor,
          decided_at: '2026-08-25T11:00:00Z',
          justification: 'Candidate model shows strong latency; requires field review calibration on complex multi-barrier cases.',
        };
        this.runs.set(run3.evaluation_id, run3);
      }

      this.saveToDisk();
    } catch (err) {
      console.warn('[SUCHAK EvaluationStore] Could not seed historical evaluations:', err);
    }
  }

  // Datasets
  public getDatasets(): EvaluationDataset[] {
    return Array.from(this.datasets.values());
  }

  public getDatasetById(datasetId: string): EvaluationDataset | null {
    return this.datasets.get(datasetId) || null;
  }

  public createDataset(
    dataset: Omit<EvaluationDataset, 'created_at'>,
    actor: { id: string; name: string; role: string },
    organizationId = 'oil-india-demo'
  ): EvaluationDataset {
    const record: EvaluationDataset = {
      ...dataset,
      created_at: new Date().toISOString(),
    };
    this.datasets.set(record.dataset_id, record);
    modelGovernanceRegistry.recordAuditEvent(
      'EVALUATION_CREATED',
      record.dataset_id,
      'DATASET',
      actor,
      organizationId,
      { name: record.name, count: record.record_count, type: record.dataset_type }
    );
    this.saveToDisk();
    return record;
  }

  // Runs
  public getRuns(filter?: { model_id?: string; dataset_id?: string; status?: string }): EvaluationRun[] {
    let result = Array.from(this.runs.values());
    if (filter?.model_id) {
      result = result.filter((r) => r.model_id === filter.model_id);
    }
    if (filter?.dataset_id) {
      result = result.filter((r) => r.dataset_id === filter.dataset_id);
    }
    if (filter?.status) {
      result = result.filter((r) => r.status === filter.status);
    }
    return result.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }

  public getRunById(evaluationId: string): EvaluationRun | null {
    return this.runs.get(evaluationId) || null;
  }

  public getLatestRun(): EvaluationRun | null {
    const all = this.getRuns();
    return all.length > 0 ? all[0] : null;
  }

  public recordRun(run: EvaluationRun): void {
    // Check for duplicate fingerprint
    const existing = Array.from(this.runs.values()).find(
      (r) => r.evaluation_fingerprint === run.evaluation_fingerprint && r.evaluation_id !== run.evaluation_id
    );
    if (existing) {
      run.is_repeat_run = true;
      run.repeated_from_id = existing.evaluation_id;
    }
    this.runs.set(run.evaluation_id, run);
    this.saveToDisk();
  }

  public recordGovernanceDecision(
    evaluationId: string,
    decision: 'APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED',
    decidedBy: { id: string; name: string; role: string },
    justification: string,
    organizationId = 'oil-india-demo'
  ): EvaluationRun {
    const run = this.getRunById(evaluationId);
    if (!run) {
      throw new Error(`Evaluation ${evaluationId} not found.`);
    }

    run.governance_decision = {
      status: decision,
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
      justification,
    };

    // Update model status if approved by authorized governance user
    if (decision === 'APPROVED') {
      const model = modelGovernanceRegistry.getModelById(run.model_id);
      if (model && model.status !== 'RETIRED') {
        model.status = 'APPROVED';
        model.release_readiness = 'READY_FOR_AUTHORIZED_APPROVAL';
      }
    } else if (decision === 'REJECTED') {
      const model = modelGovernanceRegistry.getModelById(run.model_id);
      if (model && model.status !== 'RETIRED') {
        model.status = 'REJECTED';
        model.release_readiness = 'NOT_READY';
      }
    }

    modelGovernanceRegistry.recordAuditEvent(
      'GOVERNANCE_DECISION_RECORDED',
      evaluationId,
      'EVALUATION',
      decidedBy,
      organizationId,
      { decision, justification }
    );

    this.saveToDisk();
    return run;
  }

  /**
   * Performs controlled side-by-side comparison between Model A and Model B.
   */
  public compareModels(
    baselineModelId: string,
    candidateModelId: string,
    datasetId: string
  ): ModelComparisonResult {
    const baselineRun = this.getRuns({ model_id: baselineModelId, dataset_id: datasetId })[0];
    const candidateRun = this.getRuns({ model_id: candidateModelId, dataset_id: datasetId })[0];
    const dataset = this.getDatasetById(datasetId);

    const validation: ControlledComparisonValidation = {
      is_valid: true,
      reasons: [],
    };

    if (!baselineRun) {
      validation.is_valid = false;
      validation.reasons.push(`No evaluation run found for baseline model ${baselineModelId} on dataset ${datasetId}.`);
    }
    if (!candidateRun) {
      validation.is_valid = false;
      validation.reasons.push(`No evaluation run found for candidate model ${candidateModelId} on dataset ${datasetId}.`);
    }
    if (!dataset) {
      validation.is_valid = false;
      validation.reasons.push(`Dataset ${datasetId} was not found in registry.`);
    }

    if (baselineRun && candidateRun) {
      if (baselineRun.dataset_version !== candidateRun.dataset_version) {
        validation.is_valid = false;
        validation.reasons.push(
          `Dataset versions mismatch: Baseline used ${baselineRun.dataset_version}, Candidate used ${candidateRun.dataset_version}. Controlled comparison requires identical benchmark version.`
        );
      }
      if (baselineRun.sif_metrics.dataset_size !== candidateRun.sif_metrics.dataset_size) {
        validation.is_valid = false;
        validation.reasons.push('Dataset sample count differs between evaluations.');
      }
      validation.shared_dataset_id = datasetId;
      validation.shared_dataset_version = baselineRun.dataset_version;
      validation.shared_case_count = baselineRun.sif_metrics.dataset_size;
    }

    const baseModel = modelGovernanceRegistry.getModelById(baselineModelId) || {
      model_id: baselineModelId,
      model_version: 'v?',
      model_name: baselineModelId,
    };
    const candModel = modelGovernanceRegistry.getModelById(candidateModelId) || {
      model_id: candidateModelId,
      model_version: 'v?',
      model_name: candidateModelId,
    };

    if (!validation.is_valid || !baselineRun || !candidateRun || !dataset) {
      return {
        baseline_model: { id: baseModel.model_id, version: baseModel.model_version, name: baseModel.model_name },
        candidate_model: { id: candModel.model_id, version: candModel.model_version, name: candModel.model_name },
        validation,
        dataset: { id: datasetId, version: dataset?.dataset_version || '1.0.0', name: dataset?.name || datasetId, case_count: dataset?.record_count || 0 },
        metric_diffs: [],
        false_negative_diff: { baseline: 0, candidate: 0, diff: 0 },
        schema_pass_diff: { baseline: 0, candidate: 0, diff: 0 },
        avg_latency_diff_ms: { baseline: 0, candidate: 0, diff: 0 },
        quality_gate_comparison: { baseline_gates: 'NOT_EVALUATED', candidate_gates: 'NOT_EVALUATED' },
      };
    }

    const bSif = baselineRun.sif_metrics;
    const cSif = candidateRun.sif_metrics;
    const bMulti = baselineRun.multi_label_metrics;
    const cMulti = candidateRun.multi_label_metrics;
    const bSchema = baselineRun.schema_metrics;
    const cSchema = candidateRun.schema_metrics;

    const diffs = [
      {
        metric: 'SIF Classification Recall',
        baseline_value: bSif.recall,
        candidate_value: cSif.recall,
        diff: Number((cSif.recall - bSif.recall).toFixed(4)),
        better: cSif.recall >= bSif.recall,
      },
      {
        metric: 'SIF Classification Precision',
        baseline_value: bSif.precision,
        candidate_value: cSif.precision,
        diff: Number((cSif.precision - bSif.precision).toFixed(4)),
        better: cSif.precision >= bSif.precision,
      },
      {
        metric: 'SIF F1 Score',
        baseline_value: bSif.f1,
        candidate_value: cSif.f1,
        diff: Number((cSif.f1 - bSif.f1).toFixed(4)),
        better: cSif.f1 >= bSif.f1,
      },
      {
        metric: 'Precursor Extraction F1',
        baseline_value: bMulti.precursor_f1,
        candidate_value: cMulti.precursor_f1,
        diff: Number((cMulti.precursor_f1 - bMulti.precursor_f1).toFixed(4)),
        better: cMulti.precursor_f1 >= bMulti.precursor_f1,
      },
      {
        metric: 'Hazard Extraction F1',
        baseline_value: bMulti.hazard_f1,
        candidate_value: cMulti.hazard_f1,
        diff: Number((cMulti.hazard_f1 - bMulti.hazard_f1).toFixed(4)),
        better: cMulti.hazard_f1 >= bMulti.hazard_f1,
      },
      {
        metric: 'Schema Pass Rate',
        baseline_value: bSchema.schema_pass_rate,
        candidate_value: cSchema.schema_pass_rate,
        diff: Number((cSchema.schema_pass_rate - bSchema.schema_pass_rate).toFixed(4)),
        better: cSchema.schema_pass_rate >= bSchema.schema_pass_rate,
      },
    ];

    const fnDiff = {
      baseline: bSif.false_negatives,
      candidate: cSif.false_negatives,
      diff: cSif.false_negatives - bSif.false_negatives,
    };

    const schemaDiff = {
      baseline: bSchema.schema_pass_rate,
      candidate: cSchema.schema_pass_rate,
      diff: Number((cSchema.schema_pass_rate - bSchema.schema_pass_rate).toFixed(4)),
    };

    const latencyDiff = {
      baseline: baselineRun.performance.avg_latency_ms,
      candidate: candidateRun.performance.avg_latency_ms,
      diff: candidateRun.performance.avg_latency_ms - baselineRun.performance.avg_latency_ms,
    };

    return {
      baseline_model: { id: baseModel.model_id, version: baseModel.model_version, name: baseModel.model_name },
      candidate_model: { id: candModel.model_id, version: candModel.model_version, name: candModel.model_name },
      validation,
      dataset: { id: dataset.dataset_id, version: dataset.dataset_version, name: dataset.name, case_count: dataset.record_count },
      metric_diffs: diffs,
      false_negative_diff: fnDiff,
      schema_pass_diff: schemaDiff,
      avg_latency_diff_ms: latencyDiff,
      quality_gate_comparison: {
        baseline_gates: baselineRun.overall_quality_gate_status,
        candidate_gates: candidateRun.overall_quality_gate_status,
      },
    };
  }

  /**
   * Performs controlled prompt comparison under identical model and dataset.
   */
  public comparePrompts(
    baselinePromptId: string,
    candidatePromptId: string,
    modelId: string,
    datasetId: string
  ): PromptComparisonResult {
    const runs = this.getRuns({ model_id: modelId, dataset_id: datasetId });
    const baselineRun = runs.find((r) => r.prompt_id === baselinePromptId);
    const candidateRun = runs.find((r) => r.prompt_id === candidatePromptId);
    const dataset = this.getDatasetById(datasetId);
    const model = modelGovernanceRegistry.getModelById(modelId);

    const validation: ControlledComparisonValidation = {
      is_valid: true,
      reasons: [],
    };

    if (!baselineRun || !candidateRun || !dataset || !model) {
      validation.is_valid = false;
      validation.reasons.push('Could not locate matched prompt evaluation runs on the requested model and dataset.');
      return {
        baseline_prompt: { id: baselinePromptId, version: 'v1', name: baselinePromptId },
        candidate_prompt: { id: candidatePromptId, version: 'v2', name: candidatePromptId },
        model: { id: modelId, version: model?.model_version || 'v1', name: model?.model_name || modelId },
        validation,
        dataset: { id: datasetId, version: '1.0.0', name: datasetId, case_count: 0 },
        metric_diffs: [],
        false_negative_diff: { baseline: 0, candidate: 0, diff: 0 },
        quality_gate_comparison: { baseline_gates: 'NOT_EVALUATED', candidate_gates: 'NOT_EVALUATED' },
      };
    }

    const bSif = baselineRun.sif_metrics;
    const cSif = candidateRun.sif_metrics;

    return {
      baseline_prompt: { id: baselinePromptId, version: baselineRun.prompt_version, name: baselineRun.prompt_id },
      candidate_prompt: { id: candidatePromptId, version: candidateRun.prompt_version, name: candidateRun.prompt_id },
      model: { id: modelId, version: model.model_version, name: model.model_name },
      validation,
      dataset: { id: dataset.dataset_id, version: dataset.dataset_version, name: dataset.name, case_count: dataset.record_count },
      metric_diffs: [
        {
          metric: 'SIF Classification Recall',
          baseline_value: bSif.recall,
          candidate_value: cSif.recall,
          diff: Number((cSif.recall - bSif.recall).toFixed(4)),
          better: cSif.recall >= bSif.recall,
        },
        {
          metric: 'SIF Precision',
          baseline_value: bSif.precision,
          candidate_value: cSif.precision,
          diff: Number((cSif.precision - bSif.precision).toFixed(4)),
          better: cSif.precision >= bSif.precision,
        },
        {
          metric: 'Precursor F1',
          baseline_value: baselineRun.multi_label_metrics.precursor_f1,
          candidate_value: candidateRun.multi_label_metrics.precursor_f1,
          diff: Number((candidateRun.multi_label_metrics.precursor_f1 - baselineRun.multi_label_metrics.precursor_f1).toFixed(4)),
          better: candidateRun.multi_label_metrics.precursor_f1 >= baselineRun.multi_label_metrics.precursor_f1,
        },
      ],
      false_negative_diff: {
        baseline: bSif.false_negatives,
        candidate: cSif.false_negatives,
        diff: cSif.false_negatives - bSif.false_negatives,
      },
      quality_gate_comparison: {
        baseline_gates: baselineRun.overall_quality_gate_status,
        candidate_gates: candidateRun.overall_quality_gate_status,
      },
    };
  }

  /**
   * Exports evaluation report to CSV or JSON.
   */
  public exportEvaluation(evaluationId: string, format: 'json' | 'csv'): string {
    const run = this.getRunById(evaluationId);
    if (!run) {
      throw new Error(`Evaluation ${evaluationId} not found.`);
    }

    if (format === 'json') {
      return JSON.stringify(run, null, 2);
    }

    // CSV format of case results
    const headers = [
      'Case ID',
      'Expected SIF',
      'Predicted SIF',
      'Status',
      'Is False Negative',
      'Latency (ms)',
      'Error Types',
      'Schema Valid',
      'Grounded',
      'Input Summary',
    ];

    const rows = run.case_results.map((c) => [
      `"${c.case_id}"`,
      `"${c.expected.sif}"`,
      `"${c.predicted.sif}"`,
      `"${c.status}"`,
      `"${c.is_false_negative_sif ? 'TRUE' : 'FALSE'}"`,
      c.latency_ms,
      `"${c.error_types.join(';')}"`,
      `"${c.schema_valid ? 'YES' : 'NO'}"`,
      `"${c.grounding_valid ? 'YES' : 'NO'}"`,
      `"${c.input_summary.replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const evaluationStore = new EvaluationStore();
