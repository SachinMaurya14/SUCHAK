import { PriorityBand } from './riskPolicy.ts';
import { ReportRecord, SiteRecord, ActivityRecord } from './dataStore.ts';
import { RiskAssessmentRecord } from './riskIntelligenceService.ts';

export interface PriorityDistribution {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
  NEEDS_REVIEW: number;
}

export interface SiteRiskAggregation {
  site_id: string;
  site_name: string;
  site_code: string;
  site_type: string;
  total_reports: number;
  sif_reports: number;
  sif_precursor_density: number; // 0.000 to 1.000 (Prototype Metric)
  sif_precursor_density_pct: number; // 0.0 to 100.0 %
  average_score: number;
  priority_distribution: PriorityDistribution;
  dominant_priority: PriorityBand;
  sample_count: number;
  sample_sufficiency: 'SUFFICIENT' | 'INSUFFICIENT_DATA';
  time_window: {
    start_date?: string;
    end_date?: string;
    window_preset?: string;
  };
  metric_disclaimer: string;
}

export interface ActivityRiskAggregation {
  activity_id: string;
  activity_name: string;
  activity_code: string;
  category: string;
  total_reports: number;
  sif_reports: number;
  sif_precursor_density: number;
  sif_precursor_density_pct: number;
  average_score: number;
  priority_distribution: PriorityDistribution;
  dominant_priority: PriorityBand;
  sample_count: number;
  sample_sufficiency: 'SUFFICIENT' | 'INSUFFICIENT_DATA';
  time_window: {
    start_date?: string;
    end_date?: string;
    window_preset?: string;
  };
  metric_disclaimer: string;
}

export class RiskAggregationService {
  private minimumSampleThreshold = 5;

  private filterByDateRange(
    reports: ReportRecord[],
    options?: {
      start_date?: string;
      end_date?: string;
      window_preset?: string; // '7d' | '30d' | '90d' | '1y' | 'all'
    }
  ): { filtered: ReportRecord[]; startIso?: string; endIso?: string } {
    if (!options) return { filtered: reports };

    let start: Date | null = null;
    let end: Date = new Date();

    if (options.end_date) {
      end = new Date(options.end_date);
    }

    if (options.window_preset && options.window_preset !== 'all') {
      const now = end.getTime();
      if (options.window_preset === '7d') start = new Date(now - 7 * 86400000);
      else if (options.window_preset === '30d') start = new Date(now - 30 * 86400000);
      else if (options.window_preset === '90d') start = new Date(now - 90 * 86400000);
      else if (options.window_preset === '1y') start = new Date(now - 365 * 86400000);
    } else if (options.start_date) {
      start = new Date(options.start_date);
    }

    if (!start) return { filtered: reports, endIso: end.toISOString() };

    const startMs = start.getTime();
    const endMs = end.getTime();

    const filtered = reports.filter((r) => {
      const rTime = new Date(r.report_datetime || r.created_at).getTime();
      return rTime >= startMs && rTime <= endMs;
    });

    return {
      filtered,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }

  calculateSiteAggregations(
    sites: SiteRecord[],
    reports: ReportRecord[],
    getAssessmentFn: (reportId: string) => RiskAssessmentRecord | null,
    options?: {
      organization_id?: string;
      start_date?: string;
      end_date?: string;
      window_preset?: string;
      min_sample?: number;
    }
  ): SiteRiskAggregation[] {
    const minThreshold = options?.min_sample ?? this.minimumSampleThreshold;
    const orgId = options?.organization_id || 'oil-india-demo';

    // Organization filter
    let orgReports = reports.filter((r) => !r.organization_id || r.organization_id === orgId);

    // Date range filter
    const { filtered, startIso, endIso } = this.filterByDateRange(orgReports, options);

    const siteAggregations: SiteRiskAggregation[] = [];

    for (const site of sites) {
      const siteReports = filtered.filter(
        (r) => r.site_id === site.id || r.site?.code === site.code || r.site?.id === site.id
      );

      const sampleCount = siteReports.length;
      let sifCount = 0;
      let totalScore = 0;
      let assessedCount = 0;

      const priorityDist: PriorityDistribution = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
        NEEDS_REVIEW: 0,
      };

      for (const r of siteReports) {
        const assessment = getAssessmentFn(r.id);
        const isSif =
          r.latest_analysis?.classification === 'SIF_POTENTIAL' ||
          r.latest_analysis?.sif_potential === true;
        if (isSif) sifCount++;

        if (assessment) {
          totalScore += assessment.score;
          assessedCount++;
          if (priorityDist[assessment.priority] !== undefined) {
            priorityDist[assessment.priority]++;
          }
        } else if (r.latest_analysis) {
          const prio = r.latest_analysis.priority;
          if (priorityDist[prio as PriorityBand] !== undefined) {
            priorityDist[prio as PriorityBand]++;
          }
        }
      }

      const density = sampleCount > 0 ? sifCount / sampleCount : 0;
      const densityPct = Math.round(density * 1000) / 10;
      const avgScore = assessedCount > 0 ? Math.round(totalScore / assessedCount) : 0;

      // Determine dominant priority
      let dominantPriority: PriorityBand = 'LOW';
      if (priorityDist.CRITICAL > 0 || density >= 0.25) dominantPriority = 'CRITICAL';
      else if (priorityDist.HIGH > 0 || density >= 0.15) dominantPriority = 'HIGH';
      else if (priorityDist.MEDIUM > 0 || density >= 0.08) dominantPriority = 'MEDIUM';
      else if (priorityDist.NEEDS_REVIEW > 0) dominantPriority = 'NEEDS_REVIEW';

      siteAggregations.push({
        site_id: site.id,
        site_name: site.name,
        site_code: site.code,
        site_type: site.site_type,
        total_reports: sampleCount,
        sif_reports: sifCount,
        sif_precursor_density: Math.round(density * 1000) / 1000,
        sif_precursor_density_pct: densityPct,
        average_score: avgScore,
        priority_distribution: priorityDist,
        dominant_priority: dominantPriority,
        sample_count: sampleCount,
        sample_sufficiency: sampleCount >= minThreshold ? 'SUFFICIENT' : 'INSUFFICIENT_DATA',
        time_window: {
          start_date: startIso,
          end_date: endIso,
          window_preset: options?.window_preset || '30d',
        },
        metric_disclaimer:
          'SUCHAK Prototype Metric: SIF Precursor Density represents the ratio of SIF-potential reports to total sample count. Not an official OIL risk formula.',
      });
    }

    // Sort by SIF Precursor Density descending
    return siteAggregations.sort((a, b) => b.sif_precursor_density - a.sif_precursor_density);
  }

  calculateActivityAggregations(
    activities: ActivityRecord[],
    reports: ReportRecord[],
    getAssessmentFn: (reportId: string) => RiskAssessmentRecord | null,
    options?: {
      organization_id?: string;
      start_date?: string;
      end_date?: string;
      window_preset?: string;
      min_sample?: number;
    }
  ): ActivityRiskAggregation[] {
    const minThreshold = options?.min_sample ?? this.minimumSampleThreshold;
    const orgId = options?.organization_id || 'oil-india-demo';

    let orgReports = reports.filter((r) => !r.organization_id || r.organization_id === orgId);
    const { filtered, startIso, endIso } = this.filterByDateRange(orgReports, options);

    const activityAggregations: ActivityRiskAggregation[] = [];

    for (const act of activities) {
      const actReports = filtered.filter(
        (r) => r.activity_id === act.id || r.activity?.code === act.code || r.activity?.id === act.id
      );

      const sampleCount = actReports.length;
      let sifCount = 0;
      let totalScore = 0;
      let assessedCount = 0;

      const priorityDist: PriorityDistribution = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
        NEEDS_REVIEW: 0,
      };

      for (const r of actReports) {
        const assessment = getAssessmentFn(r.id);
        const isSif =
          r.latest_analysis?.classification === 'SIF_POTENTIAL' ||
          r.latest_analysis?.sif_potential === true;
        if (isSif) sifCount++;

        if (assessment) {
          totalScore += assessment.score;
          assessedCount++;
          if (priorityDist[assessment.priority] !== undefined) {
            priorityDist[assessment.priority]++;
          }
        } else if (r.latest_analysis) {
          const prio = r.latest_analysis.priority;
          if (priorityDist[prio as PriorityBand] !== undefined) {
            priorityDist[prio as PriorityBand]++;
          }
        }
      }

      const density = sampleCount > 0 ? sifCount / sampleCount : 0;
      const densityPct = Math.round(density * 1000) / 10;
      const avgScore = assessedCount > 0 ? Math.round(totalScore / assessedCount) : 0;

      let dominantPriority: PriorityBand = 'LOW';
      if (priorityDist.CRITICAL > 0 || density >= 0.25) dominantPriority = 'CRITICAL';
      else if (priorityDist.HIGH > 0 || density >= 0.15) dominantPriority = 'HIGH';
      else if (priorityDist.MEDIUM > 0 || density >= 0.08) dominantPriority = 'MEDIUM';
      else if (priorityDist.NEEDS_REVIEW > 0) dominantPriority = 'NEEDS_REVIEW';

      activityAggregations.push({
        activity_id: act.id,
        activity_name: act.name,
        activity_code: act.code,
        category: act.category,
        total_reports: sampleCount,
        sif_reports: sifCount,
        sif_precursor_density: Math.round(density * 1000) / 1000,
        sif_precursor_density_pct: densityPct,
        average_score: avgScore,
        priority_distribution: priorityDist,
        dominant_priority: dominantPriority,
        sample_count: sampleCount,
        sample_sufficiency: sampleCount >= minThreshold ? 'SUFFICIENT' : 'INSUFFICIENT_DATA',
        time_window: {
          start_date: startIso,
          end_date: endIso,
          window_preset: options?.window_preset || '30d',
        },
        metric_disclaimer:
          'SUCHAK Prototype Metric: SIF Precursor Density represents the ratio of SIF-potential reports to total sample count. Not an official OIL risk formula.',
      });
    }

    return activityAggregations.sort((a, b) => b.sif_precursor_density - a.sif_precursor_density);
  }
}

export const riskAggregationService = new RiskAggregationService();
