import crypto from 'crypto';
import {
  ReviewEligibilityReason,
  ReviewSourceSnapshots,
  ReviewStatus,
} from './reviewTypes.ts';
import { ReportRecord } from './dataStore.ts';

export class ReviewEligibilityService {
  /**
   * Generates a deterministic hash of the report description to detect textual mutations.
   */
  static hashDescription(text: string): string {
    return crypto.createHash('sha256').update(text.trim()).digest('hex').slice(0, 16);
  }

  /**
   * Creates a snapshot of source intelligence versions at the time of review.
   */
  static buildSourceSnapshots(report: ReportRecord): ReviewSourceSnapshots {
    const analysis = report.latest_analysis;
    const risk = report.latest_risk_assessment;

    return {
      analysis_version: analysis ? `${analysis.model_name || 'suchak-safety-core'}-v${analysis.model_version || '1.0'}` : 'none',
      safety_intelligence_version: 'suchak-intelligence-v1.0',
      risk_assessment_version: risk ? `risk-policy-v${risk.policy_version || '1.0'}` : 'none',
      pattern_version: 'PATTERN_DISCOVERY_V1',
      report_updated_at: report.updated_at || report.created_at,
      description_hash: this.hashDescription(report.description || ''),
    };
  }

  /**
   * Evaluates whether a report requires HSE Human Review and returns the specific reasons.
   */
  static evaluateEligibility(report: ReportRecord): {
    isEligible: boolean;
    reasons: ReviewEligibilityReason[];
  } {
    const reasons: ReviewEligibilityReason[] = [];
    const analysis = report.latest_analysis;
    const risk = report.latest_risk_assessment;

    // 1. Phase 4 SIF Classification & Confidence Checks
    if (!analysis) {
      reasons.push('INSUFFICIENT_EVIDENCE');
    } else {
      if (analysis.classification === 'NEEDS_REVIEW') {
        reasons.push('NEEDS_REVIEW_CLASSIFICATION');
      }
      if (analysis.confidence_estimate < 0.72) {
        reasons.push('INSUFFICIENT_EVIDENCE');
      }
      if (analysis.classification === 'SIF_POTENTIAL') {
        reasons.push('SIF_UNCERTAIN');
      }
    }

    // 2. Phase 5 Safety Intelligence & IOGP Rule Checks
    if (analysis) {
      const rules = analysis.safety_indicators || [];
      if (rules.length === 0 || rules.includes('UNKNOWN') || rules.includes('UNCERTAIN')) {
        reasons.push('IOGP_MAPPING_UNCERTAIN');
      }
    }

    // 3. Phase 6 Risk Assessment Checks
    if (risk) {
      if (risk.status === 'NEEDS_REVIEW' || risk.priority === 'CRITICAL' || risk.priority === 'NEEDS_REVIEW') {
        reasons.push('RISK_FLAGGED_FOR_REVIEW');
      }
    }

    // Deduplicate reasons
    const uniqueReasons = Array.from(new Set(reasons));
    return {
      isEligible: uniqueReasons.length > 0,
      reasons: uniqueReasons,
    };
  }

  /**
   * Checks if an existing completed review has become stale due to source data mutation.
   */
  static isReviewStale(
    snapshot: ReviewSourceSnapshots,
    currentReport: ReportRecord
  ): { isStale: boolean; reason?: string } {
    const currentHash = this.hashDescription(currentReport.description || '');
    if (currentHash !== snapshot.description_hash) {
      return {
        isStale: true,
        reason: 'Report description was edited or amended after review completion.',
      };
    }

    const currentAnalysisVersion = currentReport.latest_analysis
      ? `${currentReport.latest_analysis.model_name || 'suchak-safety-core'}-v${currentReport.latest_analysis.model_version || '1.0'}`
      : 'none';

    if (currentAnalysisVersion !== snapshot.analysis_version) {
      return {
        isStale: true,
        reason: `AI Safety Analysis was re-run (Version shifted from ${snapshot.analysis_version} to ${currentAnalysisVersion}).`,
      };
    }

    const currentRiskVersion = currentReport.latest_risk_assessment
      ? `risk-policy-v${currentReport.latest_risk_assessment.policy_version || '1.0'}`
      : 'none';

    if (currentRiskVersion !== snapshot.risk_assessment_version) {
      return {
        isStale: true,
        reason: 'Risk policy assessment was recalculated after review completion.',
      };
    }

    return { isStale: false };
  }
}
