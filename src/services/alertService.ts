import { apiClient } from './apiClient.ts';
import {
  Alert,
  AlertListQuery,
  AlertMetrics,
  AlertRule,
  UserNotificationPreferences,
  OrganizationAlertPolicy,
  AlertAuditRecord,
} from '../types/alert.ts';
import { authService } from './authService.ts';

export const alertService = {
  async getAlerts(query: AlertListQuery = {}) {
    const params: Record<string, string> = {
      organization_id: query.organization_id || 'oil-india-demo',
      page: String(query.page || 1),
      page_size: String(query.page_size || 15),
    };

    if (query.severity) params.severity = query.severity;
    if (query.status) params.status = query.status;
    if (query.category) params.category = query.category;
    if (query.event_type) params.event_type = query.event_type;
    if (query.source_type) params.source_type = query.source_type;
    if (query.site_id) params.site_id = query.site_id;
    if (query.target_user_id) params.target_user_id = query.target_user_id;
    if (query.unread_only) params.unread_only = 'true';
    if (query.search) params.search = query.search;
    if (query.sort_by) params.sort_by = query.sort_by;
    if (query.sort_dir) params.sort_dir = query.sort_dir;

    return apiClient<{
      items: Alert[];
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    }>('/api/v1/alerts', {
      params,
    });
  },

  async getAlertMetrics(orgId: string = 'oil-india-demo'): Promise<AlertMetrics> {
    return apiClient<AlertMetrics>('/api/v1/alerts/metrics', {
      params: { organization_id: orgId },
    });
  },

  async getAlert(id: string, orgId: string = 'oil-india-demo'): Promise<{ alert: Alert; audit_history: AlertAuditRecord[] }> {
    return apiClient<{ alert: Alert; audit_history: AlertAuditRecord[] }>(`/api/v1/alerts/${id}`, {
      params: { organization_id: orgId },
    });
  },

  async markAsRead(id: string, orgId: string = 'oil-india-demo'): Promise<Alert> {
    const user = authService.getCurrentUser();
    return apiClient<Alert>(`/api/v1/alerts/${id}/read`, {
      method: 'POST',
      body: JSON.stringify({
        organization_id: orgId,
        actor: { id: user.id, name: user.name, role: user.role, email: user.email },
      }),
    });
  },

  async acknowledgeAlert(id: string, note?: string, orgId: string = 'oil-india-demo'): Promise<Alert> {
    const user = authService.getCurrentUser();
    return apiClient<Alert>(`/api/v1/alerts/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({
        organization_id: orgId,
        actor: { id: user.id, name: user.name, role: user.role, email: user.email },
        note,
      }),
    });
  },

  async dismissAlert(id: string, reason: string, orgId: string = 'oil-india-demo'): Promise<Alert> {
    const user = authService.getCurrentUser();
    return apiClient<Alert>(`/api/v1/alerts/${id}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({
        organization_id: orgId,
        actor: { id: user.id, name: user.name, role: user.role, email: user.email },
        reason,
      }),
    });
  },

  async resolveAlert(id: string, resolutionNote: string, orgId: string = 'oil-india-demo'): Promise<Alert> {
    const user = authService.getCurrentUser();
    return apiClient<Alert>(`/api/v1/alerts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({
        organization_id: orgId,
        actor: { id: user.id, name: user.name, role: user.role, email: user.email },
        resolution_note: resolutionNote,
      }),
    });
  },

  async escalateAlert(id: string, reason: string, targetRole?: string, orgId: string = 'oil-india-demo'): Promise<Alert> {
    const user = authService.getCurrentUser();
    return apiClient<Alert>(`/api/v1/alerts/${id}/escalate`, {
      method: 'POST',
      body: JSON.stringify({
        organization_id: orgId,
        actor: { id: user.id, name: user.name, role: user.role, email: user.email },
        reason,
        target_role: targetRole,
      }),
    });
  },

  async triggerEvaluationCycle(orgId: string = 'oil-india-demo') {
    return apiClient<{
      evaluated_at: string;
      alerts_generated: number;
      outbox: { processed: number; sent: number; failed: number };
      active_metrics: AlertMetrics;
    }>('/api/v1/alerts/evaluate-cycle', {
      method: 'POST',
      body: JSON.stringify({ organization_id: orgId }),
    });
  },

  async getRules(orgId: string = 'oil-india-demo'): Promise<AlertRule[]> {
    return apiClient<AlertRule[]>('/api/v1/alerts/rules', {
      params: { organization_id: orgId },
    });
  },

  async updateRule(id: string, updates: Partial<AlertRule>, orgId: string = 'oil-india-demo'): Promise<AlertRule> {
    const user = authService.getCurrentUser();
    return apiClient<AlertRule>(`/api/v1/alerts/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        organization_id: orgId,
        actor: { id: user.id, name: user.name, role: user.role },
        updates,
      }),
    });
  },

  async getUserPreferences(orgId: string = 'oil-india-demo'): Promise<UserNotificationPreferences> {
    const user = authService.getCurrentUser();
    return apiClient<UserNotificationPreferences>('/api/v1/alerts/preferences', {
      params: {
        organization_id: orgId,
        user_id: user.id,
      },
    });
  },

  async updateUserPreferences(preferences: Partial<UserNotificationPreferences>, orgId: string = 'oil-india-demo'): Promise<UserNotificationPreferences> {
    const user = authService.getCurrentUser();
    return apiClient<UserNotificationPreferences>('/api/v1/alerts/preferences', {
      method: 'PUT',
      body: JSON.stringify({
        organization_id: orgId,
        user_id: user.id,
        preferences,
      }),
    });
  },

  async getOrgPolicy(orgId: string = 'oil-india-demo'): Promise<OrganizationAlertPolicy> {
    return apiClient<OrganizationAlertPolicy>('/api/v1/alerts/policy', {
      params: { organization_id: orgId },
    });
  },

  async updateOrgPolicy(policy: Partial<OrganizationAlertPolicy>, orgId: string = 'oil-india-demo'): Promise<OrganizationAlertPolicy> {
    return apiClient<OrganizationAlertPolicy>('/api/v1/alerts/policy', {
      method: 'PUT',
      body: JSON.stringify({
        organization_id: orgId,
        policy,
      }),
    });
  },

  async getOutboxStats(orgId: string = 'oil-india-demo') {
    return apiClient<{
      total: number;
      sent: number;
      pending: number;
      retrying: number;
      failed: number;
      recent: any[];
    }>('/api/v1/alerts/outbox', {
      params: { organization_id: orgId },
    });
  },

  async processOutbox() {
    return apiClient<{ processed: number; sent: number; failed: number }>('/api/v1/alerts/outbox/process', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};
