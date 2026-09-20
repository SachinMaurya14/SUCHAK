import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ReviewRecord,
  ReviewStatus,
  ReviewDecision,
  ReviewEligibilityReason,
  ReviewCorrection,
  ReviewComment,
  ReviewedSafetyRecord,
  ReviewAuditEvent,
  ReviewSummaryKPIs,
  ReviewQueueFilterOptions,
  AllowedCorrectionField,
  ALLOWED_CORRECTION_FIELDS,
} from './reviewTypes.ts';
import { ReviewEligibilityService } from './reviewEligibilityService.ts';
import { ReportRecord } from './dataStore.ts';

export interface ReviewerProfile {
  id: string;
  name: string;
  email: string;
  role: 'OrgAdmin' | 'HSEOfficer' | 'SafetyReviewer' | 'SiteManager';
  site: string;
}

export const REVIEWERS: ReviewerProfile[] = [
  { id: 'user-alok-01', name: 'Dr. Alok Baruah', email: 'a.baruah@oil.example.in', role: 'OrgAdmin', site: 'All Enterprise Sites' },
  { id: 'user-priyanka-02', name: 'Priyanka Saikia', email: 'p.saikia@oil.example.in', role: 'HSEOfficer', site: 'Digboi Central Asset' },
  { id: 'user-debajit-03', name: 'Debajit Bora', email: 'd.bora@oil.example.in', role: 'SafetyReviewer', site: 'Duliajan Field Operations' },
  { id: 'user-manish-04', name: 'Manish Chhetri', email: 'm.chhetri@oil.example.in', role: 'SiteManager', site: 'Moran Gathering Station' },
];

export class ReviewStore {
  private reviews: Map<string, ReviewRecord> = new Map(); // key: review_id
  private reportToReviewMap: Map<string, string> = new Map(); // key: report_id -> review_id
  private reviewedRecords: Map<string, ReviewedSafetyRecord> = new Map(); // key: report_id
  private reviewHistory: Map<string, ReviewRecord[]> = new Map(); // key: report_id -> historical reviews
  private auditEvents: ReviewAuditEvent[] = [];
  private persistencePath: string;

  constructor(persistencePath?: string) {
    this.persistencePath =
      persistencePath || path.join(process.cwd(), 'data', 'suchak_reviews_store.json');
    this.loadFromDisk();
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const payload = {
        reviews: Array.from(this.reviews.values()),
        reviewedRecords: Array.from(this.reviewedRecords.values()),
        reviewHistory: Array.from(this.reviewHistory.entries()),
        auditEvents: this.auditEvents.slice(-500),
      };

      fs.writeFileSync(this.persistencePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[SUCHAK ReviewStore] Warning: could not persist reviews store to disk:', err);
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.persistencePath)) {
        const raw = fs.readFileSync(this.persistencePath, 'utf-8');
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed.reviews)) {
          for (const r of parsed.reviews) {
            this.reviews.set(r.id, r);
            this.reportToReviewMap.set(r.report_id, r.id);
          }
        }

        if (Array.isArray(parsed.reviewedRecords)) {
          for (const rr of parsed.reviewedRecords) {
            this.reviewedRecords.set(rr.report_id, rr);
          }
        }

        if (Array.isArray(parsed.reviewHistory)) {
          for (const [repId, hist] of parsed.reviewHistory) {
            this.reviewHistory.set(repId, hist);
          }
        }

        if (Array.isArray(parsed.auditEvents)) {
          this.auditEvents = parsed.auditEvents;
        }
      }
    } catch (err) {
      console.warn('[SUCHAK ReviewStore] Could not load persisted review store:', err);
    }
  }

  /**
   * Records an immutable audit event for review workflow actions.
   */
  public recordAuditEvent(
    reviewId: string,
    reportId: string,
    organizationId: string,
    actor: { id: string; name: string; role: string },
    eventType: ReviewAuditEvent['event_type'],
    details: Record<string, any>
  ): ReviewAuditEvent {
    const event: ReviewAuditEvent = {
      id: `rev-aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      review_id: reviewId,
      report_id: reportId,
      organization_id: organizationId,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      event_type: eventType,
      details,
      created_at: new Date().toISOString(),
    };
    this.auditEvents.push(event);
    this.saveToDisk();
    return event;
  }

  /**
   * Initializes or refreshes the review queue against all registered reports.
   */
  public initializeQueueForReports(reports: ReportRecord[]): void {
    let createdCount = 0;
    for (const report of reports) {
      const orgId = report.organization_id || 'oil-india-demo';
      const existingReviewId = this.reportToReviewMap.get(report.id);

      if (!existingReviewId) {
        const { isEligible, reasons } = ReviewEligibilityService.evaluateEligibility(report);
        if (isEligible) {
          const reviewId = `rev-${report.report_number.toLowerCase()}`;
          const snapshot = ReviewEligibilityService.buildSourceSnapshots(report);

          // Assign realistic initial reviewer distribution for demo
          let assignedReviewer: ReviewerProfile | null = null;
          let initialStatus: ReviewStatus = 'QUEUED';
          if (report.report_number.includes('0891') || report.report_number.includes('0889')) {
            assignedReviewer = REVIEWERS[2]; // Debajit Bora
            initialStatus = 'ASSIGNED';
          } else if (report.report_number.includes('0880') || report.report_number.includes('1021')) {
            assignedReviewer = REVIEWERS[1]; // Priyanka Saikia
            initialStatus = 'IN_REVIEW';
          }

          const review: ReviewRecord = {
            id: reviewId,
            organization_id: orgId,
            report_id: report.id,
            report_number: report.report_number,
            reviewer_id: assignedReviewer ? assignedReviewer.id : null,
            reviewer_name: assignedReviewer ? assignedReviewer.name : null,
            reviewer_role: assignedReviewer ? assignedReviewer.role : null,
            status: initialStatus,
            decision: null,
            eligibility_reasons: reasons,
            reviewer_comment: null,
            reviewer_summary: null,
            corrections: [],
            comments: [],
            assigned_at: assignedReviewer ? new Date(Date.now() - 48 * 3600 * 1000).toISOString() : null,
            started_at: initialStatus === 'IN_REVIEW' ? new Date(Date.now() - 24 * 3600 * 1000).toISOString() : null,
            completed_at: null,
            lock_token: null,
            lock_acquired_at: null,
            review_version: 'REVIEW_V1',
            source_snapshots: snapshot,
            is_stale: false,
            stale_reason: null,
            created_at: report.created_at,
            updated_at: report.updated_at,
          };

          this.reviews.set(review.id, review);
          this.reportToReviewMap.set(report.id, review.id);
          createdCount++;

          this.recordAuditEvent(
            review.id,
            report.id,
            orgId,
            { id: 'system', name: 'SUCHAK Eligibility Engine', role: 'System' },
            'REVIEW_CREATED',
            { reasons, initial_status: initialStatus }
          );
        }
      } else {
        // Check if existing review has become stale
        const existing = this.reviews.get(existingReviewId);
        if (existing && existing.completed_at && !existing.is_stale) {
          const staleCheck = ReviewEligibilityService.isReviewStale(existing.source_snapshots, report);
          if (staleCheck.isStale) {
            existing.is_stale = true;
            existing.stale_reason = staleCheck.reason;
            existing.status = 'STALE';
            existing.updated_at = new Date().toISOString();

            this.recordAuditEvent(
              existing.id,
              report.id,
              orgId,
              { id: 'system', name: 'SUCHAK Stale Detector', role: 'System' },
              'REVIEW_BECAME_STALE',
              { reason: staleCheck.reason }
            );
          }
        }
      }
    }

    if (createdCount > 0) {
      this.saveToDisk();
    }
  }

  /**
   * Retrieves paginated review queue items with multi-criteria server-side filtering.
   */
  public getQueue(
    options: ReviewQueueFilterOptions,
    reportLookup: (id: string) => ReportRecord | undefined
  ): {
    reviews: ReviewRecord[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  } {
    const orgId = options.organization_id;
    let list = Array.from(this.reviews.values()).filter(
      (r) => r.organization_id === orgId
    );

    // 1. Status Filter
    if (options.status && options.status !== 'ALL') {
      if (options.status === 'PENDING_ACTIONS') {
        list = list.filter((r) =>
          ['QUEUED', 'ASSIGNED', 'IN_REVIEW', 'NEEDS_MORE_REVIEW', 'STALE', 'RE_REVIEW_REQUIRED'].includes(
            r.status
          )
        );
      } else {
        list = list.filter((r) => r.status === options.status);
      }
    }

    // 2. Assignment Filter
    if (options.assigned_to) {
      if (options.assigned_to === 'UNASSIGNED') {
        list = list.filter((r) => !r.reviewer_id);
      } else if (options.assigned_to === 'ME' && options.current_user_id) {
        list = list.filter((r) => r.reviewer_id === options.current_user_id);
      } else if (options.assigned_to !== 'ALL') {
        list = list.filter((r) => r.reviewer_id === options.assigned_to);
      }
    }

    // 3. Site Filter
    if (options.site_id) {
      list = list.filter((r) => {
        const rep = reportLookup(r.report_id);
        return rep && rep.site_id === options.site_id;
      });
    }

    // 4. Activity Filter
    if (options.activity_id) {
      list = list.filter((r) => {
        const rep = reportLookup(r.report_id);
        return rep && rep.activity_id === options.activity_id;
      });
    }

    // 5. SIF Classification Filter
    if (options.sif_classification) {
      list = list.filter((r) => {
        const rep = reportLookup(r.report_id);
        return rep?.latest_analysis?.classification === options.sif_classification;
      });
    }

    // 6. Risk Priority Filter
    if (options.priority_band) {
      list = list.filter((r) => {
        const rep = reportLookup(r.report_id);
        return rep?.latest_risk_assessment?.priority === options.priority_band;
      });
    }

    // 7. Search Query Filter
    if (options.search_query && options.search_query.trim()) {
      const q = options.search_query.toLowerCase();
      list = list.filter((r) => {
        const rep = reportLookup(r.report_id);
        return (
          r.report_number.toLowerCase().includes(q) ||
          (r.reviewer_name && r.reviewer_name.toLowerCase().includes(q)) ||
          (rep && rep.description.toLowerCase().includes(q)) ||
          (rep?.site?.name && rep.site.name.toLowerCase().includes(q))
        );
      });
    }

    // 8. Sorting
    const sortBy = options.sort_by || 'oldest_pending';
    list.sort((a, b) => {
      if (sortBy === 'oldest_pending') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'newest_report') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'recently_updated') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      if (sortBy === 'priority') {
        const repA = reportLookup(a.report_id);
        const repB = reportLookup(b.report_id);
        const scoreA = repA?.latest_risk_assessment?.score || 0;
        const scoreB = repB?.latest_risk_assessment?.score || 0;
        return scoreB - scoreA;
      }
      return 0;
    });

    const total = list.length;
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;
    const paginated = list.slice(offset, offset + limit);

    return {
      reviews: paginated,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Returns aggregated workflow summary KPIs for the organization.
   */
  public getSummaryKPIs(organizationId: string): ReviewSummaryKPIs {
    const list = Array.from(this.reviews.values()).filter(
      (r) => r.organization_id === organizationId
    );

    let pending = 0;
    let assigned = 0;
    let in_review = 0;
    let completed = 0;
    let confirmed = 0;
    let corrected = 0;
    let rejected = 0;
    let needs_more_review = 0;
    let stale = 0;
    let totalAgeMs = 0;

    const now = Date.now();

    for (const r of list) {
      if (r.status === 'QUEUED') pending++;
      else if (r.status === 'ASSIGNED') assigned++;
      else if (r.status === 'IN_REVIEW') in_review++;
      else if (r.status === 'REVIEW_CONFIRMED') {
        completed++;
        confirmed++;
      } else if (r.status === 'REVIEW_CORRECTED') {
        completed++;
        corrected++;
      } else if (r.status === 'REVIEW_REJECTED') {
        completed++;
        rejected++;
      } else if (r.status === 'NEEDS_MORE_REVIEW') {
        needs_more_review++;
      } else if (r.status === 'STALE' || r.status === 'RE_REVIEW_REQUIRED') {
        stale++;
      }

      const createdTime = new Date(r.created_at).getTime();
      totalAgeMs += Math.max(0, now - createdTime);
    }

    const totalInQueue = pending + assigned + in_review + needs_more_review + stale;
    const averageAgeHours = list.length > 0 ? Math.round(totalAgeMs / (list.length * 3600 * 1000)) : 0;
    const confirmationRate = completed > 0 ? Math.round((confirmed / completed) * 100) : 0;

    return {
      pending,
      assigned,
      in_review,
      completed,
      confirmed,
      corrected,
      rejected,
      needs_more_review,
      stale,
      total_in_queue: totalInQueue,
      average_review_age_hours: averageAgeHours,
      human_confirmation_rate: confirmationRate,
    };
  }

  /**
   * Retrieves single review by ID with strict tenant isolation.
   */
  public getReviewById(reviewId: string, organizationId: string): ReviewRecord | null {
    const review = this.reviews.get(reviewId);
    if (!review || review.organization_id !== organizationId) {
      return null;
    }
    return review;
  }

  /**
   * Retrieves all reviews for an organization.
   */
  public getAllReviews(organizationId = 'oil-india-demo'): ReviewRecord[] {
    return Array.from(this.reviews.values()).filter(
      (r) => !organizationId || r.organization_id === organizationId
    );
  }

  /**
   * Retrieves review for a report with strict tenant isolation.
   */
  public getReviewByReportId(reportId: string, organizationId: string): ReviewRecord | null {
    const reviewId = this.reportToReviewMap.get(reportId);
    if (!reviewId) return null;
    return this.getReviewById(reviewId, organizationId);
  }

  /**
   * Retrieves complete review history for a report.
   */
  public getReviewHistory(reportId: string, organizationId: string): ReviewRecord[] {
    const reviewId = this.reportToReviewMap.get(reportId);
    if (!reviewId) return [];
    const review = this.reviews.get(reviewId);
    if (!review || review.organization_id !== organizationId) return [];
    return this.reviewHistory.get(reportId) || [];
  }

  /**
   * Retrieves current reviewed safety intelligence record for a report.
   */
  public getReviewedSafetyRecord(reportId: string, organizationId: string): ReviewedSafetyRecord | null {
    const rec = this.reviewedRecords.get(reportId);
    if (!rec || rec.organization_id !== organizationId) return null;
    return rec;
  }

  /**
   * Explicitly registers a report into the review queue.
   */
  public createReview(
    report: ReportRecord,
    organizationId: string,
    reason: ReviewEligibilityReason = 'MANUAL_REVIEW_REQUESTED',
    reviewerId?: string,
    actor?: { id: string; name: string; role: string }
  ): ReviewRecord {
    if (report.organization_id && report.organization_id !== organizationId) {
      throw new Error(`Report ${report.id} does not belong to organization ${organizationId}.`);
    }

    const existingReviewId = this.reportToReviewMap.get(report.id);
    if (existingReviewId) {
      const existing = this.reviews.get(existingReviewId);
      if (existing && existing.organization_id === organizationId) {
        if (!existing.eligibility_reasons.includes(reason)) {
          existing.eligibility_reasons.push(reason);
          existing.updated_at = new Date().toISOString();
          this.saveToDisk();
        }
        return existing;
      }
    }

    const reviewId = `rev-${report.report_number.toLowerCase()}-${Date.now().toString(36)}`;
    const snapshot = ReviewEligibilityService.buildSourceSnapshots(report);
    let assignedReviewer: ReviewerProfile | null = null;
    if (reviewerId) {
      assignedReviewer = REVIEWERS.find((r) => r.id === reviewerId) || null;
    }

    const review: ReviewRecord = {
      id: reviewId,
      organization_id: organizationId,
      report_id: report.id,
      report_number: report.report_number,
      reviewer_id: assignedReviewer ? assignedReviewer.id : null,
      reviewer_name: assignedReviewer ? assignedReviewer.name : null,
      reviewer_role: assignedReviewer ? assignedReviewer.role : null,
      status: assignedReviewer ? 'ASSIGNED' : 'QUEUED',
      decision: null,
      eligibility_reasons: [reason],
      reviewer_comment: null,
      reviewer_summary: null,
      corrections: [],
      comments: [],
      assigned_at: assignedReviewer ? new Date().toISOString() : null,
      started_at: null,
      completed_at: null,
      lock_token: null,
      lock_acquired_at: null,
      review_version: 'REVIEW_V1',
      source_snapshots: snapshot,
      is_stale: false,
      stale_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.reviews.set(review.id, review);
    this.reportToReviewMap.set(report.id, review.id);

    this.recordAuditEvent(
      review.id,
      report.id,
      organizationId,
      actor || { id: 'system', name: 'SUCHAK Review Engine', role: 'System' },
      'REVIEW_CREATED',
      { reason, reviewer_id: reviewerId }
    );

    this.saveToDisk();
    return review;
  }

  /**
   * Assigns a report review to an authorized reviewer.
   */
  public assignReview(
    reviewId: string,
    reviewerId: string,
    actor: { id: string; name: string; role: string },
    organizationId: string
  ): ReviewRecord {
    const review = this.getReviewById(reviewId, organizationId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found or tenant mismatch.`);
    }

    const reviewer = REVIEWERS.find((u) => u.id === reviewerId);
    if (!reviewer) {
      throw new Error(`Reviewer ${reviewerId} is not recognized or authorized.`);
    }

    review.reviewer_id = reviewer.id;
    review.reviewer_name = reviewer.name;
    review.reviewer_role = reviewer.role;
    review.status = 'ASSIGNED';
    review.assigned_at = new Date().toISOString();
    review.updated_at = new Date().toISOString();

    this.recordAuditEvent(review.id, review.report_id, organizationId, actor, 'REVIEW_ASSIGNED', {
      assigned_to: reviewer.name,
      assigned_to_id: reviewer.id,
    });

    this.saveToDisk();
    return review;
  }

  /**
   * Marks a review as IN_REVIEW and acquires an optimistic concurrency lock.
   */
  public startReview(
    reviewId: string,
    actor: { id: string; name: string; role: string },
    organizationId: string
  ): ReviewRecord {
    const review = this.getReviewById(reviewId, organizationId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found or tenant mismatch.`);
    }

    // Auto-assign to actor if unassigned
    if (!review.reviewer_id) {
      review.reviewer_id = actor.id;
      review.reviewer_name = actor.name;
      review.reviewer_role = actor.role;
      review.assigned_at = new Date().toISOString();
    }

    review.status = 'IN_REVIEW';
    review.started_at = review.started_at || new Date().toISOString();
    review.lock_token = crypto.randomBytes(8).toString('hex');
    review.lock_acquired_at = new Date().toISOString();
    review.updated_at = new Date().toISOString();

    this.recordAuditEvent(review.id, review.report_id, organizationId, actor, 'REVIEW_STARTED', {
      started_by: actor.name,
      lock_token: review.lock_token,
    });

    this.saveToDisk();
    return review;
  }

  /**
   * Adds a reviewer comment attached to the review or a specific field.
   */
  public addComment(
    reviewId: string,
    fieldRef: ReviewComment['field_ref'] | undefined,
    content: string,
    actor: { id: string; name: string; role: string },
    organizationId: string
  ): ReviewComment {
    const review = this.getReviewById(reviewId, organizationId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found or tenant mismatch.`);
    }

    if (!content || !content.trim()) {
      throw new Error('Comment content cannot be empty.');
    }

    const comment: ReviewComment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      review_id: reviewId,
      author_id: actor.id,
      author_name: actor.name,
      author_role: actor.role,
      field_ref: fieldRef || 'general',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    review.comments.push(comment);
    review.updated_at = new Date().toISOString();

    this.recordAuditEvent(review.id, review.report_id, organizationId, actor, 'REVIEW_COMMENT_ADDED', {
      field_ref: comment.field_ref,
      comment_id: comment.id,
    });

    this.saveToDisk();
    return comment;
  }

  /**
   * Stages a field-level correction with allowlist validation and required rationale.
   */
  public stageCorrection(
    reviewId: string,
    field: AllowedCorrectionField,
    aiValue: any,
    reviewedValue: any,
    reason: string,
    actor: { id: string; name: string; role: string },
    organizationId: string
  ): ReviewCorrection {
    const review = this.getReviewById(reviewId, organizationId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found or tenant mismatch.`);
    }

    if (review.status === 'REVIEW_CONFIRMED' || review.status === 'REVIEW_CORRECTED') {
      throw new Error(`Conflict: Review ${reviewId} has already been finalized by another reviewer.`);
    }

    if (!ALLOWED_CORRECTION_FIELDS.includes(field)) {
      throw new Error(`Field '${field}' is not in the allowed correction fields list.`);
    }

    if (!reason || !reason.trim()) {
      throw new Error(`Correction reason is required for field '${field}'.`);
    }

    // Remove prior staged correction for the same field if exists
    review.corrections = review.corrections.filter((c) => c.field !== field);

    const correction: ReviewCorrection = {
      id: `corr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      review_id: reviewId,
      field,
      ai_value: aiValue,
      reviewed_value: reviewedValue,
      reason: reason.trim(),
      reviewer_id: actor.id,
      reviewer_name: actor.name,
      created_at: new Date().toISOString(),
    };

    review.corrections.push(correction);
    review.updated_at = new Date().toISOString();

    this.recordAuditEvent(review.id, review.report_id, organizationId, actor, 'FIELD_CORRECTION_STAGED', {
      field,
      reviewed_value: reviewedValue,
      reason: correction.reason,
    });

    this.saveToDisk();
    return correction;
  }

  /**
   * Removes a staged field correction.
   */
  public removeCorrection(
    reviewId: string,
    correctionId: string,
    actor: { id: string; name: string; role: string },
    organizationId: string
  ): boolean {
    const review = this.getReviewById(reviewId, organizationId);
    if (!review) return false;

    const initialLen = review.corrections.length;
    review.corrections = review.corrections.filter((c) => c.id !== correctionId);
    if (review.corrections.length !== initialLen) {
      review.updated_at = new Date().toISOString();
      this.saveToDisk();
      return true;
    }
    return false;
  }

  /**
   * Finalizes review as CONFIRM. Accepts AI output as presented.
   */
  public confirmReview(
    reviewId: string,
    summary: string,
    actor: { id: string; name: string; role: string },
    organizationId: string,
    report: ReportRecord
  ): { review: ReviewRecord; reviewedRecord: ReviewedSafetyRecord } {
    const review = this.getReviewById(reviewId, organizationId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found or tenant mismatch.`);
    }

    if (review.status === 'REVIEW_CONFIRMED' || review.status === 'REVIEW_CORRECTED') {
      throw new Error(`Conflict: Review ${reviewId} has already been finalized by another reviewer.`);
    }

    // Preserve previous review version in history if applicable
    if (review.completed_at) {
      const hist = this.reviewHistory.get(review.report_id) || [];
      hist.push(JSON.parse(JSON.stringify(review)));
      this.reviewHistory.set(review.report_id, hist);
    }

    review.status = 'REVIEW_CONFIRMED';
    review.decision = 'CONFIRM';
    review.reviewer_summary = summary || 'AI safety intelligence output confirmed without modifications.';
    review.completed_at = new Date().toISOString();
    review.updated_at = new Date().toISOString();
    review.lock_token = null;
    review.is_stale = false;
    review.stale_reason = null;

    // Snapshot authoritative reviewed record
    const aiAnalysis = report.latest_analysis;
    const reviewedRecord: ReviewedSafetyRecord = {
      id: `rec-${review.id}`,
      organization_id: organizationId,
      report_id: report.id,
      review_id: review.id,
      review_version: review.review_version,
      decision: 'CONFIRM',
      reviewed_sif_classification: aiAnalysis?.classification || 'SIF_POTENTIAL',
      reviewed_hazards: aiAnalysis?.safety_indicators || [],
      reviewed_precursors: [aiAnalysis?.explanation || 'Standard Precursor Profile'],
      reviewed_barrier_failures: [aiAnalysis?.safety_indicators?.[0] || 'Standard Barrier'],
      reviewed_iogp_rule: aiAnalysis?.safety_indicators?.[0] || null,
      reviewed_energy_context: [],
      original_ai_sif_classification: aiAnalysis?.classification || 'SIF_POTENTIAL',
      original_ai_hazards: aiAnalysis?.safety_indicators || [],
      original_ai_precursor: aiAnalysis?.explanation || 'Standard Precursor Profile',
      original_ai_barrier_failure: aiAnalysis?.safety_indicators?.[0] || 'Standard Barrier',
      original_ai_iogp_rule: aiAnalysis?.safety_indicators?.[0] || 'Line of Fire',
      corrections_count: 0,
      reviewer_id: actor.id,
      reviewer_name: actor.name,
      reviewer_role: actor.role,
      reviewer_summary: review.reviewer_summary,
      is_current: true,
      created_at: new Date().toISOString(),
    };

    this.reviewedRecords.set(report.id, reviewedRecord);

    this.recordAuditEvent(review.id, review.report_id, organizationId, actor, 'REVIEW_CONFIRMED', {
      decision: 'CONFIRM',
      summary: review.reviewer_summary,
      review_version: review.review_version,
    });

    this.saveToDisk();
    return { review, reviewedRecord };
  }

  /**
   * Finalizes review as CORRECT. Requires at least one staged correction and a valid reason.
   */
  public correctReview(
    reviewId: string,
    summary: string,
    actor: { id: string; name: string; role: string },
    organizationId: string,
    report: ReportRecord
  ): { review: ReviewRecord; reviewedRecord: ReviewedSafetyRecord } {
    const review = this.getReviewById(reviewId, organizationId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found or tenant mismatch.`);
    }

    if (review.corrections.length === 0) {
      throw new Error('Correction decision requires at least one field-level correction.');
    }

    if (!summary || !summary.trim()) {
      throw new Error('Review summary explanation is required when submitting corrections.');
    }

    if (review.status === 'REVIEW_CONFIRMED' || review.status === 'REVIEW_CORRECTED') {
      throw new Error(`Conflict: Review ${reviewId} has already been finalized by another reviewer.`);
    }

    // Preserve previous review version in history if applicable
    if (review.completed_at) {
      const hist = this.reviewHistory.get(review.report_id) || [];
      hist.push(JSON.parse(JSON.stringify(review)));
      this.reviewHistory.set(review.report_id, hist);
    }

    review.status = 'REVIEW_CORRECTED';
    review.decision = 'CORRECT';
    review.reviewer_summary = summary.trim();
    review.completed_at = new Date().toISOString();
    review.updated_at = new Date().toISOString();
    review.lock_token = null;
    review.is_stale = false;
    review.stale_reason = null;

    const aiAnalysis = report.latest_analysis;

    // Build reviewed record incorporating human corrections
    const sifCorrection = review.corrections.find((c) => c.field === 'sif_classification');
    const hazardCorrection = review.corrections.find((c) => c.field === 'primary_hazard');
    const precursorCorrection = review.corrections.find((c) => c.field === 'primary_precursor');
    const barrierCorrection = review.corrections.find((c) => c.field === 'barrier_failure');
    const ruleCorrection = review.corrections.find((c) => c.field === 'iogp_rule');

    const reviewedRecord: ReviewedSafetyRecord = {
      id: `rec-${review.id}`,
      organization_id: organizationId,
      report_id: report.id,
      review_id: review.id,
      review_version: review.review_version,
      decision: 'CORRECT',
      reviewed_sif_classification: sifCorrection ? sifCorrection.reviewed_value : aiAnalysis?.classification || 'SIF_POTENTIAL',
      reviewed_hazards: hazardCorrection ? [hazardCorrection.reviewed_value] : aiAnalysis?.safety_indicators || [],
      reviewed_precursors: precursorCorrection ? [precursorCorrection.reviewed_value] : [aiAnalysis?.explanation || 'Standard Precursor'],
      reviewed_barrier_failures: barrierCorrection ? [barrierCorrection.reviewed_value] : [aiAnalysis?.safety_indicators?.[0] || 'Barrier Defect'],
      reviewed_iogp_rule: ruleCorrection ? ruleCorrection.reviewed_value : aiAnalysis?.safety_indicators?.[0] || null,
      reviewed_energy_context: [],
      original_ai_sif_classification: aiAnalysis?.classification || 'SIF_POTENTIAL',
      original_ai_hazards: aiAnalysis?.safety_indicators || [],
      original_ai_precursor: aiAnalysis?.explanation || 'Standard Precursor Profile',
      original_ai_barrier_failure: aiAnalysis?.safety_indicators?.[0] || 'Standard Barrier',
      original_ai_iogp_rule: aiAnalysis?.safety_indicators?.[0] || 'Line of Fire',
      corrections_count: review.corrections.length,
      reviewer_id: actor.id,
      reviewer_name: actor.name,
      reviewer_role: actor.role,
      reviewer_summary: review.reviewer_summary,
      is_current: true,
      created_at: new Date().toISOString(),
    };

    this.reviewedRecords.set(report.id, reviewedRecord);

    this.recordAuditEvent(review.id, review.report_id, organizationId, actor, 'REVIEW_CORRECTED', {
      decision: 'CORRECT',
      corrections_count: review.corrections.length,
      corrections: review.corrections.map((c) => ({ field: c.field, reviewed_value: c.reviewed_value })),
      summary: review.reviewer_summary,
    });

    this.saveToDisk();
    return { review, reviewedRecord };
  }

  /**
   * Rejects the proposed AI safety interpretation (not the field report itself).
   */
  public rejectReview(
    reviewId: string,
    reason: string,
    actor: { id: string; name: string; role: string },
    organizationId: string
  ): ReviewRecord {
    const review = this.getReviewById(reviewId, organizationId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found or tenant mismatch.`);
    }

    if (!reason || !reason.trim()) {
      throw new Error('Rejection reason is required when rejecting AI safety interpretation.');
    }

    review.status = 'REVIEW_REJECTED';
    review.decision = 'REJECT';
    review.reviewer_summary = reason.trim();
    review.completed_at = new Date().toISOString();
    review.updated_at = new Date().toISOString();
    review.lock_token = null;

    this.recordAuditEvent(review.id, review.report_id, organizationId, actor, 'REVIEW_REJECTED', {
      decision: 'REJECT',
      reason: review.reviewer_summary,
    });

    this.saveToDisk();
    return review;
  }

  /**
   * Marks review as NEEDS_MORE_REVIEW when evidence is insufficient for validation.
   */
  public requestMoreReview(
    reviewId: string,
    comment: string,
    actor: { id: string; name: string; role: string },
    organizationId: string
  ): ReviewRecord {
    const review = this.getReviewById(reviewId, organizationId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found or tenant mismatch.`);
    }

    if (!comment || !comment.trim()) {
      throw new Error('Information requirement comment is required.');
    }

    review.status = 'NEEDS_MORE_REVIEW';
    review.decision = 'NEEDS_MORE_REVIEW';
    review.reviewer_comment = comment.trim();
    review.updated_at = new Date().toISOString();
    review.lock_token = null;

    this.addComment(reviewId, 'general', `[NEEDS MORE REVIEW]: ${comment.trim()}`, actor, organizationId);

    this.recordAuditEvent(
      review.id,
      review.report_id,
      organizationId,
      actor,
      'REVIEW_MORE_INFORMATION_REQUESTED',
      {
        decision: 'NEEDS_MORE_REVIEW',
        comment: review.reviewer_comment,
      }
    );

    this.saveToDisk();
    return review;
  }

  /**
   * Reopens a completed review with full version preservation.
   */
  public reopenReview(
    reviewId: string,
    reason: string,
    actor: { id: string; name: string; role: string },
    organizationId: string
  ): ReviewRecord {
    const review = this.getReviewById(reviewId, organizationId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found or tenant mismatch.`);
    }

    if (!reason || !reason.trim()) {
      throw new Error('Reopen rationale is required.');
    }

    // Preserve historical version
    const hist = this.reviewHistory.get(review.report_id) || [];
    hist.push(JSON.parse(JSON.stringify(review)));
    this.reviewHistory.set(review.report_id, hist);

    // Increment version
    const currentVerNum = parseInt(review.review_version.replace('REVIEW_V', ''), 10) || 1;
    review.review_version = `REVIEW_V${currentVerNum + 1}`;
    review.status = 'RE_REVIEW_REQUIRED';
    review.decision = null;
    review.completed_at = null;
    review.lock_token = null;
    review.is_stale = false;
    review.stale_reason = null;
    review.updated_at = new Date().toISOString();

    this.addComment(
      reviewId,
      'general',
      `[REVIEW REOPENED]: Version escalated to ${review.review_version}. Reason: ${reason.trim()}`,
      actor,
      organizationId
    );

    this.recordAuditEvent(review.id, review.report_id, organizationId, actor, 'REVIEW_REOPENED', {
      new_version: review.review_version,
      reason: reason.trim(),
    });

    this.saveToDisk();
    return review;
  }

  /**
   * Retrieves audit trail for a review.
   */
  public getAuditTrail(reviewId: string, organizationId: string): ReviewAuditEvent[] {
    return this.auditEvents.filter(
      (e) => e.review_id === reviewId && e.organization_id === organizationId
    );
  }
}

export const reviewStore = new ReviewStore();
