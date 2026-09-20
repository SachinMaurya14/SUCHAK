import { apiClient } from './apiClient.ts';
import {
  ActionRecord,
  ActionSummaryKPIs,
  CreateActionPayload,
  ActionFilterParams,
  PaginatedActionResponse,
  ActionEvent,
  ActionComment,
  ActionEvidence,
  ActionPriority,
} from '../types/action.ts';

export const actionService = {
  /**
   * Retrieves summary KPI metrics for Action Center.
   */
  async getSummary(organizationId = 'oil-india-demo'): Promise<ActionSummaryKPIs> {
    return apiClient<ActionSummaryKPIs>('/api/v1/actions/summary', {
      params: { organization_id: organizationId },
    });
  },

  /**
   * Queries actions with filtering, search, and pagination.
   */
  async getActions(filters: ActionFilterParams = {}): Promise<PaginatedActionResponse> {
    const params: Record<string, any> = {
      organization_id: filters.organization_id || 'oil-india-demo',
      page: filters.page || 1,
      page_size: filters.page_size || 20,
    };

    if (filters.status && filters.status !== 'ALL') params.status = filters.status;
    if (filters.priority && filters.priority !== 'ALL') params.priority = filters.priority;
    if (filters.action_type && filters.action_type !== 'ALL') params.action_type = filters.action_type;
    if (filters.owner_id) params.owner_id = filters.owner_id;
    if (filters.site_id) params.site_id = filters.site_id;
    if (filters.source_report_id) params.source_report_id = filters.source_report_id;
    if (filters.source_pattern_id) params.source_pattern_id = filters.source_pattern_id;
    if (filters.overdue_only) params.overdue_only = 'true';
    if (filters.verification_required_only) params.verification_required_only = 'true';
    if (filters.search) params.search = filters.search;
    if (filters.sort_by) params.sort_by = filters.sort_by;
    if (filters.sort_direction) params.sort_direction = filters.sort_direction;

    return apiClient<PaginatedActionResponse>('/api/v1/actions', { params });
  },

  /**
   * Retrieves actions assigned to current user.
   */
  async getMyActions(userId?: string, organizationId = 'oil-india-demo'): Promise<ActionRecord[]> {
    return apiClient<ActionRecord[]>('/api/v1/actions/my', {
      params: { organization_id: organizationId, user_id: userId },
    });
  },

  /**
   * Retrieves actions currently waiting for independent verification.
   */
  async getVerificationQueue(organizationId = 'oil-india-demo'): Promise<ActionRecord[]> {
    return apiClient<ActionRecord[]>('/api/v1/actions/verification-queue', {
      params: { organization_id: organizationId },
    });
  },

  /**
   * Retrieves detailed single action.
   */
  async getActionById(actionId: string, organizationId = 'oil-india-demo'): Promise<ActionRecord> {
    return apiClient<ActionRecord>(`/api/v1/actions/${actionId}`, {
      params: { organization_id: organizationId },
    });
  },

  /**
   * Creates a new corrective or preventive action.
   */
  async createAction(payload: CreateActionPayload): Promise<ActionRecord> {
    return apiClient<ActionRecord>('/api/v1/actions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Patches action core properties (priority, due date, owner, progress).
   */
  async updateAction(
    actionId: string,
    patch: {
      title?: string;
      description?: string;
      priority?: ActionPriority;
      due_at?: string;
      due_date_change_reason?: string;
      owner_user_id?: string;
      owner_team_name?: string;
      progress_pct?: number;
      expected_version?: string;
    },
    organizationId = 'oil-india-demo'
  ): Promise<ActionRecord> {
    return apiClient<ActionRecord>(`/api/v1/actions/${actionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...patch, organization_id: organizationId }),
    });
  },

  /**
   * Assigns action to user or team.
   */
  async assignAction(
    actionId: string,
    assigneeId: string,
    teamName?: string,
    organizationId = 'oil-india-demo'
  ): Promise<ActionRecord> {
    return apiClient<ActionRecord>(`/api/v1/actions/${actionId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignee_id: assigneeId, team_name: teamName, organization_id: organizationId }),
    });
  },

  /**
   * Transitions action to IN_PROGRESS.
   */
  async startAction(actionId: string, organizationId = 'oil-india-demo'): Promise<ActionRecord> {
    return apiClient<ActionRecord>(`/api/v1/actions/${actionId}/start`, {
      method: 'POST',
      body: JSON.stringify({ organization_id: organizationId }),
    });
  },

  /**
   * Marks action as COMPLETED with remediation summary.
   */
  async completeAction(
    actionId: string,
    completionSummary: string,
    organizationId = 'oil-india-demo'
  ): Promise<ActionRecord> {
    return apiClient<ActionRecord>(`/api/v1/actions/${actionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ completion_summary: completionSummary, organization_id: organizationId }),
    });
  },

  /**
   * Submits independent verification decision.
   */
  async verifyAction(
    actionId: string,
    verified: boolean,
    notes: string,
    organizationId = 'oil-india-demo'
  ): Promise<ActionRecord> {
    return apiClient<ActionRecord>(`/api/v1/actions/${actionId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verified, notes, organization_id: organizationId }),
    });
  },

  /**
   * Final sign-off closure of verified action.
   */
  async closeAction(
    actionId: string,
    closureSummary: string,
    organizationId = 'oil-india-demo'
  ): Promise<ActionRecord> {
    return apiClient<ActionRecord>(`/api/v1/actions/${actionId}/close`, {
      method: 'POST',
      body: JSON.stringify({ closure_summary: closureSummary, organization_id: organizationId }),
    });
  },

  /**
   * Reopens an action with reason.
   */
  async reopenAction(
    actionId: string,
    reason: string,
    organizationId = 'oil-india-demo'
  ): Promise<ActionRecord> {
    return apiClient<ActionRecord>(`/api/v1/actions/${actionId}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason, organization_id: organizationId }),
    });
  },

  /**
   * Cancels an action with reason.
   */
  async cancelAction(
    actionId: string,
    reason: string,
    organizationId = 'oil-india-demo'
  ): Promise<ActionRecord> {
    return apiClient<ActionRecord>(`/api/v1/actions/${actionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason, organization_id: organizationId }),
    });
  },

  /**
   * Appends an operational comment.
   */
  async addComment(
    actionId: string,
    content: string,
    organizationId = 'oil-india-demo'
  ): Promise<ActionComment> {
    return apiClient<ActionComment>(`/api/v1/actions/${actionId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, organization_id: organizationId }),
    });
  },

  /**
   * Uploads evidence metadata.
   */
  async addEvidence(
    actionId: string,
    evidence: {
      file_name: string;
      media_type?: string;
      file_size?: number;
      evidence_type: 'IMPLEMENTATION' | 'VERIFICATION';
      description: string;
    },
    organizationId = 'oil-india-demo'
  ): Promise<ActionEvidence> {
    return apiClient<ActionEvidence>(`/api/v1/actions/${actionId}/evidence`, {
      method: 'POST',
      body: JSON.stringify({ ...evidence, organization_id: organizationId }),
    });
  },

  /**
   * Retrieves audit timeline history.
   */
  async getHistory(actionId: string, organizationId = 'oil-india-demo'): Promise<ActionEvent[]> {
    return apiClient<ActionEvent[]>(`/api/v1/actions/${actionId}/history`, {
      params: { organization_id: organizationId },
    });
  },

  /**
   * Gets actions linked to a specific report.
   */
  async getActionsByReportId(reportId: string, organizationId = 'oil-india-demo'): Promise<ActionRecord[]> {
    return apiClient<ActionRecord[]>(`/api/v1/reports/${reportId}/actions`, {
      params: { organization_id: organizationId },
    });
  },

  /**
   * Gets actions linked to a specific pattern.
   */
  async getActionsByPatternId(patternId: string, organizationId = 'oil-india-demo'): Promise<ActionRecord[]> {
    return apiClient<ActionRecord[]>(`/api/v1/patterns/${patternId}/actions`, {
      params: { organization_id: organizationId },
    });
  },
};
