import { SafetyAnalysisResult } from './safetyEngine.ts';
import {
  RiskPolicy,
  DEFAULT_RISK_POLICY,
  PriorityBand,
  FactorEvidenceStatus,
  EvidenceStrength,
} from './riskPolicy.ts';

export interface RiskFactorEvaluation {
  key: string;
  name: string;
  status: FactorEvidenceStatus;
  raw_score: number; // 0 - 100
  weight: number;
  contribution: number; // raw_score * weight
  evidence: string;
  notes?: string;
}

export interface RiskAssessmentRecord {
  id: string;
  report_id: string;
  analysis_id?: string | null;
  risk_policy_version_id: string;
  policy_version: string;
  score: number; // 0 - 100 (SUCHAK Prototype Priority Scale)
  priority: PriorityBand;
  status: 'COMPLETED' | 'NEEDS_REVIEW' | 'RISK_ASSESSMENT_UNAVAILABLE';
  evidence_strength: EvidenceStrength;
  evidence_summary: string[];
  factor_breakdown: RiskFactorEvaluation[];
  explanation: string;
  calculated_at: string;
  sample_sufficiency?: 'SUFFICIENT' | 'INSUFFICIENT_DATA';
}

export class RiskIntelligenceService {
  private activePolicy: RiskPolicy = DEFAULT_RISK_POLICY;
  private policies: Map<string, RiskPolicy> = new Map();

  constructor() {
    this.policies.set(DEFAULT_RISK_POLICY.id, DEFAULT_RISK_POLICY);
    this.policies.set(DEFAULT_RISK_POLICY.version, DEFAULT_RISK_POLICY);
  }

  getActivePolicy(): RiskPolicy {
    return this.activePolicy;
  }

  getPolicyByVersion(versionOrId: string): RiskPolicy | null {
    return this.policies.get(versionOrId) || null;
  }

  listPolicies(): RiskPolicy[] {
    return Array.from(new Set(this.policies.values()));
  }

  /**
   * Assesses report risk strictly using validated Phase 4/5 outputs.
   * If analysis is missing, returns RISK_ASSESSMENT_UNAVAILABLE without faking a score.
   */
  assessRisk(
    reportId: string,
    description: string,
    analysis: SafetyAnalysisResult | null | undefined,
    options?: {
      policy?: RiskPolicy;
      isRecalculation?: boolean;
    }
  ): RiskAssessmentRecord {
    const policy = options?.policy || this.activePolicy;
    const nowIso = new Date().toISOString();

    // Guard: Must have valid Phase 4/5 safety intelligence
    if (!analysis || !analysis.classification) {
      return {
        id: `ra-${Math.random().toString(36).substring(2, 10)}`,
        report_id: reportId,
        analysis_id: null,
        risk_policy_version_id: policy.id,
        policy_version: policy.version,
        score: 0,
        priority: 'NEEDS_REVIEW',
        status: 'RISK_ASSESSMENT_UNAVAILABLE',
        evidence_strength: 'INSUFFICIENT',
        evidence_summary: ['Report has not been analyzed by Phase 4/5 Safety Intelligence.'],
        factor_breakdown: [],
        explanation: 'Risk assessment unavailable: Validated Phase 4/5 safety intelligence is required prior to risk scoring.',
        calculated_at: nowIso,
      };
    }

    const descLower = description.toLowerCase();

    // 1. Evidence Strength Evaluation
    const wordCount = description.trim().split(/\s+/).length;
    let evidenceStrength: EvidenceStrength = 'MODERATE';
    if (wordCount < 6 || analysis.evidence.length === 0) {
      evidenceStrength = 'INSUFFICIENT';
    } else if (
      analysis.evidence.length >= 2 &&
      (descLower.includes('psi') ||
        descLower.includes('meter') ||
        descLower.includes('barricade') ||
        descLower.includes('whip check') ||
        descLower.includes('lanyard') ||
        descLower.includes('separator') ||
        descLower.includes('breaker') ||
        descLower.includes('sling'))
    ) {
      evidenceStrength = 'STRONG';
    } else if (wordCount >= 10 && analysis.evidence.length >= 1) {
      evidenceStrength = 'MODERATE';
    } else {
      evidenceStrength = 'WEAK';
    }

    // 2. Factor 1: SIF Potential
    let sifScore = 0;
    let sifStatus: FactorEvidenceStatus = 'NOT_PRESENT';
    let sifEvidence = 'Report assessed as non-SIF operational event.';
    if (analysis.classification === 'SIF_POTENTIAL' || analysis.sif_potential === true) {
      sifScore = 100;
      sifStatus = 'PRESENT';
      sifEvidence = analysis.precursor_summary || 'SIF precursor conditions identified in field observation.';
    } else if (analysis.classification === 'NEEDS_REVIEW') {
      sifScore = 45;
      sifStatus = 'UNKNOWN';
      sifEvidence = 'Ambiguous precursor signals requiring manual HSE safety review.';
    } else {
      sifScore = 10;
      sifStatus = 'NOT_PRESENT';
      sifEvidence = 'Routine low-energy deviation without credible fatality mechanism.';
    }

    // 3. Factor 2: Worker Exposure / Line of Fire
    let exposureScore = 0;
    let exposureStatus: FactorEvidenceStatus = 'UNKNOWN';
    let exposureEvidence = 'Personnel exposure status unconfirmed in observation text.';
    if (
      ['stepped across', 'front of', 'personnel', 'technician', 'scaffolder', 'worker', 'crew', 'line of fire', 'underneath', 'entered'].some(
        (w) => descLower.includes(w)
      )
    ) {
      exposureScore = 100;
      exposureStatus = 'PRESENT';
      exposureEvidence = 'Personnel actively identified in line-of-fire or drop zone during energy ramp-up.';
    } else if (['unattended', 'vacant', 'no personnel', 'remote', 'empty area'].some((w) => descLower.includes(w))) {
      exposureScore = 10;
      exposureStatus = 'NOT_PRESENT';
      exposureEvidence = 'Equipment isolated with no personnel directly in hazardous zone.';
    } else {
      // Explicitly UNKNOWN: do NOT assume exposure is high
      exposureScore = 0;
      exposureStatus = 'UNKNOWN';
      exposureEvidence = 'Worker presence not clearly documented; scored conservatively as 0 contribution.';
    }

    // 4. Factor 3: Barrier Defense Failure
    let barrierScore = 0;
    let barrierStatus: FactorEvidenceStatus = 'UNKNOWN';
    let barrierEvidence = 'Barrier state unknown or unverified.';
    if (
      ['disconnected', 'bypassed', 'clipped', 'unlatched', 'tear', 'jammed', 'missing', 'failed', 'ruptured', 'without'].some((w) =>
        descLower.includes(w)
      )
    ) {
      barrierScore = 100;
      barrierStatus = 'PRESENT';
      if (descLower.includes('whip check')) {
        barrierEvidence = 'Mechanical whip check restraint cable disconnected on pressurized line.';
      } else if (descLower.includes('lanyard') || descLower.includes('harness')) {
        barrierEvidence = 'Fall arrest lanyard unlatched with no secondary lifeline tethering.';
      } else if (descLower.includes('padlock') || descLower.includes('bolt cutters') || descLower.includes('loto')) {
        barrierEvidence = 'Electrical LOTO lock clipped without recorded clearance permits.';
      } else if (descLower.includes('sling')) {
        barrierEvidence = 'Synthetic lifting sling sustained severe tear upon sharp structural edge.';
      } else {
        barrierEvidence = 'Critical defense barrier identified as compromised or bypassed in narrative.';
      }
    } else if (['tested ok', 'verified intact', 'barrier held', 'inspected normal'].some((w) => descLower.includes(w))) {
      barrierScore = 0;
      barrierStatus = 'NOT_PRESENT';
      barrierEvidence = 'Barriers remained fully intact and operational.';
    } else {
      // Explicitly UNKNOWN: Critical rule - do not assume barrier failure = present
      barrierScore = 0;
      barrierStatus = 'UNKNOWN';
      barrierEvidence = 'Barrier integrity is unknown in narrative; scored conservatively as 0.';
    }

    // 5. Factor 4: Hazard Energy Magnitude
    let hazardScore = 0;
    let hazardStatus: FactorEvidenceStatus = 'NOT_PRESENT';
    let hazardEvidence = 'Standard low-energy workplace setting.';
    if (analysis.hazards && analysis.hazards.length > 0) {
      const isHighEnergy = analysis.hazards.some((h) =>
        ['PRESSURE', 'GRAVITY', 'ELECTRICAL', 'CONFINED_SPACE', 'CHEMICAL'].includes(h.toUpperCase())
      );
      if (isHighEnergy) {
        hazardScore = 90;
        hazardStatus = 'PRESENT';
        hazardEvidence = `High-energy hazard vector detected: ${analysis.hazards.join(', ')}.`;
      } else {
        hazardScore = 25;
        hazardStatus = 'PRESENT';
        hazardEvidence = `Low-magnitude operational hazard: ${analysis.hazards.join(', ')}.`;
      }
    } else {
      hazardScore = 0;
      hazardStatus = 'UNKNOWN';
      hazardEvidence = 'Hazard energy vector not classified.';
    }

    // 6. Factor 5: Evidence Strength Factor
    let evidenceFactorScore = 0;
    let evidenceStatus: FactorEvidenceStatus = 'PRESENT';
    let evidenceFactorNote = '';
    if (evidenceStrength === 'STRONG') {
      evidenceFactorScore = 100;
      evidenceFactorNote = 'Detailed field observation with corroborated technical energy and barrier context.';
    } else if (evidenceStrength === 'MODERATE') {
      evidenceFactorScore = 70;
      evidenceFactorNote = 'Adequate observation detail supporting hazard and barrier indicators.';
    } else if (evidenceStrength === 'WEAK') {
      evidenceFactorScore = 35;
      evidenceFactorNote = 'Minimal narrative detail; higher uncertainty in priority ranking.';
    } else {
      evidenceFactorScore = 10;
      evidenceStatus = 'UNKNOWN';
      evidenceFactorNote = 'Insufficient detail in safety narrative for confident verification.';
    }

    // Build factor evaluations
    const factorConfigs = policy.factors;
    const evaluations: RiskFactorEvaluation[] = [
      {
        key: 'sif_potential',
        name: factorConfigs.sif_potential?.name || 'SIF Potential Classification',
        status: sifStatus,
        raw_score: sifScore,
        weight: factorConfigs.sif_potential?.weight ?? 0.30,
        contribution: Math.round(sifScore * (factorConfigs.sif_potential?.weight ?? 0.30)),
        evidence: sifEvidence,
      },
      {
        key: 'exposure',
        name: factorConfigs.exposure?.name || 'Worker Exposure & Red Zone Ingress',
        status: exposureStatus,
        raw_score: exposureScore,
        weight: factorConfigs.exposure?.weight ?? 0.20,
        contribution: Math.round(exposureScore * (factorConfigs.exposure?.weight ?? 0.20)),
        evidence: exposureEvidence,
      },
      {
        key: 'barrier_failure',
        name: factorConfigs.barrier_failure?.name || 'Barrier Defense Failure / Degradation',
        status: barrierStatus,
        raw_score: barrierScore,
        weight: factorConfigs.barrier_failure?.weight ?? 0.20,
        contribution: Math.round(barrierScore * (factorConfigs.barrier_failure?.weight ?? 0.20)),
        evidence: barrierEvidence,
      },
      {
        key: 'hazard',
        name: factorConfigs.hazard?.name || 'Hazard Energy Magnitude',
        status: hazardStatus,
        raw_score: hazardScore,
        weight: factorConfigs.hazard?.weight ?? 0.15,
        contribution: Math.round(hazardScore * (factorConfigs.hazard?.weight ?? 0.15)),
        evidence: hazardEvidence,
      },
      {
        key: 'evidence_strength',
        name: factorConfigs.evidence_strength?.name || 'Corroborating Evidence Strength',
        status: evidenceStatus,
        raw_score: evidenceFactorScore,
        weight: factorConfigs.evidence_strength?.weight ?? 0.15,
        contribution: Math.round(evidenceFactorScore * (factorConfigs.evidence_strength?.weight ?? 0.15)),
        evidence: evidenceFactorNote,
      },
    ];

    // Compute composite score (normalized 0 - 100)
    let totalScore = evaluations.reduce((sum, f) => sum + f.contribution, 0);
    totalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

    // Assign Priority Band according to policy thresholds
    let priority: PriorityBand = 'LOW';
    if (analysis.classification === 'NEEDS_REVIEW' || evidenceStrength === 'INSUFFICIENT') {
      priority = 'NEEDS_REVIEW';
    } else if (totalScore <= policy.thresholds.low) {
      priority = 'LOW';
    } else if (totalScore <= policy.thresholds.medium) {
      priority = 'MEDIUM';
    } else if (totalScore <= policy.thresholds.high) {
      priority = 'HIGH';
    } else {
      priority = 'CRITICAL';
    }

    // Generate concise, evidence-grounded explanation (No chain of thought, matches factor breakdown)
    const presentFactors: string[] = [];
    if (sifStatus === 'PRESENT') presentFactors.push('confirmed SIF potential precursor');
    if (hazardStatus === 'PRESENT') presentFactors.push('high-magnitude operational energy');
    if (exposureStatus === 'PRESENT') presentFactors.push('active personnel exposure in line of fire');
    if (barrierStatus === 'PRESENT') presentFactors.push('documented barrier control compromise');

    let explanation = '';
    if (priority === 'CRITICAL' || priority === 'HIGH') {
      explanation = `Priority is elevated (${totalScore}/100, ${priority}) because the report indicates ${presentFactors.join(', ')}, supported by ${evidenceStrength.toLowerCase()} narrative evidence.`;
    } else if (priority === 'NEEDS_REVIEW') {
      explanation = `Priority flagged for manual review (${totalScore}/100, NEEDS_REVIEW) due to ambiguous hazard indicators and unverified barrier state in narrative.`;
    } else if (priority === 'MEDIUM') {
      explanation = `Priority assigned moderate ranking (${totalScore}/100, MEDIUM) based on routine operational hazard without substantiated catastrophic release pathway.`;
    } else {
      explanation = `Priority assigned routine baseline (${totalScore}/100, LOW): Evaluated as non-SIF observation with absence of high-energy release or critical barrier failure.`;
    }

    const evidenceSummary = [
      ...analysis.evidence,
      ...evaluations
        .filter((e) => e.status === 'PRESENT' && e.evidence)
        .map((e) => `${e.name}: ${e.evidence}`),
    ].slice(0, 5);

    return {
      id: `ra-${Math.random().toString(36).substring(2, 10)}`,
      report_id: reportId,
      analysis_id: analysis.id,
      risk_policy_version_id: policy.id,
      policy_version: policy.version,
      score: totalScore,
      priority,
      status: priority === 'NEEDS_REVIEW' ? 'NEEDS_REVIEW' : 'COMPLETED',
      evidence_strength: evidenceStrength,
      evidence_summary: evidenceSummary,
      factor_breakdown: evaluations,
      explanation,
      calculated_at: nowIso,
      sample_sufficiency: 'SUFFICIENT',
    };
  }
}

export const riskIntelligenceService = new RiskIntelligenceService();
