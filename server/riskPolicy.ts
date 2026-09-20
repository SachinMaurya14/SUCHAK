export type PriorityBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'NEEDS_REVIEW';

export type PolicyStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type FactorEvidenceStatus = 'PRESENT' | 'NOT_PRESENT' | 'UNKNOWN';

export type EvidenceStrength = 'STRONG' | 'MODERATE' | 'WEAK' | 'INSUFFICIENT';

export interface RiskFactorConfig {
  key: string;
  name: string;
  weight: number;
  description: string;
  enabled: boolean;
}

export interface RiskThresholds {
  low: number;      // e.g. 24 (0 - 24)
  medium: number;   // e.g. 49 (25 - 49)
  high: number;     // e.g. 74 (50 - 74)
  critical: number; // e.g. 100 (75 - 100)
}

export interface RiskPolicy {
  id: string;
  version: string;
  name: string;
  status: PolicyStatus;
  description: string;
  factors: Record<string, RiskFactorConfig>;
  thresholds: RiskThresholds;
  minimum_sample_threshold: number;
  effective_at: string;
  created_at: string;
}

/**
 * Default Active Prototype Risk Policy
 * Documented clearly as SUCHAK PROTOTYPE PRIORITY POLICY, not official OIL formula.
 */
export const DEFAULT_RISK_POLICY: RiskPolicy = {
  id: 'pol-suchak-proto-v1',
  version: '1.0',
  name: 'Default Prototype Risk Scoring Policy',
  status: 'ACTIVE',
  description:
    'Configurable prototype prioritization policy for SUCHAK HSE intelligence. Scores SIF precursors based on high-energy release, barrier integrity, and exposure.',
  factors: {
    sif_potential: {
      key: 'sif_potential',
      name: 'SIF Potential Classification',
      weight: 0.30,
      description: 'Primary SIF vs Non-SIF classification from validated Phase 4 safety intelligence.',
      enabled: true,
    },
    exposure: {
      key: 'exposure',
      name: 'Worker Exposure & Red Zone Ingress',
      weight: 0.20,
      description: 'Physical proximity of personnel to high-energy release trajectory or line of fire.',
      enabled: true,
    },
    barrier_failure: {
      key: 'barrier_failure',
      name: 'Barrier Defense Failure / Degradation',
      weight: 0.20,
      description: 'Compromised, missing, or bypassed physical or administrative barrier controls.',
      enabled: true,
    },
    hazard: {
      key: 'hazard',
      name: 'Hazard Energy Magnitude',
      weight: 0.15,
      description: 'Presence of high-magnitude energy (pressure > 500 PSI, heights, toxic atmospheres).',
      enabled: true,
    },
    evidence_strength: {
      key: 'evidence_strength',
      name: 'Corroborating Evidence Strength',
      weight: 0.15,
      description: 'Quality and specificity of narrative evidence supporting the reported condition.',
      enabled: true,
    },
  },
  thresholds: {
    low: 24,
    medium: 49,
    high: 74,
    critical: 100,
  },
  minimum_sample_threshold: 5,
  effective_at: '2026-09-01T00:00:00.000Z',
  created_at: '2026-09-01T00:00:00.000Z',
};

/**
 * Validates the structural integrity and mathematical consistency of a risk policy.
 */
export function validateRiskPolicy(policy: Partial<RiskPolicy>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!policy.version || typeof policy.version !== 'string') {
    errors.push('Policy must specify a valid version string.');
  }

  if (!policy.name || typeof policy.name !== 'string') {
    errors.push('Policy must specify a descriptive name.');
  }

  if (!policy.factors || typeof policy.factors !== 'object') {
    errors.push('Policy must declare risk factors configuration.');
  } else {
    let totalWeight = 0;
    for (const [key, factor] of Object.entries(policy.factors)) {
      if (factor.enabled) {
        if (typeof factor.weight !== 'number' || factor.weight < 0 || factor.weight > 1) {
          errors.push(`Factor '${key}' weight must be a float between 0.0 and 1.0.`);
        } else {
          totalWeight += factor.weight;
        }
      }
    }
    // Allow small floating point epsilon
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      errors.push(`Enabled factor weights must sum to 1.0 (currently sums to ${totalWeight.toFixed(3)}).`);
    }
  }

  if (!policy.thresholds) {
    errors.push('Policy must define scoring thresholds.');
  } else {
    const { low, medium, high, critical } = policy.thresholds;
    if (
      typeof low !== 'number' ||
      typeof medium !== 'number' ||
      typeof high !== 'number' ||
      typeof critical !== 'number'
    ) {
      errors.push('Threshold values must be valid numbers.');
    } else if (low >= medium || medium >= high || high >= critical) {
      errors.push('Thresholds must be strictly monotonic: low < medium < high <= critical.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
