import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  RotateCcw,
  Edit3,
  Trash2,
  MessageSquare,
  Shield,
  Zap,
  Activity,
  User,
  History,
  Info,
  Calendar,
  MapPin,
  Flame,
  FileText,
  Lock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { reviewService } from '../../services/reviewService.ts';
import {
  ClientReviewWorkspacePayload,
  AllowedCorrectionField,
  ClientReviewCorrection,
} from '../../types/review.ts';
import { ReviewStatusBadge } from './ReviewStatusBadge.tsx';

interface ReviewWorkspaceModalProps {
  reviewId: string;
  isOpen: boolean;
  initialTab?: 'review' | 'audit' | 'history';
  onClose: () => void;
  onReviewUpdated?: () => void;
}

const FIELD_LABELS: Record<AllowedCorrectionField, string> = {
  sif_classification: 'SIF Classification (Phase 4)',
  primary_hazard: 'Primary Hazard',
  primary_precursor: 'Primary Precursor',
  barrier_failure: 'Barrier Failure',
  iogp_rule: 'IOGP Life-Saving Rule',
  energy_context: 'Hazardous Energy Context',
};

const IOGP_OPTIONS = [
  'Line of Fire',
  'Energy Isolation',
  'Bypassing Safety Controls',
  'Confined Space',
  'Working at Height',
  'Safe Mechanical Lifting',
  'Work Authorization & PTW',
  'Hot Work / Ignition Source Control',
  'Driving Safety',
  'Toxic Gas (H2S) Exposure',
];

export const ReviewWorkspaceModal: React.FC<ReviewWorkspaceModalProps> = ({
  reviewId,
  isOpen,
  initialTab = 'review',
  onClose,
  onReviewUpdated,
}) => {
  const [data, setData] = useState<ClientReviewWorkspacePayload | null>(null);
  const [reviewers, setReviewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Active correction drawer/modal state
  const [editingField, setEditingField] = useState<AllowedCorrectionField | null>(null);
  const [correctionValue, setCorrectionValue] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  // Comments state
  const [newComment, setNewComment] = useState('');
  const [commentField, setCommentField] = useState<string>('general');

  // Confirmation/Action modal state
  const [actionModal, setActionModal] = useState<
    'CONFIRM' | 'CORRECT' | 'REJECT' | 'NEEDS_MORE' | 'REOPEN' | null
  >(null);
  const [actionSummary, setActionSummary] = useState('');
  const [actionReasonError, setActionReasonError] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'review' | 'audit' | 'history'>(initialTab);

  useEffect(() => {
    if (isOpen && reviewId) {
      if (initialTab) setActiveTab(initialTab);
      loadWorkspace();
      loadReviewers();
    } else {
      setData(null);
      setError(null);
      setEditingField(null);
      setActionModal(null);
    }
  }, [isOpen, reviewId]);

  async function loadWorkspace() {
    setLoading(true);
    setError(null);
    try {
      const payload = await reviewService.getReviewWorkspace(reviewId);
      setData(payload);
    } catch (err: any) {
      setError(err.message || 'Failed to load review workspace');
    } finally {
      setLoading(false);
    }
  }

  async function loadReviewers() {
    try {
      const list = await reviewService.getReviewers();
      setReviewers(list);
    } catch {
      // non-critical
    }
  }

  if (!isOpen) return null;

  const review = data?.review;
  const report = data?.report;
  const ai = data?.ai_analysis;
  const safety = data?.safety_intelligence;
  const risk = data?.risk_context;
  const pattern = data?.pattern_context;
  const reviewedRecord = data?.reviewed_record;
  const isFinalized =
    review?.status === 'REVIEW_CONFIRMED' ||
    review?.status === 'REVIEW_CORRECTED' ||
    review?.status === 'REVIEW_REJECTED';

  // Helper to open field edit
  function startEditing(field: AllowedCorrectionField, currentValue: any) {
    setEditingField(field);
    setCorrectionValue(typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue));
    setCorrectionReason('');
    setCorrectionError(null);
  }

  async function saveCorrection() {
    if (!editingField) return;
    if (!correctionReason.trim()) {
      setCorrectionError('Mandatory justification reason is required for HSE audit compliance.');
      return;
    }

    setActionLoading(true);
    setCorrectionError(null);
    try {
      let aiVal: any = '';
      if (editingField === 'sif_classification') aiVal = ai?.classification || 'SIF_POTENTIAL';
      else if (editingField === 'primary_hazard') aiVal = safety?.hazards?.[0] || 'PRESSURE';
      else if (editingField === 'primary_precursor') aiVal = safety?.precursors?.[0] || '';
      else if (editingField === 'barrier_failure') aiVal = safety?.barrier_failures?.[0] || '';
      else if (editingField === 'iogp_rule') aiVal = safety?.iogp_rules?.[0] || 'Line of Fire';
      else if (editingField === 'energy_context') aiVal = safety?.energy_context?.[0] || '';

      await reviewService.stageCorrection(
        reviewId,
        editingField,
        aiVal,
        correctionValue,
        correctionReason.trim()
      );
      setEditingField(null);
      await loadWorkspace();
      onReviewUpdated?.();
    } catch (err: any) {
      setCorrectionError(err.message || 'Failed to stage correction');
    } finally {
      setActionLoading(false);
    }
  }

  async function removeCorrection(corrId: string) {
    if (!confirm('Remove this staged correction?')) return;
    setActionLoading(true);
    try {
      await reviewService.removeCorrection(reviewId, corrId);
      await loadWorkspace();
      onReviewUpdated?.();
    } catch (err: any) {
      alert(err.message || 'Failed to remove correction');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setActionLoading(true);
    try {
      await reviewService.addComment(reviewId, newComment.trim(), commentField);
      setNewComment('');
      await loadWorkspace();
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAssignReviewer(reviewerId: string) {
    setActionLoading(true);
    try {
      await reviewService.assignReview(reviewId, reviewerId);
      await loadWorkspace();
      onReviewUpdated?.();
    } catch (err: any) {
      alert(err.message || 'Failed to assign reviewer');
    } finally {
      setActionLoading(false);
    }
  }

  async function executeAction() {
    if (!actionModal) return;

    if (
      (actionModal === 'CORRECT' ||
        actionModal === 'REJECT' ||
        actionModal === 'NEEDS_MORE' ||
        actionModal === 'REOPEN') &&
      !actionSummary.trim()
    ) {
      setActionReasonError('A written explanation is mandatory for this decision.');
      return;
    }

    setActionLoading(true);
    setActionReasonError(null);
    try {
      if (actionModal === 'CONFIRM') {
        await reviewService.confirmReview(reviewId, actionSummary.trim() || undefined);
      } else if (actionModal === 'CORRECT') {
        await reviewService.correctReview(reviewId, actionSummary.trim());
      } else if (actionModal === 'REJECT') {
        await reviewService.rejectReview(reviewId, actionSummary.trim());
      } else if (actionModal === 'NEEDS_MORE') {
        await reviewService.requestMoreReview(reviewId, actionSummary.trim());
      } else if (actionModal === 'REOPEN') {
        await reviewService.reopenReview(reviewId, actionSummary.trim());
      }

      setActionModal(null);
      setActionSummary('');
      await loadWorkspace();
      onReviewUpdated?.();
    } catch (err: any) {
      setActionReasonError(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  // Find staged correction for a field if exists
  function getCorrection(field: AllowedCorrectionField): ClientReviewCorrection | undefined {
    return review?.corrections.find((c) => c.field === field);
  }

  return (
    <div
      id="modal-review-workspace"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-6xl my-6 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {report?.report_number || 'REP-REVIEW'}
                </span>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Human HSE Review & Validation Workspace
                </h2>
                {review && (
                  <ReviewStatusBadge status={review.status} isStale={review.is_stale} size="sm" />
                )}
                <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
                  {review?.review_version || 'REVIEW_V1'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {report?.site_name}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-slate-500" />
                  {report?.activity_name}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {report?.report_datetime
                    ? new Date(report.report_datetime).toLocaleDateString()
                    : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Reviewer Assignment Select */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Assigned Reviewer:</span>
              <select
                id="select-reviewer-assign"
                value={review?.reviewer_id || ''}
                disabled={actionLoading || isFinalized}
                onChange={(e) => handleAssignReviewer(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {reviewers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.role})
                  </option>
                ))}
              </select>
            </div>

            <button
              id="btn-close-review-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-900/50 text-xs font-medium shrink-0">
          <button
            onClick={() => setActiveTab('review')}
            className={`py-2.5 px-4 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'review'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            Safety Intelligence & Corrections
            {review?.corrections && review.corrections.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[10px]">
                {review.corrections.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 px-4 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            HSE Audit Trail
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px]">
              {data?.audit_trail?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 px-4 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Review Version History
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px]">
              {data?.history?.length || 0}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-16 text-center text-slate-400">
              <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm">Loading Review Workspace...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Stale Warning Banner if applicable */}
              {review?.is_stale && (
                <div
                  id="banner-stale-alert"
                  className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start gap-3"
                >
                  <RotateCcw className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-200">
                      Warning: Underlying Data Changed (Re-Review Required)
                    </p>
                    <p className="text-xs text-amber-300/90 mt-0.5">
                      {review.stale_reason ||
                        'The incident report description or AI safety model was updated after this review was finalized. An HSE reviewer must verify if the previous decision remains sound.'}
                    </p>
                  </div>
                  <button
                    id="btn-trigger-reopen-stale"
                    onClick={() => setActionModal('REOPEN')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold shrink-0"
                  >
                    Reopen Review
                  </button>
                </div>
              )}

              {/* Finalized Authoritative Record Banner */}
              {reviewedRecord && (
                <div
                  id="banner-authoritative-reviewed"
                  className={`p-4 rounded-xl border text-sm flex items-start justify-between gap-4 ${
                    reviewedRecord.decision === 'CONFIRM'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : reviewedRecord.decision === 'CORRECT'
                      ? 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 font-bold text-base">
                        <span>Human-Reviewed Safety Record Active</span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-900/60 border border-slate-700">
                          {reviewedRecord.review_version}
                        </span>
                      </div>
                      <p className="text-xs mt-1 text-slate-300">
                        Finalized by <strong>{reviewedRecord.reviewer_name}</strong> (
                        {reviewedRecord.reviewer_role}) on{' '}
                        {new Date(reviewedRecord.created_at).toLocaleString()}.
                      </p>
                      <p className="text-xs mt-2 p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-200 italic">
                        "{reviewedRecord.reviewer_summary}"
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 text-emerald-400 border border-emerald-500/30">
                      Classification: {reviewedRecord.reviewed_sif_classification}
                    </span>
                    <button
                      id="btn-reopen-review"
                      onClick={() => setActionModal('REOPEN')}
                      className="text-xs text-slate-400 hover:text-white underline flex items-center gap-1 mt-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reopen & Revise
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'review' && (
                <div className="space-y-6">
                  {/* Grid: Left Column = Narrative & AI Output, Right Column = Analytical Context & Corrections */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column (7 cols): Field Narrative & AI SIF Evaluation */}
                    <div className="lg:col-span-7 space-y-6">
                      {/* Section 1: Original Field Report */}
                      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            Original Field Incident Narrative
                          </h3>
                          <span className="text-xs text-slate-500 font-mono">
                            Source: {report?.source || 'FIELD_LOG'}
                          </span>
                        </div>
                        <div className="p-3.5 bg-slate-900/80 rounded-lg border border-slate-800/80 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                          {report?.description}
                        </div>
                        {report?.actual_outcome && (
                          <div className="text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                            <strong className="text-slate-400">Actual Outcome:</strong>{' '}
                            {report.actual_outcome}
                          </div>
                        )}
                      </div>

                      {/* Section 2: AI Safety Analysis (Phase 4 Proposed) */}
                      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              Phase 4: Proposed SIF Classification
                            </h3>
                          </div>
                          <span className="text-[11px] font-mono text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            AI PROPOSED (MODEL: {ai?.model || 'suchak-safety-core'})
                          </span>
                        </div>

                        {/* Interactive SIF Classification Card */}
                        {(() => {
                          const corr = getCorrection('sif_classification');
                          const currentVal = corr ? corr.reviewed_value : ai?.classification || 'SIF_POTENTIAL';

                          return (
                            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="text-xs text-slate-400 block mb-1">
                                  SIF Classification Status
                                </span>
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`text-base font-bold px-3 py-1 rounded-lg border ${
                                      currentVal === 'SIF_POTENTIAL'
                                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                        : currentVal === 'NON_SIF_POTENTIAL'
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    }`}
                                  >
                                    {currentVal === 'SIF_POTENTIAL'
                                      ? 'SIF POTENTIAL'
                                      : currentVal === 'NON_SIF_POTENTIAL'
                                      ? 'NON-SIF'
                                      : 'NEEDS REVIEW'}
                                  </span>

                                  {corr && (
                                    <span className="text-xs text-teal-400 bg-teal-500/10 px-2 py-1 rounded border border-teal-500/30 flex items-center gap-1">
                                      <Edit3 className="w-3 h-3" />
                                      Human Corrected (AI was: {corr.ai_value})
                                    </span>
                                  )}
                                </div>

                                {corr && (
                                  <p className="text-xs text-slate-400 mt-2 italic">
                                    Justification: "{corr.reason}"
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {corr ? (
                                  <button
                                    onClick={() => removeCorrection(corr.id)}
                                    disabled={actionLoading || isFinalized}
                                    className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg border border-rose-500/30 text-xs"
                                    title="Revert correction"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                ) : (
                                  !isFinalized && (
                                    <button
                                      id="btn-edit-sif-classification"
                                      onClick={() =>
                                        startEditing(
                                          'sif_classification',
                                          ai?.classification || 'SIF_POTENTIAL'
                                        )
                                      }
                                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      Override Classification
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Model Confidence & Explanation */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Model Confidence Estimate</span>
                            <span className="font-mono font-bold text-slate-200">
                              {Math.round((ai?.confidence_estimate || 0.85) * 100)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                              style={{ width: `${Math.round((ai?.confidence_estimate || 0.85) * 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-400 mt-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
                            <strong className="text-slate-300">AI Rationale:</strong>{' '}
                            {ai?.explanation || 'High energy line of fire exposure identified.'}
                          </p>
                        </div>
                      </div>

                      {/* Section 3: Safety Intelligence (Phase 5) Field-Level Controls */}
                      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-teal-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              Phase 5: Safety Intelligence Taxonomy
                            </h3>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Click any field to correct or refine
                          </span>
                        </div>

                        {/* Field 1: IOGP Life-Saving Rule */}
                        {(() => {
                          const corr = getCorrection('iogp_rule');
                          const val = corr ? corr.reviewed_value : safety?.iogp_rules?.[0] || 'Line of Fire';

                          return (
                            <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                              <div className="flex-1">
                                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                                  IOGP Life-Saving Rule
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm font-bold text-white">{val}</span>
                                  {corr && (
                                    <span className="text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                                      AI was: {corr.ai_value}
                                    </span>
                                  )}
                                </div>
                                {corr && (
                                  <p className="text-[11px] text-slate-400 mt-1 italic">
                                    Reason: {corr.reason}
                                  </p>
                                )}
                              </div>
                              <div>
                                {corr ? (
                                  <button
                                    onClick={() => removeCorrection(corr.id)}
                                    disabled={actionLoading || isFinalized}
                                    className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  !isFinalized && (
                                    <button
                                      id="btn-edit-iogp-rule"
                                      onClick={() =>
                                        startEditing('iogp_rule', safety?.iogp_rules?.[0] || 'Line of Fire')
                                      }
                                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Field 2: Primary Barrier Failure */}
                        {(() => {
                          const corr = getCorrection('barrier_failure');
                          const val = corr
                            ? corr.reviewed_value
                            : safety?.barrier_failures?.[0] ||
                              'Physical barricade breached / missing whip check';

                          return (
                            <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                              <div className="flex-1">
                                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                                  Primary Barrier Failure
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm font-medium text-slate-200">{val}</span>
                                  {corr && (
                                    <span className="text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                                      AI was: {corr.ai_value}
                                    </span>
                                  )}
                                </div>
                                {corr && (
                                  <p className="text-[11px] text-slate-400 mt-1 italic">
                                    Reason: {corr.reason}
                                  </p>
                                )}
                              </div>
                              <div>
                                {corr ? (
                                  <button
                                    onClick={() => removeCorrection(corr.id)}
                                    disabled={actionLoading || isFinalized}
                                    className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  !isFinalized && (
                                    <button
                                      id="btn-edit-barrier-failure"
                                      onClick={() =>
                                        startEditing(
                                          'barrier_failure',
                                          safety?.barrier_failures?.[0] ||
                                            'Physical barricade breached'
                                        )
                                      }
                                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Field 3: Hazardous Energy Context */}
                        {(() => {
                          const corr = getCorrection('energy_context');
                          const val = corr
                            ? corr.reviewed_value
                            : safety?.energy_context?.[0] ||
                              'High Pressure Hydrostatic Fluid (5,000 PSI)';

                          return (
                            <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                              <div className="flex-1">
                                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                                  Hazardous Energy Context
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm font-medium text-slate-200">{val}</span>
                                  {corr && (
                                    <span className="text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                                      AI was: {corr.ai_value}
                                    </span>
                                  )}
                                </div>
                                {corr && (
                                  <p className="text-[11px] text-slate-400 mt-1 italic">
                                    Reason: {corr.reason}
                                  </p>
                                )}
                              </div>
                              <div>
                                {corr ? (
                                  <button
                                    onClick={() => removeCorrection(corr.id)}
                                    disabled={actionLoading || isFinalized}
                                    className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  !isFinalized && (
                                    <button
                                      id="btn-edit-energy-context"
                                      onClick={() =>
                                        startEditing(
                                          'energy_context',
                                          safety?.energy_context?.[0] || 'High Pressure Fluid'
                                        )
                                      }
                                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Right Column (5 cols): Risk Context, Pattern Linkage, Comments */}
                    <div className="lg:col-span-5 space-y-6">
                      {/* Section 4: Phase 6 Risk Context */}
                      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-amber-400" />
                            Phase 6 Risk Priority Context
                          </h3>
                          <span className="text-[11px] font-mono text-slate-500">
                            (Analytical Context Only)
                          </span>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-slate-400 block">Risk Priority Band</span>
                            <span
                              className={`text-lg font-bold ${
                                risk?.priority_band === 'CRITICAL'
                                  ? 'text-rose-400'
                                  : risk?.priority_band === 'HIGH'
                                  ? 'text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            >
                              {risk?.priority_band || 'HIGH'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block">Priority Score</span>
                            <span className="text-xl font-mono font-bold text-white">
                              {risk?.score || 82} / 100
                            </span>
                          </div>
                        </div>

                        {risk?.factors && risk.factors.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] font-semibold text-slate-400 block">
                              Key Contributing Risk Factors
                            </span>
                            {risk.factors.slice(0, 3).map((f, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900/50 border border-slate-800/60"
                              >
                                <span className="text-slate-300 truncate max-w-[200px]">{f.name}</span>
                                <span className="font-mono text-amber-400 font-semibold">
                                  +{f.contribution}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section 5: Phase 8 Recurring Precursor Pattern Context */}
                      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <Flame className="w-4 h-4 text-rose-400" />
                            Phase 8 Recurring Precursor Pattern
                          </h3>
                        </div>

                        {pattern ? (
                          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-amber-400 font-semibold">
                                {pattern.pattern_number}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                {pattern.status}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white">{pattern.title}</h4>
                            <div className="text-xs text-slate-300 space-y-1 pt-1">
                              <p>
                                <strong className="text-slate-400">Recurring Barrier:</strong>{' '}
                                {pattern.barrier_failure}
                              </p>
                              <p>
                                <strong className="text-slate-400">Supporting Reports:</strong>{' '}
                                {pattern.support_count} incidents across assets
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-lg border border-slate-800">
                            No active recurring pattern linked to this report yet.
                          </p>
                        )}
                      </div>

                      {/* Section 6: Reviewer Comments & Collaboration */}
                      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-sky-400" />
                            HSE Review Comments ({review?.comments?.length || 0})
                          </h3>
                        </div>

                        {/* Comments Thread */}
                        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                          {review?.comments && review.comments.length > 0 ? (
                            review.comments.map((c) => (
                              <div
                                key={c.id}
                                className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-200">
                                    {c.author_name}{' '}
                                    <span className="text-slate-500 font-normal">
                                      ({c.author_role})
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(c.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <p className="text-slate-300">{c.content}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500 italic">
                              No reviewer comments recorded yet.
                            </p>
                          )}
                        </div>

                        {/* Add Comment Input */}
                        {!isFinalized && (
                          <form onSubmit={handleAddComment} className="pt-2 space-y-2">
                            <textarea
                              id="input-review-comment"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Add an HSE observation, inspection note, or question..."
                              rows={2}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
                            />
                            <div className="flex justify-end">
                              <button
                                type="submit"
                                disabled={actionLoading || !newComment.trim()}
                                className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50"
                              >
                                Post Note
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Audit Trail Tab */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-400" />
                    Immutable Review & HSE Validation Audit Trail
                  </h3>
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/40 overflow-hidden">
                    {data.audit_trail?.map((event) => (
                      <div key={event.id} className="p-4 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-amber-400">
                            {event.event_type}
                          </span>
                          <span className="text-slate-500">
                            {new Date(event.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-300">
                          Actor: <strong>{event.actor_name}</strong> ({event.actor_role})
                        </p>
                        {event.details && Object.keys(event.details).length > 0 && (
                          <pre className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400 overflow-x-auto">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Version History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Review Iteration & Re-Review History
                  </h3>
                  <div className="space-y-3">
                    {data.history?.map((h) => (
                      <div
                        key={h.id}
                        className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-300">
                              {h.review_version}
                            </span>
                            <ReviewStatusBadge status={h.status} size="sm" />
                          </div>
                          <span className="text-slate-500">
                            Completed: {h.completed_at ? new Date(h.completed_at).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                        <p className="text-slate-300">
                          Reviewer: <strong>{h.reviewer_name || 'Unassigned'}</strong>
                        </p>
                        {h.reviewer_summary && (
                          <p className="text-slate-400 italic bg-slate-900/60 p-2 rounded">
                            "{h.reviewer_summary}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/90 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {isFinalized
                ? 'Review finalized. Human-Reviewed Safety Record is active.'
                : 'Decisions are logged to the permanent audit trail.'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!isFinalized ? (
              <>
                {/* 1. Request More Review */}
                <button
                  id="btn-action-more-review"
                  onClick={() => {
                    setActionModal('NEEDS_MORE');
                    setActionSummary('');
                  }}
                  disabled={actionLoading}
                  className="px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  Request More Evidence
                </button>

                {/* 2. Reject AI Findings */}
                <button
                  id="btn-action-reject"
                  onClick={() => {
                    setActionModal('REJECT');
                    setActionSummary('');
                  }}
                  disabled={actionLoading}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject AI Interpretation
                </button>

                {/* 3. Submit Corrections (if corrections staged) */}
                {review?.corrections && review.corrections.length > 0 && (
                  <button
                    id="btn-action-correct"
                    onClick={() => {
                      setActionModal('CORRECT');
                      setActionSummary('');
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-500/20 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Finalize Corrections ({review.corrections.length})
                  </button>
                )}

                {/* 4. Confirm AI Output */}
                <button
                  id="btn-action-confirm"
                  onClick={() => {
                    setActionModal('CONFIRM');
                    setActionSummary('AI safety findings confirmed by HSE inspection.');
                  }}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm AI Safety Intelligence
                </button>
              </>
            ) : (
              <button
                id="btn-action-reopen-modal"
                onClick={() => {
                  setActionModal('REOPEN');
                  setActionSummary('');
                }}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Reopen Review for Revision
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Modal: Field Correction Drawer / Modal */}
      {editingField && (
        <div
          id="modal-field-correction"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-teal-400" />
                Correct {FIELD_LABELS[editingField]}
              </h4>
              <button
                onClick={() => setEditingField(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Human-Reviewed Value
                </label>
                {editingField === 'sif_classification' ? (
                  <select
                    id="input-correct-sif"
                    value={correctionValue}
                    onChange={(e) => setCorrectionValue(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="SIF_POTENTIAL">SIF_POTENTIAL</option>
                    <option value="NON_SIF_POTENTIAL">NON_SIF_POTENTIAL</option>
                    <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
                  </select>
                ) : editingField === 'iogp_rule' ? (
                  <select
                    id="input-correct-iogp"
                    value={correctionValue}
                    onChange={(e) => setCorrectionValue(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    {IOGP_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="input-correct-text"
                    type="text"
                    value={correctionValue}
                    onChange={(e) => setCorrectionValue(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  HSE Mandatory Rationale / Justification <span className="text-rose-400">*</span>
                </label>
                <textarea
                  id="input-correction-reason"
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Explain why this field is being corrected (e.g. site inspection confirmed bleed-off was completed before valve unbolting)..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              {correctionError && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {correctionError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                id="btn-save-correction"
                type="button"
                onClick={saveCorrection}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition-colors"
              >
                Stage Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Action Confirmation Modal */}
      {actionModal && (
        <div
          id="modal-decision-confirm"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                {actionModal === 'CONFIRM' && (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Confirm AI Safety Intelligence
                  </>
                )}
                {actionModal === 'CORRECT' && (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    Finalize Review with Corrections
                  </>
                )}
                {actionModal === 'REJECT' && (
                  <>
                    <XCircle className="w-4 h-4 text-rose-400" />
                    Reject AI Safety Interpretation
                  </>
                )}
                {actionModal === 'NEEDS_MORE' && (
                  <>
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    Request Additional Evidence
                  </>
                )}
                {actionModal === 'REOPEN' && (
                  <>
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    Reopen Review for Revision
                  </>
                )}
              </h4>
              <button
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                {actionModal === 'CONFIRM' &&
                  'You are validating the proposed AI SIF classification and safety indicators as official enterprise intelligence.'}
                {actionModal === 'CORRECT' &&
                  `You are submitting ${
                    review?.corrections.length || 0
                  } staged correction(s). The human-reviewed record will replace AI output as the authoritative safety truth.`}
                {actionModal === 'REJECT' &&
                  'The AI interpretation will be discarded from enterprise statistics and flagged for model retraining.'}
                {actionModal === 'NEEDS_MORE' &&
                  'Flag this record for on-site HSE investigator follow-up before a final determination is made.'}
                {actionModal === 'REOPEN' &&
                  'This will archive the current review into version history and open a new revision (V2/V3).'}
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  HSE Officer Summary / Rationale{' '}
                  {actionModal !== 'CONFIRM' && <span className="text-rose-400">*</span>}
                </label>
                <textarea
                  id="input-action-summary"
                  rows={3}
                  value={actionSummary}
                  onChange={(e) => setActionSummary(e.target.value)}
                  placeholder="Enter summary notes for this HSE determination..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {actionReasonError && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {actionReasonError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                id="btn-submit-decision"
                type="button"
                onClick={executeAction}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
              >
                {actionLoading ? 'Saving...' : 'Submit HSE Determination'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
