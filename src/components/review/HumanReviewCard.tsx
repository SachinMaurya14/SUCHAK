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
  reportNumber: string;
  onStatusChanged?: () => void;
}

export const HumanReviewCard: React.FC<HumanReviewCardProps> = ({
  reportId,
  reportNumber,
  onStatusChanged,
}) => {
  const [reviewStatus, setReviewStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

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
    onStatusChanged?.();
  }

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse text-xs text-slate-500">
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
        className="rounded-2xl border bg-slate-900/80 p-5 space-y-4 shadow-md transition-all border-slate-800 hover:border-slate-700"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Phase 9: Human HSE Review & Verification
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {reviewStatus?.review_version || 'REVIEW_V1'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {reviewedRecord
                  ? 'Authoritative safety truth validated by certified HSE inspection.'
                  : 'AI proposed intelligence awaiting human safety officer sign-off.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ReviewStatusBadge status={status} isStale={isStale} size="md" />
          </div>
        </div>

        {/* Dynamic content depending on status */}
        {reviewedRecord ? (
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">
                Verified by <strong>{reviewedRecord.reviewer_name}</strong> ({reviewedRecord.reviewer_role})
              </span>
              <span className="text-slate-500 font-mono">
                {new Date(reviewedRecord.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-slate-300 italic bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
              "{reviewedRecord.reviewer_summary}"
            </p>
            {reviewedRecord.decision === 'CORRECT' && (
              <div className="text-[11px] text-teal-400 flex items-center gap-1.5 pt-1">
                <Edit3 className="w-3.5 h-3.5" />
                <span>
                  {reviewedRecord.corrections_count} field(s) corrected from initial AI interpretation.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {reviewStatus?.reviewer_name
                  ? `Assigned to ${reviewStatus.reviewer_name} for validation.`
                  : 'Queued for HSE officer review to verify SIF and barrier controls.'}
              </span>
            </div>
            {isStale && (
              <span className="text-[11px] text-amber-400 font-medium">Re-review required</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500">
            {reviewedRecord
              ? 'Human validation complete.'
              : 'Decisions recorded to tamper-evident audit trail.'}
          </span>
          {reviewStatus?.review_id ? (
            <button
              id="btn-open-review-workspace"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-colors"
            >
              <FileCheck className="w-4 h-4" />
              {reviewedRecord ? 'View Review Details' : 'Open Review Workspace'}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-xs text-slate-400 italic">No review record initialized</span>
          )}
        </div>
      </div>

      {reviewStatus?.review_id && (
        <ReviewWorkspaceModal
          reviewId={reviewStatus.review_id}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onReviewUpdated={handleReviewUpdated}
        />
      )}
    </>
  );
};
