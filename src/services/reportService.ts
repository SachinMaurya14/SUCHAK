/**
 * Report Service Foundation
 * Architecture connected to Phase 2+ persistence foundation.
 */
import { apiClient } from './apiClient.ts';
import {
  SafetyReport,
  ReportType,
  ProcessingStatus,
  ReviewStatus,
  BackendAnalysisResponse,
} from '../types/index.ts';

export interface ReportQueryParams {
  site?: string;
  reportType?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BackendReportItem {
  id: string;
  organization_id: string;
  report_number: string;
  report_type: string;
  site_id: string;
  location_id?: string | null;
  activity_id?: string | null;
  report_datetime: string;
  description: string;
  actual_outcome?: string | null;
  processing_status: string;
  review_status: string;
  source: string;
  created_at: string;
  updated_at: string;
  site?: {
    id: string;
    name: string;
    code: string;
    site_type: string;
  } | null;
  location?: {
    id: string;
    name: string;
    code: string;
  } | null;
  activity?: {
    id: string;
    name: string;
    code: string;
    category: string;
    risk_level_baseline: string;
  } | null;
  attachments_count?: number;
  latest_analysis?: BackendAnalysisResponse | null;
}

function mapBackendToSafetyReport(item: BackendReportItem): SafetyReport {
  return {
    id: item.report_number || item.id,
    organizationId: item.organization_id,
    siteId: item.site_id,
    siteName: item.site?.name || 'Operational Facility',
    location: item.location?.name || 'Primary Operational Area',
    activity: item.activity?.name || 'Standard Field Operation',
    reportType: (item.report_type as ReportType) || 'Near-Miss',
    dateTime: item.report_datetime ? item.report_datetime.replace('T', ' ').substring(0, 16) : new Date().toISOString().substring(0, 16),
    description: item.description,
    actualOutcome: item.actual_outcome || undefined,
    processingStatus: (item.processing_status as ProcessingStatus) || 'Pending',
    reviewStatus: (item.review_status as ReviewStatus) || 'Unreviewed',
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    latestAnalysis: item.latest_analysis || null,
  };
}

export const reportService = {
  async getReports(params?: ReportQueryParams): Promise<{ reports: SafetyReport[]; total: number }> {
    try {
      const res = await apiClient<{ items?: BackendReportItem[]; reports?: SafetyReport[]; total: number }>(
        '/api/v1/reports',
        {
          params: {
            page: params?.page,
            page_size: params?.limit || 20,
            search: params?.search,
            report_type: params?.reportType !== 'ALL' ? params?.reportType : undefined,
            review_status: params?.status !== 'ALL' ? params?.status : undefined,
          },
        }
      );

      if (res.items && Array.isArray(res.items)) {
        return {
          reports: res.items.map(mapBackendToSafetyReport),
          total: res.total || res.items.length,
        };
      }

      if (res.reports && Array.isArray(res.reports)) {
        return {
          reports: res.reports,
          total: res.total || res.reports.length,
        };
      }

      return { reports: [], total: 0 };
    } catch (err) {
      console.warn('[reportService] getReports fallback due to:', err);
      return { reports: [], total: 0 };
    }
  },

  async getReportById(id: string): Promise<SafetyReport> {
    const res = await apiClient<BackendReportItem | SafetyReport>(`/api/v1/reports/${id}`);
    if ('report_number' in res) {
      return mapBackendToSafetyReport(res as BackendReportItem);
    }
    return res as SafetyReport;
  },

  async submitReport(report: Partial<SafetyReport>): Promise<SafetyReport> {
    const payload = {
      report_type: report.reportType || 'Near Miss',
      description: report.description,
      actual_outcome: report.actualOutcome,
      report_datetime: report.dateTime || new Date().toISOString(),
      site_id: report.siteId,
      activity_id: undefined,
      location_id: undefined,
    };
    return apiClient<SafetyReport>('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getSites() {
    return apiClient<Array<{ id: string; name: string; code: string; site_type: string }>>('/api/v1/sites');
  },

  async getActivities() {
    return apiClient<Array<{ id: string; name: string; code: string; category: string }>>('/api/v1/activities');
  },

  async getReportTypes() {
    return apiClient<string[]>('/api/v1/report-types');
  },

  async analyzeReport(id: string): Promise<BackendAnalysisResponse> {
    return apiClient<BackendAnalysisResponse>(`/api/v1/reports/${id}/analyze`, {
      method: 'POST',
    });
  },

  async reanalyzeReport(id: string): Promise<BackendAnalysisResponse> {
    return apiClient<BackendAnalysisResponse>(`/api/v1/reports/${id}/reanalyze`, {
      method: 'POST',
    });
  },

  async getReportAnalysis(id: string): Promise<BackendAnalysisResponse> {
    return apiClient<BackendAnalysisResponse>(`/api/v1/reports/${id}/analysis`);
  },

  async getReportAnalysisHistory(id: string): Promise<BackendAnalysisResponse[]> {
    return apiClient<BackendAnalysisResponse[]>(`/api/v1/reports/${id}/analysis/history`);
  },
};
