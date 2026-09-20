import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  UserCheck,
  ChevronRight,
  Edit3,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { reviewService } from '../../services/reviewService.ts';
import { ReviewStatusBadge } from './ReviewStatusBadge.tsx';
import { ReviewWorkspaceModal } from './ReviewWorkspaceModal.tsx';

interface HumanReviewCardProps {
  reportId: string;
  reportNumber?: string;
  onReviewUpdated?: () => void;
  onStatusChanged?: () => void;
}

export const HumanReviewCard: React.FC<HumanReviewCardProps> = ({
  reportId,
  reportNumber,
  onReviewUpdated,
  onStatusChanged,
}) => {
  const [reviewStatus, setReviewStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<'review' | 'audit' | 'history'>('review');

  useEffect(() => {
    loadStatus();
  }, [reportId]);

  async function loadStatus() {
    setLoading(true);
    try {
      const data = await reviewService.getReportReviewStatus(reportId);
      setReviewStatus(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function handleReviewUpdated() {
    loadStatus();
    onReviewUpdated?.();
    onStatusChanged?.();
  }

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-surface-muted/60 border border-border animate-pulse text-xs text-muted-foreground">
        Loading Human HSE Review Status...
      </div>
    );
  }

  const hasReview = reviewStatus?.has_review;
  const status = reviewStatus?.status || 'NOT_REVIEWED';
  const isStale = reviewStatus?.is_stale;
  const reviewedRecord = reviewStatus?.reviewed_record;

  return (
    <>
      <div
        id={`card-human-review-${reportId}`}
        className="rounded-2xl border bg-card text-card-foreground border-border p-5 space-y-4 shadow-sm transition-all hover:border-primary/40 dark:bg-slate-900/80 dark:border-slate-800"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  Phase 9: Human HSE Review & Validation
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-muted text-muted-foreground border border-border">
                  {reviewStatus?.review_version || 'REVIEW_V1'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {reviewedRecord
                  ? 'Authoritative safety truth validated by certified HSE safety inspection.'
                  : 'AI proposed intelligence awaiting certified human safety officer review.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ReviewStatusBadge status={status} isStale={isStale} size="md" />
          </div>
        </div>

        {/* Dynamic content depending on status */}
        {reviewedRecord ? (
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground text-[11px] block font-medium uppercase tracking-wider">
                  Review Status
                </span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                  REVIEWED — {reviewedRecord.decision}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block font-medium uppercase tracking-wider">
                  Reviewer
                </span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {reviewedRecord.reviewer_name}{' '}
                  <span className="text-muted-foreground font-normal text-[11px]">
                    ({reviewedRecord.reviewer_role})
                  </span>
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block font-medium uppercase tracking-wider">
                  Reviewed Date
                </span>
                <span className="font-mono text-foreground mt-0.5 block">
                  {new Date(reviewedRecord.created_at).toLocaleDateString([], {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  {new Date(reviewedRecord.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block font-medium uppercase tracking-wider">
                  Corrections
                </span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {reviewedRecord.corrections_count > 0 ? (
                    <span className="text-teal-600 dark:text-teal-400">
                      {reviewedRecord.corrections_count} field(s) corrected
                    </span>
                  ) : (
                    <span className="text-muted-foreground">None (Confirmed As-Is)</span>
                  )}
                </span>
              </div>
            </div>

            {reviewedRecord.reviewer_summary && (
              <div className="text-xs p-2.5 rounded-lg bg-surface-muted/70 border border-border text-foreground italic">
                "{reviewedRecord.reviewer_summary}"
              </div>
            )}

            {reviewedRecord.decision === 'CORRECT' && (
              <div className="text-[11px] text-teal-700 dark:text-teal-400 flex items-center gap-1.5 pt-0.5">
                <Edit3 className="w-3.5 h-3.5" />
                <span>
                  Original AI: <strong>{reviewedRecord.original_ai_sif_classification}</strong> → Human Validated: <strong>{reviewedRecord.reviewed_sif_classification}</strong>
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border text-xs text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                {reviewStatus?.reviewer_name
                  ? `Assigned to ${reviewStatus.reviewer_name} (${reviewStatus.reviewer_role || 'SafetyReviewer'}) for HSE verification.`
                  : 'Queued for human HSE officer review to verify SIF classification and barrier controls.'}
              </span>
            </div>
            {isStale && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Re-review required</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border-subtle text-xs">
          <span className="text-muted-foreground">
            {reviewedRecord
              ? 'Human validation complete. Authoritative record active.'
              : 'Decisions recorded to immutable compliance audit trail.'}
          </span>
          <div className="flex items-center gap-2">
            {reviewStatus?.review_id ? (
              <>
                <button
                  id="btn-view-review-history"
                  onClick={() => {
                    setInitialTab('history');
                    setModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-border hover:bg-surface-muted text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  View Review History
                </button>
                <button
                  id="btn-open-review-workspace"
                  onClick={() => {
                    setInitialTab('review');
                    setModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  {reviewedRecord ? 'Review Workspace' : 'Open Review Workspace'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <span className="text-muted-foreground italic">No review record initialized</span>
            )}
          </div>
        </div>
      </div>

      {reviewStatus?.review_id && (
        <ReviewWorkspaceModal
          reviewId={reviewStatus.review_id}
          isOpen={modalOpen}
          initialTab={initialTab}
          onClose={() => setModalOpen(false)}
          onReviewUpdated={handleReviewUpdated}
        />
      )}
    </>
  );
};
