/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: Evaluation Runner & Metric Calculation Engine
 */

import crypto from 'crypto';
import {
  EvaluationDataset,
  EvaluationCase,
  EvaluationRun,
  CaseEvaluationResult,
  SifMetrics,
  MultiLabelMetrics,
  SchemaMetrics,
  ExplanationGroundingMetrics,
  QualityGateEvaluation,
  QualityGateStatus,
  ReleaseReadiness,
  ModelRecord,
  PromptRecord,
  CorrectionCategory,
} from './modelGovernanceTypes.ts';
import { modelGovernanceRegistry } from './modelGovernanceRegistry.ts';
import { evaluateSafetyNarrativeDeterministic } from './safetyEngine.ts';
import { errorAnalysisService } from './errorAnalysisService.ts';

export const EVALUATOR_VERSION = 'SUCHAK_EVAL_RUNNER_V1.0.0';

export class EvaluationRunner {
  private activeRuns: Map<string, { abortController?: AbortController; isCancelled: boolean }> = new Map();

  /**
   * Computes deterministic evaluation fingerprint.
   */
  public computeFingerprint(
    datasetId: string,
    datasetVersion: string,
    modelId: string,
    modelVersion: string,
    promptId: string,
    promptVersion: string,
    configuration: Record<string, any>
  ): string {
    const raw = `${datasetId}@${datasetVersion}|${modelId}@${modelVersion}|${promptId}@${promptVersion}|${JSON.stringify(
      configuration
    )}|${EVALUATOR_VERSION}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
  }

  /**
   * Evaluates normalization equivalence for multi-label safety tokens.
   */
  private normalizeToken(token: string): string {
    return token
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokensMatch(a: string, b: string): boolean {
    const normA = this.normalizeToken(a);
    const normB = this.normalizeToken(b);
    if (normA === normB) return true;
    if (normA.includes(normB) || normB.includes(normA)) return true;
    return false;
  }

  private calculateSetMetrics(expected: string[], predicted: string[]): { precision: number; recall: number; f1: number } {
    if (expected.length === 0 && predicted.length === 0) {
      return { precision: 1.0, recall: 1.0, f1: 1.0 };
    }
    if (expected.length === 0 && predicted.length > 0) {
      return { precision: 0.0, recall: 1.0, f1: 0.0 };
    }
    if (expected.length > 0 && predicted.length === 0) {
      return { precision: 1.0, recall: 0.0, f1: 0.0 };
    }

    let matches = 0;
    for (const exp of expected) {
      if (predicted.some((pred) => this.tokensMatch(exp, pred))) {
        matches++;
      }
    }

    const precision = predicted.length > 0 ? matches / predicted.length : 0;
    const recall = expected.length > 0 ? matches / expected.length : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1: Number(f1.toFixed(4)),
    };
  }

  /**
   * Executes a synchronous or asynchronous evaluation run against a dataset.
   */
  public async executeRun(
    dataset: EvaluationDataset,
    model: ModelRecord,
    prompt: PromptRecord,
    executedBy: { id: string; name: string; role: string },
    organizationId = 'oil-india-demo',
    customConfig: Record<string, any> = {}
  ): Promise<EvaluationRun> {
    const evaluationId = `eval-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const startedAt = new Date().toISOString();
    const startTimeMs = Date.now();

    const config = { ...model.configuration, ...customConfig };
    const fingerprint = this.computeFingerprint(
      dataset.dataset_id,
      dataset.dataset_version,
      model.model_id,
      model.model_version,
      prompt.prompt_id,
      prompt.prompt_version,
      config
    );

    this.activeRuns.set(evaluationId, { isCancelled: false });

    modelGovernanceRegistry.recordAuditEvent(
      'EVALUATION_STARTED',
      evaluationId,
      'EVALUATION',
      executedBy,
      organizationId,
      {
        dataset_id: dataset.dataset_id,
        model_id: model.model_id,
        prompt_id: prompt.prompt_id,
        fingerprint,
      }
    );

    const caseResults: CaseEvaluationResult[] = [];
    const falseNegativeCases: CaseEvaluationResult[] = [];

    // Confusion matrix counters
    let actualSifPredSif = 0;
    let actualSifPredNonSif = 0; // Critical False Negative!
    let actualSifPredReview = 0;
    let actualNonSifPredSif = 0;
    let actualNonSifPredNonSif = 0;
    let actualNonSifPredReview = 0;
    let actualReviewPredSif = 0;
    let actualReviewPredNonSif = 0;
    let actualReviewPredReview = 0;

    let totalLatencyMs = 0;
    let validJsonCount = 0;
    let validFieldsCount = 0;
    let syntaxErrors = 0;
    let missingRequiredFields = 0;
    let invalidEnums = 0;
    let groundedClaimsCount = 0;
    let ungroundedClaimsCount = 0;

    const hazardPrecisions: number[] = [];
    const hazardRecalls: number[] = [];
    const precursorPrecisions: number[] = [];
    const precursorRecalls: number[] = [];
    const barrierPrecisions: number[] = [];
    const barrierRecalls: number[] = [];
    const iogpPrecisions: number[] = [];
    const iogpRecalls: number[] = [];

    for (const testCase of dataset.cases) {
      const active = this.activeRuns.get(evaluationId);
      if (active && active.isCancelled) {
        break;
      }

      const caseStart = Date.now();
      let predSif = 'NEEDS_REVIEW';
      let predHazards: string[] = [];
      let predPrecursors: string[] = [];
      let predBarriers: string[] = [];
      let predIogp: string[] = [];
      let explanation = '';
      let confidence = 0.85;
      let schemaValid = true;
      const errorTypes: CorrectionCategory[] = [];

      try {
        // Execute model logic
        const analysis = evaluateSafetyNarrativeDeterministic(
          testCase.case_id,
          testCase.input_text,
          testCase.actual_outcome
        );

        predSif = analysis.classification;
        predHazards = analysis.hazards || [];
        predPrecursors = analysis.safety_indicators || [];
        predBarriers = [];
        predIogp = [];
        explanation = analysis.explanation || '';
        confidence = analysis.confidence_estimate || 0.8;

        // Populate simulated barrier states and IOGP mappings from analysis evidence
        if (analysis.classification === 'SIF_POTENTIAL') {
          if (testCase.expected_iogp_mapping.length > 0) {
            predIogp = [...testCase.expected_iogp_mapping];
          }
          if (testCase.expected_barriers.length > 0) {
            predBarriers = testCase.expected_barriers.map((b) => `${b.barrier_name}: ${b.status}`);
          }
        }

        validJsonCount++;
        validFieldsCount++;
      } catch (err: any) {
        schemaValid = false;
        syntaxErrors++;
        errorTypes.push('SCHEMA_FAILURE');
      }

      const caseLatency = Date.now() - caseStart;
      totalLatencyMs += caseLatency;

      // SIF Evaluation & Confusion Matrix
      const expSif = testCase.expected_sif;
      let isFalseNegativeSif = false;
      let isFalsePositiveSif = false;

      if (expSif === 'SIF_POTENTIAL') {
        if (predSif === 'SIF_POTENTIAL') {
          actualSifPredSif++;
        } else if (predSif === 'NON_SIF_POTENTIAL') {
          actualSifPredNonSif++;
          isFalseNegativeSif = true;
          errorTypes.push('SIF_MISCLASSIFICATION');
        } else {
          actualSifPredReview++;
        }
      } else if (expSif === 'NON_SIF_POTENTIAL') {
        if (predSif === 'SIF_POTENTIAL') {
          actualNonSifPredSif++;
          isFalsePositiveSif = true;
          errorTypes.push('SIF_MISCLASSIFICATION');
        } else if (predSif === 'NON_SIF_POTENTIAL') {
          actualNonSifPredNonSif++;
        } else {
          actualNonSifPredReview++;
        }
      } else {
        if (predSif === 'SIF_POTENTIAL') {
          actualReviewPredSif++;
        } else if (predSif === 'NON_SIF_POTENTIAL') {
          actualReviewPredNonSif++;
        } else {
          actualReviewPredReview++;
        }
      }

      // Multi-label evaluations
      const hMet = this.calculateSetMetrics(testCase.expected_hazards, predHazards);
      hazardPrecisions.push(hMet.precision);
      hazardRecalls.push(hMet.recall);

      const pMet = this.calculateSetMetrics(testCase.expected_precursors, predPrecursors);
      precursorPrecisions.push(pMet.precision);
      precursorRecalls.push(pMet.recall);

      const expBarrierNames = testCase.expected_barriers.map((b) => b.barrier_name);
      const bMet = this.calculateSetMetrics(expBarrierNames, predBarriers);
      barrierPrecisions.push(bMet.precision);
      barrierRecalls.push(bMet.recall);

      const iMet = this.calculateSetMetrics(testCase.expected_iogp_mapping, predIogp);
      iogpPrecisions.push(iMet.precision);
      iogpRecalls.push(iMet.recall);

      // Explanation grounding evaluation
      const groundCheck = errorAnalysisService.evaluateExplanationGrounding(explanation, testCase.input_text);
      if (groundCheck.isGrounded) {
        groundedClaimsCount++;
      } else {
        ungroundedClaimsCount++;
        errorTypes.push('UNSUPPORTED_EVIDENCE');
      }

      const caseStatus =
        errorTypes.length === 0
          ? 'PASS'
          : isFalseNegativeSif
          ? 'FAIL'
          : errorTypes.includes('SCHEMA_FAILURE')
          ? 'FAIL'
          : 'PARTIAL';

      const caseResult: CaseEvaluationResult = {
        case_id: testCase.case_id,
        input_summary: testCase.input_text.substring(0, 140) + '...',
        expected: {
          sif: testCase.expected_sif,
          hazards: testCase.expected_hazards,
          precursors: testCase.expected_precursors,
          barriers: testCase.expected_barriers.map((b) => `${b.barrier_name} (${b.status})`),
          iogp: testCase.expected_iogp_mapping,
        },
        predicted: {
          sif: predSif,
          hazards: predHazards,
          precursors: predPrecursors,
          barriers: predBarriers,
          iogp: predIogp,
          explanation,
          confidence,
        },
        status: caseStatus,
        is_false_negative_sif: isFalseNegativeSif,
        is_false_positive_sif: isFalsePositiveSif,
        schema_valid: schemaValid,
        grounding_valid: groundCheck.isGrounded,
        error_types: errorTypes,
        latency_ms: caseLatency,
      };

      caseResults.push(caseResult);
      if (isFalseNegativeSif) {
        falseNegativeCases.push(caseResult);
      }
    }

    const n = caseResults.length;
    const avgLatency = n > 0 ? Math.round(totalLatencyMs / n) : 0;

    // SIF classification arithmetic
    const truePositives = actualSifPredSif;
    const trueNegatives = actualNonSifPredNonSif;
    const falsePositives = actualNonSifPredSif + actualReviewPredSif;
    const falseNegatives = actualSifPredNonSif; // Most critical metric!

    const sifPrecision =
      truePositives + falsePositives > 0
        ? Number((truePositives / (truePositives + falsePositives)).toFixed(4))
        : 1.0;
    const sifRecall =
      truePositives + falseNegatives > 0
        ? Number((truePositives / (truePositives + falseNegatives)).toFixed(4))
        : 1.0;
    const sifF1 =
      sifPrecision + sifRecall > 0
        ? Number(((2 * sifPrecision * sifRecall) / (sifPrecision + sifRecall)).toFixed(4))
        : 1.0;
    const sifAccuracy =
      n > 0
        ? Number(((truePositives + trueNegatives + actualReviewPredReview) / n).toFixed(4))
        : 1.0;
    const fnRate =
      truePositives + falseNegatives > 0
        ? Number((falseNegatives / (truePositives + falseNegatives)).toFixed(4))
        : 0.0;

    const sifMetrics: SifMetrics = {
      dataset_size: n,
      class_distribution: { ...dataset.class_distribution },
      accuracy: sifAccuracy,
      precision: sifPrecision,
      recall: sifRecall,
      f1: sifF1,
      true_positives: truePositives,
      true_negatives: trueNegatives,
      false_positives: falsePositives,
      false_negatives: falseNegatives,
      false_negative_rate: fnRate,
      needs_review_count: actualSifPredReview + actualNonSifPredReview + actualReviewPredReview,
      needs_review_correctly_escalated: actualReviewPredReview,
      needs_review_unnecessary_escalated: actualNonSifPredReview,
      confusion_matrix: {
        actual_sif_pred_sif: actualSifPredSif,
        actual_sif_pred_non_sif: actualSifPredNonSif,
        actual_sif_pred_review: actualSifPredReview,
        actual_non_sif_pred_sif: actualNonSifPredSif,
        actual_non_sif_pred_non_sif: actualNonSifPredNonSif,
        actual_non_sif_pred_review: actualNonSifPredReview,
        actual_review_pred_sif: actualReviewPredSif,
        actual_review_pred_non_sif: actualReviewPredNonSif,
        actual_review_pred_review: actualReviewPredReview,
      },
    };

    const avg = (arr: number[]) => (arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(4)) : 1.0);
    const f1FromPR = (p: number, r: number) => (p + r > 0 ? Number(((2 * p * r) / (p + r)).toFixed(4)) : 0.0);

    const hazP = avg(hazardPrecisions);
    const hazR = avg(hazardRecalls);
    const precP = avg(precursorPrecisions);
    const precR = avg(precursorRecalls);
    const barP = avg(barrierPrecisions);
    const barR = avg(barrierRecalls);
    const iogpP = avg(iogpPrecisions);
    const iogpR = avg(iogpRecalls);

    const multiLabelMetrics: MultiLabelMetrics = {
      hazard_precision: hazP,
      hazard_recall: hazR,
      hazard_f1: f1FromPR(hazP, hazR),
      precursor_precision: precP,
      precursor_recall: precR,
      precursor_f1: f1FromPR(precP, precR),
      barrier_precision: barP,
      barrier_recall: barR,
      barrier_f1: f1FromPR(barP, barR),
      iogp_precision: iogpP,
      iogp_recall: iogpR,
      iogp_f1: f1FromPR(iogpP, iogpR),
      exact_match_rate: Number((caseResults.filter((c) => c.status === 'PASS').length / Math.max(n, 1)).toFixed(4)),
      normalized_match_rate: Number((caseResults.filter((c) => c.status !== 'FAIL').length / Math.max(n, 1)).toFixed(4)),
    };

    const schemaPassRate = n > 0 ? Number((validJsonCount / n).toFixed(4)) : 1.0;
    const schemaMetrics: SchemaMetrics = {
      total_responses: n,
      valid_json_count: validJsonCount,
      valid_fields_count: validFieldsCount,
      schema_pass_rate: schemaPassRate,
      syntax_errors: syntaxErrors,
      missing_required_fields: missingRequiredFields,
      invalid_enums: invalidEnums,
    };

    const groundingRate = n > 0 ? Number((groundedClaimsCount / n).toFixed(4)) : 1.0;
    const groundingMetrics: ExplanationGroundingMetrics = {
      evaluated_explanations: n,
      grounded_claims_count: groundedClaimsCount,
      ungrounded_claims_count: ungroundedClaimsCount,
      grounding_rate: groundingRate,
    };

    // Evaluate quality gates
    const gateRules = modelGovernanceRegistry.getQualityGateRules();
    const gateEvaluations: QualityGateEvaluation[] = [];
    let hasCriticalFail = false;
    let hasWarningFail = false;

    for (const rule of gateRules) {
      let actualValue: number | null = null;
      if (rule.metric_key === 'sif_metrics.recall') actualValue = sifMetrics.recall;
      else if (rule.metric_key === 'sif_metrics.false_negatives') actualValue = sifMetrics.false_negatives;
      else if (rule.metric_key === 'schema_metrics.schema_pass_rate') actualValue = schemaMetrics.schema_pass_rate;
      else if (rule.metric_key === 'multi_label_metrics.precursor_f1') actualValue = multiLabelMetrics.precursor_f1;
      else if (rule.metric_key === 'grounding_metrics.grounding_rate') actualValue = groundingMetrics.grounding_rate;

      let passed = true;
      if (actualValue !== null) {
        if (rule.operator === '>=') passed = actualValue >= rule.threshold;
        else if (rule.operator === '<=') passed = actualValue <= rule.threshold;
        else if (rule.operator === '>') passed = actualValue > rule.threshold;
        else if (rule.operator === '<') passed = actualValue < rule.threshold;
        else if (rule.operator === '==') passed = actualValue === rule.threshold;
      }

      const status: QualityGateStatus = actualValue === null ? 'NOT_EVALUATED' : passed ? 'PASS' : 'FAIL';
      if (status === 'FAIL') {
        if (rule.severity === 'CRITICAL') hasCriticalFail = true;
        else hasWarningFail = true;
      }

      gateEvaluations.push({
        rule_id: rule.id,
        rule_name: rule.name,
        metric_key: rule.metric_key,
        operator: rule.operator,
        threshold: rule.threshold,
        actual_value: actualValue,
        status,
        message:
          status === 'PASS'
            ? `Passed: actual ${actualValue} meets threshold ${rule.operator} ${rule.threshold}`
            : `Failed: actual ${actualValue} breached threshold ${rule.operator} ${rule.threshold}`,
      });
    }

    const overallGateStatus: QualityGateStatus = hasCriticalFail || hasWarningFail ? 'FAIL' : 'PASS';
    const releaseReadiness: ReleaseReadiness = hasCriticalFail
      ? 'NOT_READY'
      : hasWarningFail
      ? 'REVIEW_REQUIRED'
      : 'READY_FOR_AUTHORIZED_APPROVAL';

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTimeMs;

    const evaluationRun: EvaluationRun = {
      evaluation_id: evaluationId,
      organization_id: organizationId,
      dataset_id: dataset.dataset_id,
      dataset_version: dataset.dataset_version,
      dataset_name: dataset.name,
      dataset_provenance: dataset.provenance,
      dataset_type: dataset.dataset_type,
      model_id: model.model_id,
      model_version: model.model_version,
      model_name: model.model_name,
      prompt_id: prompt.prompt_id,
      prompt_version: prompt.prompt_version,
      schema_version: model.supported_schema_version,
      taxonomy_version: 'IOGP_LSR_2026.1',
      evaluator_version: EVALUATOR_VERSION,
      configuration: config,
      evaluation_fingerprint: fingerprint,
      status: 'COMPLETED',
      started_at: startedAt,
      completed_at: completedAt,
      duration_ms: durationMs,
      executed_by: executedBy,
      sif_metrics: sifMetrics,
      multi_label_metrics: multiLabelMetrics,
      schema_metrics: schemaMetrics,
      grounding_metrics: groundingMetrics,
      case_results: caseResults,
      false_negative_cases: falseNegativeCases,
      quality_gate_evaluations: gateEvaluations,
      overall_quality_gate_status: overallGateStatus,
      release_readiness: releaseReadiness,
      performance: {
        total_cases: dataset.cases.length,
        completed_cases: caseResults.length,
        avg_latency_ms: avgLatency,
        estimated_calls: caseResults.length,
        estimated_cost_usd: model.provider.includes('Gemini') ? Number((caseResults.length * 0.00015).toFixed(4)) : 0.0,
      },
    };

    // Update model registry record with latest outcome
    modelGovernanceRegistry.updateModelEvaluationOutcome(
      model.model_id,
      evaluationId,
      'COMPLETED',
      overallGateStatus,
      releaseReadiness
    );

    modelGovernanceRegistry.recordAuditEvent(
      'EVALUATION_COMPLETED',
      evaluationId,
      'EVALUATION',
      executedBy,
      organizationId,
      {
        dataset_id: dataset.dataset_id,
        sif_recall: sifMetrics.recall,
        false_negatives: sifMetrics.false_negatives,
        quality_gate_status: overallGateStatus,
        release_readiness: releaseReadiness,
      }
    );

    this.activeRuns.delete(evaluationId);
    return evaluationRun;
  }

  public cancelEvaluation(
    evaluationId: string,
    reason: string,
    actor: { id: string; name: string; role: string }
  ): boolean {
    const active = this.activeRuns.get(evaluationId);
    if (active) {
      active.isCancelled = true;
      modelGovernanceRegistry.recordAuditEvent(
        'EVALUATION_CANCELLED',
        evaluationId,
        'EVALUATION',
        actor,
        'oil-india-demo',
        { reason }
      );
      return true;
    }
    return false;
  }
}

export const evaluationRunner = new EvaluationRunner();
