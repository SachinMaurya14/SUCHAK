/**
 * Analytics Service Foundation
 * Architecture stub for Phase 2+ metrics aggregation.
 */
import { apiClient } from './apiClient.ts';

export interface OverviewMetrics {
  totalReports: number;
  sifPotentialCount: number;
  highPriorityCount: number;
  openActionsCount: number;
  recurringPatternsCount: number;
  sitesMonitoredCount: number;
}

export const analyticsService = {
  async getOverviewMetrics(): Promise<OverviewMetrics> {
    return apiClient<OverviewMetrics>('/api/v1/analytics/overview');
  },
};
