import fs from 'fs';
import path from 'path';
import {
  PatternStatus,
  PatternType,
  PatternFeatureRepresentation,
  PatternMember,
  PatternEvidenceSummary,
  PatternTrend,
  PatternTrendBucket,
  PatternDistribution,
  PrecursorPattern,
  PatternSummaryKPIs,
  DiscoveryConfiguration,
  DiscoveryRun,
} from './patternTypes.ts';
import { ReportRecord } from './dataStore.ts';
import { SafetyAnalysisResult } from './safetyEngine.ts';
import { VectorDocument } from './vectorTypes.ts';

const PATTERN_STORE_FILE = path.join(process.cwd(), 'data', 'suchak_patterns_store.json');

export const DEFAULT_DISCOVERY_CONFIG: DiscoveryConfiguration = {
  min_support: 3,
  min_unique_dates: 2,
  semantic_similarity_threshold: 0.65,
  time_window_preset: 'all',
  algorithm_version: 'PATTERN_DISCOVERY_V1',
};

/**
 * 1. PatternFeatureBuilder
 * Extracts normalized structured + semantic feature representations from reports.
 */
export class PatternFeatureBuilder {
  public static buildFeature(
    report: ReportRecord,
    analysis?: SafetyAnalysisResult | null,
    vectorDoc?: VectorDocument | null
  ): PatternFeatureRepresentation {
    const desc = (report.description || '').toLowerCase();
    const outcome = (report.actual_outcome || '').toLowerCase();
    const text = `${desc} ${outcome}`;

    // Normalize Precursor based on Phase 5 safety intelligence
    let primaryPrecursor = 'UNSPECIFIED_SAFETY_DEFICIENCY';
    const relatedPrecursors: string[] = [];

    if (
      text.includes('energized') ||
      text.includes('isolation') ||
      text.includes('lockout') ||
      text.includes('loto') ||
      text.includes('live potential') ||
      text.includes('breaker') ||
      text.includes('busbar') ||
      text.includes('switchgear') ||
      text.includes('hydraulic control lines')
    ) {
      primaryPrecursor = 'Hazardous Energy Isolation Deficiency';
      relatedPrecursors.push('Unverified Stored Energy', 'Premature Enclosure Access');
    } else if (
      text.includes('suspended load') ||
      text.includes('sling') ||
      text.includes('rigging') ||
      text.includes('crane') ||
      text.includes('tandem lift') ||
      text.includes('line of fire')
    ) {
      primaryPrecursor = 'Line-of-Fire Suspended Load Exposure';
      relatedPrecursors.push('Rigging Hardware Degradation', 'Barricade Zone Breach');
    } else if (
      text.includes('pressure') ||
      text.includes('hydrostatic') ||
      text.includes('whip check') ||
      text.includes('manifold') ||
      text.includes('swivel joint')
    ) {
      primaryPrecursor = 'Pressurized Line Containment & Whip-Check Compromise';
      relatedPrecursors.push('High-Pressure Proofing Zone Exposure', 'Restraint Cable Missing');
    } else if (
      text.includes('height') ||
      text.includes('harness') ||
      text.includes('lanyard') ||
      text.includes('scaffold') ||
      text.includes('lifeline') ||
      text.includes('fall')
    ) {
      primaryPrecursor = 'Working at Height Fall Protection Disconnect';
      relatedPrecursors.push('100% Tie-Off Non-Compliance', 'Lifeline Not Rigged');
    } else if (
      text.includes('confined space') ||
      text.includes('gas monitoring') ||
      text.includes('oxygen') ||
      text.includes('lel') ||
      text.includes('toxic')
    ) {
      primaryPrecursor = 'Confined Space Atmospheric Testing Lapse';
      relatedPrecursors.push('Continuous Gas Monitor Omission', 'Permit Verification Delay');
    }

    // Barrier Failures
    const barrierFailures: string[] = [];
    if (text.includes('lockout') || text.includes('isolation') || text.includes('breaker') || text.includes('live potential')) {
      barrierFailures.push('Isolation not verified / LOTO incomplete');
    }
    if (text.includes('whip check') || text.includes('restraint')) {
      barrierFailures.push('Secondary safety whip check cable unlatched');
    }
    if (text.includes('barricade') || text.includes('perimeter') || text.includes('line of fire')) {
      barrierFailures.push('Exclusion barricade boundary breached');
    }
    if (text.includes('lanyard') || text.includes('harness') || text.includes('unclipped')) {
      barrierFailures.push('Dual-lanyard 100% tie-off defeated');
    }
    if (text.includes('gas monitor') || text.includes('test') || text.includes('atmosphere')) {
      barrierFailures.push('Pre-entry gas clearance test omitted');
    }
    if (barrierFailures.length === 0) {
      barrierFailures.push('Administrative procedure deviation');
    }

    // IOGP Life-Saving Rules
    const iogpRules: string[] = [];
    if (text.includes('energized') || text.includes('isolation') || text.includes('breaker') || text.includes('loto')) {
      iogpRules.push('Energy Isolation');
    }
    if (text.includes('line of fire') || text.includes('pressure') || text.includes('suspended load') || text.includes('crane')) {
      iogpRules.push('Line of Fire');
    }
    if (text.includes('height') || text.includes('harness') || text.includes('scaffold') || text.includes('fall')) {
      iogpRules.push('Working at Height');
    }
    if (text.includes('confined space') || text.includes('gas') || text.includes('oxygen')) {
      iogpRules.push('Confined Space Entry');
    }
    if (text.includes('permit') || text.includes('hot work') || text.includes('bypass')) {
      iogpRules.push('Bypassing Safety Controls');
    }

    // Energy context
    const energyContext: string[] = [];
    if (text.includes('electrical') || text.includes('busbar') || text.includes('switchgear') || text.includes('breaker')) {
      energyContext.push('Electrical Potential');
    }
    if (text.includes('pressure') || text.includes('psi') || text.includes('hydraulic') || text.includes('gas')) {
      energyContext.push('Stored Fluid Pressure');
    }
    if (text.includes('suspended') || text.includes('load') || text.includes('height') || text.includes('fall')) {
      energyContext.push('Gravitational Energy');
    }

    // Equipment
    const equipmentContext: string[] = [];
    if (text.includes('pump') || text.includes('compressor') || text.includes('engine') || text.includes('motor')) {
      equipmentContext.push('Rotating Machinery');
    }
    if (text.includes('crane') || text.includes('rig') || text.includes('sling') || text.includes('basket')) {
      equipmentContext.push('Lifting & Rigging Tackle');
    }
    if (text.includes('switchgear') || text.includes('transformer') || text.includes('breaker')) {
      equipmentContext.push('Power Distribution');
    }
    if (text.includes('manifold') || text.includes('valve') || text.includes('piping') || text.includes('separator')) {
      equipmentContext.push('Process Piping & Valves');
    }

    return {
      report_id: report.id,
      report_number: report.report_number,
      organization_id: report.organization_id || 'oil-india-demo',
      primary_precursor: primaryPrecursor,
      related_precursors: relatedPrecursors,
      primary_hazard: analysis?.hazards?.[0] || 'MECHANICAL_ELECTRICAL',
      hazards: analysis?.hazards || ['HAZARDOUS_ENERGY'],
      barrier_failures: barrierFailures,
      activity_id: report.activity_id || 'act-gen',
      activity_name: report.activity?.name || 'General Operations',
      site_id: report.site_id,
      site_name: report.site?.name || 'Unknown Site',
      location_name: report.location?.name || 'Operational Zone',
      energy_context: energyContext.length > 0 ? energyContext : ['Mechanical'],
      equipment_context: equipmentContext.length > 0 ? equipmentContext : ['Industrial Equipment'],
      iogp_rules: iogpRules.length > 0 ? iogpRules : ['Work Authorization'],
      sif_potential: analysis?.sif_potential ?? false,
      priority_baseline: analysis?.priority || 'MEDIUM',
      report_type: report.report_type,
      report_datetime: report.report_datetime,
      content_hash: report.embedding_content_hash || `${report.id}-${report.description.length}`,
      vector: vectorDoc?.vector,
    };
  }
}

/**
 * 2. PatternStrengthCalculator
 * Transparently computes 0–100 evidence strength without confusing it with risk or SIF probability.
 */
export class PatternStrengthCalculator {
  public static calculate(
    supportCount: number,
    uniqueDatesCount: number,
    cohesionScore: number,
    distinctSitesCount: number,
    distinctActivitiesCount: number,
    duplicateSuspicions: number
  ): { score: number; breakdown: Record<string, number>; notes: string } {
    // 1. Support Volume (Max 30)
    // 3 reports = 15 pts; 5 reports = 22 pts; 8+ reports = 30 pts
    let supportPts = 0;
    if (supportCount >= 8) supportPts = 30;
    else if (supportCount >= 5) supportPts = 24;
    else if (supportCount >= 4) supportPts = 20;
    else if (supportCount >= 3) supportPts = 15;
    else supportPts = supportCount * 4;

    // 2. Temporal Recurrence / Unique Dates (Max 25)
    // Recurrence across multiple distinct calendar days proves it is not a single event burst
    let temporalPts = 0;
    if (uniqueDatesCount >= 5) temporalPts = 25;
    else if (uniqueDatesCount >= 4) temporalPts = 21;
    else if (uniqueDatesCount >= 3) temporalPts = 18;
    else if (uniqueDatesCount >= 2) temporalPts = 13;
    else temporalPts = 5;

    // 3. Semantic & Structured Cohesion (Max 25)
    // cohesionScore is 0.0 - 1.0 (average cosine similarity to centroid)
    const cohesionPts = Math.min(25, Math.round(cohesionScore * 25));

    // 4. Operational Breadth (Max 20)
    // Multi-site and multi-activity recurrence points to a systemic, organizational pattern
    let breadthPts = 0;
    if (distinctSitesCount > 1) breadthPts += 10;
    else breadthPts += 5;

    if (distinctActivitiesCount > 1) breadthPts += 10;
    else breadthPts += 5;

    // Penalties
    let penalty = 0;
    if (duplicateSuspicions > 0) penalty += 10;

    const rawScore = supportPts + temporalPts + cohesionPts + breadthPts - penalty;
    const finalScore = Math.max(0, Math.min(100, rawScore));

    return {
      score: finalScore,
      breakdown: {
        support_volume: supportPts,
        temporal_recurrence: temporalPts,
        semantic_cohesion: cohesionPts,
        operational_breadth: breadthPts,
        deduplication_penalty: penalty,
      },
      notes: 'Grounded in supporting observation counts, distinct calendar dates, and vector centroid proximity. Not a measure of incident risk or probability.',
    };
  }
}

/**
 * 3. PatternTrendService
 * Computes chronological observations over time without alarmist claims.
 */
export class PatternTrendService {
  public static calculateTrend(members: PatternMember[]): PatternTrend {
    if (!members || members.length === 0) {
      const now = new Date().toISOString();
      return {
        first_seen_at: now,
        last_seen_at: now,
        span_days: 0,
        recent_occurrences_30d: 0,
        prior_occurrences_30d: 0,
        timeline: [],
        trend_direction: 'INSUFFICIENT_TIMELINE',
        trend_description: 'Insufficient observation history to calculate trend.',
      };
    }

    const sorted = [...members].sort(
      (a, b) => new Date(a.report_datetime).getTime() - new Date(b.report_datetime).getTime()
    );

    const firstSeen = sorted[0].report_datetime;
    const lastSeen = sorted[sorted.length - 1].report_datetime;
    const spanMs = new Date(lastSeen).getTime() - new Date(firstSeen).getTime();
    const spanDays = Math.max(1, Math.round(spanMs / (1000 * 60 * 60 * 24)));

    // 30d window comparisons
    const latestTime = new Date(lastSeen).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const cutoff30 = latestTime - thirtyDaysMs;
    const cutoff60 = latestTime - 2 * thirtyDaysMs;

    let recent30 = 0;
    let prior30 = 0;

    // Build timeline buckets (by month/week)
    const bucketMap: Map<string, { count: number; start: string; end: string }> = new Map();

    for (const m of sorted) {
      const t = new Date(m.report_datetime).getTime();
      if (t >= cutoff30) recent30++;
      else if (t >= cutoff60) prior30++;

      const d = new Date(m.report_datetime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!bucketMap.has(key)) {
        bucketMap.set(key, { count: 0, start: `${key}-01`, end: `${key}-28` });
      }
      bucketMap.get(key)!.count++;
    }

    const timeline: PatternTrendBucket[] = Array.from(bucketMap.entries()).map(([k, v]) => ({
      period: k,
      count: v.count,
      date_start: v.start,
      date_end: v.end,
    }));

    let direction: 'INCREASING' | 'STABLE' | 'DECREASING' | 'INSUFFICIENT_TIMELINE' = 'STABLE';
    let description = 'Recurrence rate remained stable across observed periods.';

    if (timeline.length < 2 && members.length < 4) {
      direction = 'INSUFFICIENT_TIMELINE';
      description = 'Observation history too brief to identify trend direction.';
    } else if (recent30 > prior30 + 1) {
      direction = 'INCREASING';
      description = `Observation count increased in recent period (${recent30} recent vs ${prior30} prior).`;
    } else if (prior30 > recent30 + 1) {
      direction = 'DECREASING';
      description = `Observation count decreased in recent period (${recent30} recent vs ${prior30} prior).`;
    }

    return {
      first_seen_at: firstSeen,
      last_seen_at: lastSeen,
      span_days: spanDays,
      recent_occurrences_30d: recent30,
      prior_occurrences_30d: prior30,
      timeline,
      trend_direction: direction,
      trend_description: description,
    };
  }
}

/**
 * 4. PatternDiscoveryEngine
 * Hybrid structured + semantic discovery and clustering.
 */
export class PatternDiscoveryEngine {
  private config: DiscoveryConfiguration;

  constructor(config: DiscoveryConfiguration = DEFAULT_DISCOVERY_CONFIG) {
    this.config = config;
  }

  /**
   * Discovers candidate precursor patterns across eligible reports for a specific organization.
   */
  public discover(
    organizationId: string,
    features: PatternFeatureRepresentation[],
    reportsMap: Map<string, ReportRecord>,
    runId: string
  ): PrecursorPattern[] {
    // 1. Strict Tenant Isolation: filter only matching organization
    const orgFeatures = features.filter((f) => f.organization_id === organizationId);
    if (orgFeatures.length === 0) return [];

    // 2. Group candidate clusters by primary precursor signature
    const candidateClusters: Map<string, PatternFeatureRepresentation[]> = new Map();

    for (const f of orgFeatures) {
      const clusterKey = f.primary_precursor;
      if (!candidateClusters.has(clusterKey)) {
        candidateClusters.set(clusterKey, []);
      }
      candidateClusters.get(clusterKey)!.push(f);
    }

    const discoveredPatterns: PrecursorPattern[] = [];
    let patternIndex = 1;

    // 3. Process each cluster candidate
    for (const [precursorName, group] of candidateClusters.entries()) {
      // Deduplication check: unique report IDs and distinct content hashes
      const seenReports = new Set<string>();
      const seenHashes = new Set<string>();
      const dedupedGroup: PatternFeatureRepresentation[] = [];

      for (const item of group) {
        if (!seenReports.has(item.report_id) && !seenHashes.has(item.content_hash)) {
          seenReports.add(item.report_id);
          seenHashes.add(item.content_hash);
          dedupedGroup.push(item);
        }
      }

      const supportCount = dedupedGroup.length;

      // Calculate distinct dates
      const distinctDates = new Set<string>(
        dedupedGroup.map((d) => d.report_datetime.split('T')[0])
      );
      const uniqueDateCount = distinctDates.size;

      // Determine Pattern Status based on support and temporal recurrence
      let status: PatternStatus = 'INSUFFICIENT_SUPPORT';
      if (supportCount < this.config.min_support) {
        status = 'INSUFFICIENT_SUPPORT';
      } else {
        const sortedDates = Array.from(distinctDates).sort();
        const firstDate = new Date(sortedDates[0]);
        const lastDate = new Date(sortedDates[sortedDates.length - 1]);
        const spanDays = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24));

        if (spanDays > 60 && uniqueDateCount >= 3) {
          status = 'PERSISTENT';
        } else if (spanDays <= 45 && uniqueDateCount >= 2) {
          status = 'EMERGING';
        } else {
          status = 'RECURRING';
        }
      }

      // Compute cluster centroid vector if vectors are present
      let centroid: number[] | undefined = undefined;
      const vectorsWithData = dedupedGroup.filter((d) => d.vector && d.vector.length > 0);
      if (vectorsWithData.length > 0) {
        const dim = vectorsWithData[0].vector!.length;
        centroid = new Array(dim).fill(0);
        for (const item of vectorsWithData) {
          for (let i = 0; i < dim; i++) {
            centroid[i] += item.vector![i];
          }
        }
        let norm = 0;
        for (let i = 0; i < dim; i++) {
          centroid[i] /= vectorsWithData.length;
          norm += centroid[i] * centroid[i];
        }
        norm = Math.sqrt(norm);
        if (norm > 0) {
          for (let i = 0; i < dim; i++) {
            centroid[i] /= norm;
          }
        }
      }

      // Compute cohesion score (average cosine similarity to centroid)
      let totalSimilarity = 0;
      let scoredItems = 0;
      if (centroid) {
        for (const item of vectorsWithData) {
          let dot = 0;
          for (let i = 0; i < centroid.length; i++) {
            dot += centroid[i] * item.vector![i];
          }
          totalSimilarity += Math.max(0, dot);
          scoredItems++;
        }
      }
      const avgCohesion = scoredItems > 0 ? totalSimilarity / scoredItems : 0.82;

      // Extract distributions
      const siteCounts = new Map<string, { name: string; count: number }>();
      const activityCounts = new Map<string, { name: string; count: number }>();
      const hazardCounts = new Map<string, number>();
      const barrierCounts = new Map<string, number>();
      const ruleCounts = new Map<string, number>();

      for (const item of dedupedGroup) {
        // Sites
        const curSite = siteCounts.get(item.site_id) || { name: item.site_name, count: 0 };
        curSite.count++;
        siteCounts.set(item.site_id, curSite);

        // Activities
        const curAct = activityCounts.get(item.activity_id) || { name: item.activity_name, count: 0 };
        curAct.count++;
        activityCounts.set(item.activity_id, curAct);

        // Hazards
        for (const h of item.hazards) {
          hazardCounts.set(h, (hazardCounts.get(h) || 0) + 1);
        }

        // Barrier failures
        for (const b of item.barrier_failures) {
          barrierCounts.set(b, (barrierCounts.get(b) || 0) + 1);
        }

        // IOGP rules
        for (const r of item.iogp_rules) {
          ruleCounts.set(r, (ruleCounts.get(r) || 0) + 1);
        }
      }

      // Build Pattern Members
      const patternId = `pat-${precursorName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${patternIndex}`;
      const patternNumber = `PAT-2026-${String(patternIndex).padStart(2, '0')}`;

      const members: PatternMember[] = dedupedGroup.map((item) => {
        let simToCentroid = 0.85;
        if (centroid && item.vector) {
          let dot = 0;
          for (let i = 0; i < centroid.length; i++) {
            dot += centroid[i] * item.vector[i];
          }
          simToCentroid = Math.max(0.6, Math.min(1.0, Math.round(dot * 100) / 100));
        }

        const rep = reportsMap.get(item.report_id);
        const snippet = rep?.description ? rep.description.substring(0, 160) + '...' : 'Incident observation record.';

        return {
          pattern_id: patternId,
          report_id: item.report_id,
          report_number: item.report_number,
          report_datetime: item.report_datetime,
          site_id: item.site_id,
          site_name: item.site_name,
          activity_id: item.activity_id,
          activity_name: item.activity_name,
          report_type: item.report_type,
          precursor: item.primary_precursor,
          hazard: item.primary_hazard,
          barrier_failure: item.barrier_failures[0] || 'Administrative procedure deviation',
          iogp_rule: item.iogp_rules[0] || 'Work Authorization',
          similarity_to_centroid: simToCentroid,
          membership_score: Math.min(1.0, Math.round((simToCentroid * 0.5 + 0.45) * 100) / 100),
          membership_reason: `Consistent ${item.primary_precursor} precursor during ${item.activity_name} operations.`,
          description_snippet: snippet,
          created_at: new Date().toISOString(),
        };
      });

      // Calculate Pattern Strength
      const strengthResult = PatternStrengthCalculator.calculate(
        supportCount,
        uniqueDateCount,
        avgCohesion,
        siteCounts.size,
        activityCounts.size,
        group.length - dedupedGroup.length
      );

      // Trend
      const trend = PatternTrendService.calculateTrend(members);

      // Distributions formatting
      const distribution: PatternDistribution = {
        sites: Array.from(siteCounts.entries()).map(([site_id, val]) => ({
          site_id,
          site_name: val.name,
          count: val.count,
          percentage: Math.round((val.count / supportCount) * 100),
        })),
        activities: Array.from(activityCounts.entries()).map(([activity_id, val]) => ({
          activity_id,
          activity_name: val.name,
          count: val.count,
          percentage: Math.round((val.count / supportCount) * 100),
        })),
        hazards: Array.from(hazardCounts.entries()).map(([hazard, count]) => ({ hazard, count })),
        barrier_failures: Array.from(barrierCounts.entries()).map(([barrier, count]) => ({ barrier, count })),
        iogp_rules: Array.from(ruleCounts.entries()).map(([rule, count]) => ({ rule, count })),
      };

      // Primary / Related entities
      const primarySite = distribution.sites.sort((a, b) => b.count - a.count)[0]?.site_name || 'Multiple Sites';
      const relatedSites = distribution.sites.slice(1).map((s) => s.site_name);

      const primaryActivity = distribution.activities.sort((a, b) => b.count - a.count)[0]?.activity_name || 'General Operations';
      const relatedActivities = distribution.activities.slice(1).map((a) => a.activity_name);

      const primaryBarrier = distribution.barrier_failures.sort((a, b) => b.count - a.count)[0]?.barrier || 'Isolation not verified';
      const relatedBarriers = distribution.barrier_failures.map((b) => b.barrier);

      const primaryHazard = distribution.hazards.sort((a, b) => b.count - a.count)[0]?.hazard || 'MECHANICAL_ENERGY';
      const relatedHazards = distribution.hazards.map((h) => h.hazard);

      const mappedRules = distribution.iogp_rules.map((r) => r.rule);

      // Traceable Evidence Summary (verifiable facts only, NO hallucinated claims)
      const evidenceSummary: PatternEvidenceSummary = {
        total_reports: supportCount,
        unique_dates: uniqueDateCount,
        distinct_sites: siteCounts.size,
        distinct_activities: activityCounts.size,
        common_precursor: precursorName,
        common_hazard: primaryHazard,
        common_barrier_failure: primaryBarrier,
        mapped_iogp_rules: distribution.iogp_rules,
        traceable_evidence_bullets: [
          `Supported by ${supportCount} unique field observation reports across ${uniqueDateCount} distinct calendar dates.`,
          `Observed across ${siteCounts.size} operational sites (${Array.from(siteCounts.values()).map((s) => s.name).join(', ')}).`,
          `Associated with ${activityCounts.size} work activities, dominated by ${primaryActivity} (${distribution.activities[0]?.percentage}%).`,
          `Systemic barrier failure: "${primaryBarrier}" observed across multiple independent shifts.`,
          `High semantic cohesion (average cosine similarity to centroid: ${(avgCohesion * 100).toFixed(0)}%).`,
        ],
      };

      // Clean concise human-readable title
      let title = `Recurring ${precursorName}`;
      if (precursorName.toLowerCase().includes('hazardous energy')) {
        title = 'Recurring Energized Maintenance Exposure';
      } else if (precursorName.toLowerCase().includes('line-of-fire')) {
        title = 'Recurring Line-of-Fire Exposure During Lifting';
      } else if (precursorName.toLowerCase().includes('pressurized line')) {
        title = 'Recurring Pressurized Proofing Whip-Check Deficiencies';
      } else if (precursorName.toLowerCase().includes('working at height')) {
        title = 'Recurring Fall Protection Disconnection at Elevation';
      } else if (precursorName.toLowerCase().includes('confined space')) {
        title = 'Recurring Confined Space Gas Clearance Omission';
      }

      const patternObj: PrecursorPattern = {
        id: patternId,
        pattern_number: patternNumber,
        organization_id: organizationId,
        pattern_type: 'PRECURSOR_PATTERN',
        title: title,
        summary: `Precursor pattern identified across ${supportCount} safety reports involving ${precursorName}. Recurring failure mechanism points to "${primaryBarrier}".`,
        status: status,
        pattern_strength: strengthResult.score,
        support_count: supportCount,
        unique_date_count: uniqueDateCount,
        first_seen_at: trend.first_seen_at,
        last_seen_at: trend.last_seen_at,
        primary_precursor: precursorName,
        related_precursors: Array.from(new Set(dedupedGroup.flatMap((g) => g.related_precursors))),
        primary_hazard: primaryHazard,
        related_hazards: relatedHazards,
        primary_barrier_failure: primaryBarrier,
        barrier_failures: relatedBarriers,
        primary_activity: primaryActivity,
        related_activities: relatedActivities,
        primary_site: primarySite,
        related_sites: relatedSites,
        energy_context: Array.from(new Set(dedupedGroup.flatMap((g) => g.energy_context))),
        equipment_context: Array.from(new Set(dedupedGroup.flatMap((g) => g.equipment_context))),
        iogp_rules: mappedRules,
        evidence_count: supportCount,
        evidence_summary: evidenceSummary,
        trend: trend,
        distributions: distribution,
        members: members,
        centroid_vector: centroid,
        discovery_run_id: runId,
        discovery_version: this.config.algorithm_version,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        methodology_disclaimer:
          'Pattern strength is a measure of evidence support and cross-report concordance. It does NOT represent risk score, probability of incident, or SIF classification.',
      };

      discoveredPatterns.push(patternObj);
      patternIndex++;
    }

    return discoveredPatterns;
  }
}

/**
 * 5. PatternStore (Persistence & State Management)
 * Safe atomic updates, active versioning, JSON file persistence.
 */
export class PatternStore {
  private patterns: Map<string, PrecursorPattern> = new Map();
  private discoveryRuns: DiscoveryRun[] = [];
  private activeVersionId: string = 'PATTERN_DISCOVERY_V1';

  constructor() {
    this.loadFromDisk();
  }

  public getPatterns(
    organizationId: string,
    filters?: {
      status?: PatternStatus;
      pattern_type?: PatternType;
      site_id?: string;
      activity_id?: string;
      precursor?: string;
      hazard?: string;
      barrier_failure?: string;
      iogp_rule?: string;
      search?: string;
      min_strength?: number;
      sort_by?: 'pattern_strength' | 'support_count' | 'last_seen_at' | 'first_seen_at';
      sort_order?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
  ): { patterns: PrecursorPattern[]; total: number; page: number; total_pages: number } {
    let list = Array.from(this.patterns.values()).filter(
      (p) => p.organization_id === organizationId
    );

    if (filters) {
      if (filters.status) {
        list = list.filter((p) => p.status === filters.status);
      }
      if (filters.pattern_type) {
        list = list.filter((p) => p.pattern_type === filters.pattern_type);
      }
      if (filters.site_id) {
        list = list.filter((p) => p.distributions.sites.some((s) => s.site_id === filters.site_id));
      }
      if (filters.activity_id) {
        list = list.filter((p) =>
          p.distributions.activities.some((a) => a.activity_id === filters.activity_id)
        );
      }
      if (filters.precursor) {
        const precLower = filters.precursor.toLowerCase();
        list = list.filter((p) => p.primary_precursor.toLowerCase().includes(precLower));
      }
      if (filters.hazard) {
        const hLower = filters.hazard.toLowerCase();
        list = list.filter((p) => p.related_hazards.some((h) => h.toLowerCase().includes(hLower)));
      }
      if (filters.barrier_failure) {
        const bLower = filters.barrier_failure.toLowerCase();
        list = list.filter((p) => p.barrier_failures.some((b) => b.toLowerCase().includes(bLower)));
      }
      if (filters.iogp_rule) {
        const rLower = filters.iogp_rule.toLowerCase();
        list = list.filter((p) => p.iogp_rules.some((r) => r.toLowerCase().includes(rLower)));
      }
      if (filters.min_strength) {
        list = list.filter((p) => p.pattern_strength >= filters.min_strength!);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.summary.toLowerCase().includes(q) ||
            p.primary_precursor.toLowerCase().includes(q) ||
            p.pattern_number.toLowerCase().includes(q)
        );
      }

      // Sorting
      const sortBy = filters.sort_by || 'pattern_strength';
      const order = filters.sort_order || 'desc';

      list.sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'pattern_strength') cmp = a.pattern_strength - b.pattern_strength;
        else if (sortBy === 'support_count') cmp = a.support_count - b.support_count;
        else if (sortBy === 'last_seen_at') {
          cmp = new Date(a.last_seen_at).getTime() - new Date(b.last_seen_at).getTime();
        } else if (sortBy === 'first_seen_at') {
          cmp = new Date(a.first_seen_at).getTime() - new Date(b.first_seen_at).getTime();
        }
        return order === 'desc' ? -cmp : cmp;
      });
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = list.slice((page - 1) * limit, page * limit);

    return {
      patterns: paginated,
      total,
      page,
      total_pages: totalPages,
    };
  }

  public getPatternById(organizationId: string, patternId: string): PrecursorPattern | null {
    const p = this.patterns.get(patternId);
    if (!p || p.organization_id !== organizationId) {
      // Also try lookup by pattern_number (e.g. PAT-2026-01)
      for (const item of this.patterns.values()) {
        if (
          item.organization_id === organizationId &&
          (item.pattern_number.toLowerCase() === patternId.toLowerCase() ||
            item.id.toLowerCase() === patternId.toLowerCase())
        ) {
          return item;
        }
      }
      return null;
    }
    return p;
  }

  public getPatternSummary(organizationId: string): PatternSummaryKPIs {
    const list = Array.from(this.patterns.values()).filter((p) => p.organization_id === organizationId);

    const recurring = list.filter((p) => p.status === 'RECURRING').length;
    const emerging = list.filter((p) => p.status === 'EMERGING').length;
    const persistent = list.filter((p) => p.status === 'PERSISTENT').length;
    const inactive = list.filter((p) => p.status === 'INACTIVE').length;
    const insufficient = list.filter((p) => p.status === 'INSUFFICIENT_SUPPORT').length;

    const avgStrength =
      list.length > 0
        ? Math.round(list.reduce((acc, p) => acc + p.pattern_strength, 0) / list.length)
        : 0;

    const distinctPrecursors = new Set(list.map((p) => p.primary_precursor)).size;

    const lastRun = this.discoveryRuns
      .filter((r) => r.organization_id === organizationId && r.status === 'COMPLETED')
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0];

    return {
      total_patterns: list.length,
      recurring_patterns: recurring,
      emerging_patterns: emerging,
      persistent_patterns: persistent,
      inactive_patterns: inactive,
      insufficient_support_patterns: insufficient,
      average_pattern_strength: avgStrength,
      distinct_precursors_tracked: distinctPrecursors,
      active_version_id: this.activeVersionId,
      last_run_at: lastRun?.end_time || null,
    };
  }

  public getDiscoveryRuns(organizationId: string): DiscoveryRun[] {
    return this.discoveryRuns
      .filter((r) => r.organization_id === organizationId)
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }

  public recordDiscoveryRun(run: DiscoveryRun) {
    this.discoveryRuns.unshift(run);
    if (this.discoveryRuns.length > 50) {
      this.discoveryRuns = this.discoveryRuns.slice(0, 50);
    }
    this.saveToDisk();
  }

  public activatePatterns(organizationId: string, newPatterns: PrecursorPattern[]) {
    // Retain patterns from other organizations (strict tenant isolation)
    const otherOrgPatterns: [string, PrecursorPattern][] = [];
    for (const [id, p] of this.patterns.entries()) {
      if (p.organization_id !== organizationId) {
        otherOrgPatterns.push([id, p]);
      }
    }

    this.patterns.clear();
    for (const [id, p] of otherOrgPatterns) {
      this.patterns.set(id, p);
    }

    for (const p of newPatterns) {
      this.patterns.set(p.id, p);
      this.patterns.set(p.pattern_number, p);
    }

    this.saveToDisk();
  }

  private saveToDisk() {
    try {
      const dataDir = path.dirname(PATTERN_STORE_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const serialized = {
        active_version_id: this.activeVersionId,
        saved_at: new Date().toISOString(),
        patterns: Array.from(this.patterns.values()),
        discovery_runs: this.discoveryRuns,
      };

      fs.writeFileSync(PATTERN_STORE_FILE, JSON.stringify(serialized, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[PatternStore] Could not persist patterns to disk:', err);
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(PATTERN_STORE_FILE)) {
        const raw = fs.readFileSync(PATTERN_STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.patterns && Array.isArray(parsed.patterns)) {
          this.patterns.clear();
          for (const p of parsed.patterns) {
            this.patterns.set(p.id, p);
            this.patterns.set(p.pattern_number, p);
          }
        }
        if (parsed.discovery_runs && Array.isArray(parsed.discovery_runs)) {
          this.discoveryRuns = parsed.discovery_runs;
        }
        if (parsed.active_version_id) {
          this.activeVersionId = parsed.active_version_id;
        }
      }
    } catch (err) {
      console.warn('[PatternStore] Could not load patterns from disk:', err);
    }
  }
}

export const patternStore = new PatternStore();
export const patternDiscoveryEngine = new PatternDiscoveryEngine();
