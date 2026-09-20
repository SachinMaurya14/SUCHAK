import {
  ClientReviewQueueItem,
  ClientReviewSummaryKPIs,
  ClientReviewWorkspacePayload,
  AllowedCorrectionField,
} from '../types/review.ts';

const DEFAULT_ORG = 'oil-india-demo';

export const reviewService = {
  async getSummary(orgId = DEFAULT_ORG): Promise<ClientReviewSummaryKPIs> {
    const res = await fetch(`/api/v1/reviews/summary?organization_id=${encodeURIComponent(orgId)}`);
    if (!res.ok) throw new Error('Failed to fetch review summary');
    return res.json();
  },

  async getReviewers(): Promise<Array<{ id: string; name: string; email: string; role: string; site: string }>> {
    const res = await fetch('/api/v1/reviews/reviewers');
    if (!res.ok) throw new Error('Failed to fetch reviewers');
    return res.json();
  },

  async getReviews(params: {
    organization_id?: string;
    status?: string;
    assigned_to?: string;
    site_id?: string;
    activity_id?: string;
    sif_classification?: string;
    priority_band?: string;
    search_query?: string;
    sort_by?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    reviews: ClientReviewQueueItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const query = new URLSearchParams();
    query.set('organization_id', params.organization_id || DEFAULT_ORG);
    if (params.status) query.set('status', params.status);
    if (params.assigned_to) query.set('assigned_to', params.assigned_to);
    if (params.site_id) query.set('site_id', params.site_id);
    if (params.activity_id) query.set('activity_id', params.activity_id);
    if (params.sif_classification) query.set('sif_classification', params.sif_classification);
    if (params.priority_band) query.set('priority_band', params.priority_band);
    if (params.search_query) query.set('search_query', params.search_query);
    if (params.sort_by) query.set('sort_by', params.sort_by);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`/api/v1/reviews?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch review queue');
    return res.json();
  },

  async getMyQueue(orgId = DEFAULT_ORG): Promise<{ reviews: ClientReviewQueueItem[]; total: number }> {
    const res = await fetch(`/api/v1/reviews/my-queue?organization_id=${encodeURIComponent(orgId)}`);
    if (!res.ok) throw new Error('Failed to fetch personal review queue');
    return res.json();
  },

  async getReviewWorkspace(reviewId: string, orgId = DEFAULT_ORG): Promise<ClientReviewWorkspacePayload> {
    const res = await fetch(`/api/v1/reviews/${encodeURIComponent(reviewId)}?organization_id=${encodeURIComponent(orgId)}`);
    if (!res.ok) throw new Error('Failed to fetch review workspace');
    return res.json();
  },

  async assignReview(reviewId: string, reviewerId: string, orgId = DEFAULT_ORG): Promise<any> {
    const res = await fetch(`/api/v1/reviews/${encodeURIComponent(reviewId)}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer_id: reviewerId, organization_id: orgId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Assignment failed' }));
      throw new Error(err.error || 'Assignment failed');
    }
    return res.json();
  },

  async startReview(reviewId: string, orgId = DEFAULT_ORG): Promise<any> {
    const res = await fetch(`/api/v1/reviews/${encodeURIComponent(reviewId)}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organization_id: orgId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Start review failed' }));
      throw new Error(err.error || 'Start review failed');
    }
    return res.json();
  },

  async addComment(
    reviewId: string,
    content: string,
    fieldRef?: string,
    orgId = DEFAULT_ORG
  ): Promise<any> {
    const res = await fetch(`/api/v1/reviews/${encodeURIComponent(reviewId)}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, field_ref: fieldRef, organization_id: orgId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Add comment failed' }));
      throw new Error(err.error || 'Add comment failed');
    }
    return res.json();
  },

  async stageCorrection(
    reviewId: string,
    field: AllowedCorrectionField,
    aiValue: any,
    reviewedValue: any,
    reason: string,
    orgId = DEFAULT_ORG
  ): Promise<any> {
    const res = await fetch(`/api/v1/reviews/${encodeURIComponent(reviewId)}/correct-field`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field,
        ai_value: aiValue,
        reviewed_value: reviewedValue,
        reason,
        organization_id: orgId,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Stage correction failed' }));
      throw new Error(err.error || 'Stage correction failed');
    }
    return res.json();
  },

  async removeCorrection(reviewId: string, correctionId: string, orgId = DEFAULT_ORG): Promise<any> {
    const res = await fetch(
      `/api/v1/reviews/${encodeURIComponent(reviewId)}/corrections/${encodeURIComponent(correctionId)}?organization_id=${encodeURIComponent(orgId)}`,
      { method: 'DELETE' }
    );
    if (!res.ok) throw new Error('Remove correction failed');
    return res.json();
  },

  async confirmReview(reviewId: string, summary?: string, orgId = DEFAULT_ORG): Promise<any> {
    const res = await fetch(`/api/v1/reviews/${encodeURIComponent(reviewId)}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary, organization_id: orgId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Confirmation failed' }));
      throw new Error(err.error || 'Confirmation failed');
    }
    return res.json();
  },

  async correctReview(reviewId: string, summary: string, orgId = DEFAULT_ORG): Promise<any> {
    const res = await fetch(`/api/v1/reviews/${encodeURIComponent(reviewId)}/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary, organization_id: orgId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Correction failed' }));
      throw new Error(err.error || 'Correction failed');
    }
    return res.json();
  },

  async rejectReview(reviewId: string, reason: string, orgId = DEFAULT_ORG): Promise<any> {
    const res = await fetch(`/api/v1/reviews/${encodeURIComponent(reviewId)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, organization_id: orgId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Reject failed' }));
      throw new Error(err.error || 'Reject failed');
    }
    return res.json();
  },

  async requestMoreReview(reviewId: string, comment: string, orgId = DEFAULT_ORG): Promise<any> {
    const res = await fetch(`/api/v1/reviews/${encodeURIComponent(reviewId)}/request-more-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment, organization_id: orgId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request more review failed' }));
      throw new Error(err.error || 'Request more review failed');
    }
    return res.json();
  },

  async reopenReview(reviewId: string, reason: string, orgId = DEFAULT_ORG): Promise<any> {
    const res = await fetch(`/api/v1/reviews/${encodeURIComponent(reviewId)}/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, organization_id: orgId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Reopen failed' }));
      throw new Error(err.error || 'Reopen failed');
    }
    return res.json();
  },

  async getReportReviews(reportId: string, orgId = DEFAULT_ORG): Promise<{
    current_review: any;
    history: any[];
    reviewed_record: any;
  }> {
    const res = await fetch(`/api/v1/reports/${encodeURIComponent(reportId)}/reviews?organization_id=${encodeURIComponent(orgId)}`);
    if (!res.ok) throw new Error('Failed to fetch report reviews');
    return res.json();
  },

  async getReportReviewStatus(reportId: string, orgId = DEFAULT_ORG): Promise<any> {
    const res = await fetch(`/api/v1/reports/${encodeURIComponent(reportId)}/review-status?organization_id=${encodeURIComponent(orgId)}`);
    if (!res.ok) throw new Error('Failed to fetch report review status');
    return res.json();
  },
};
