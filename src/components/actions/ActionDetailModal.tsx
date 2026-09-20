import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Clock,
  User,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  CheckCheck,
  RotateCcw,
  XCircle,
  FileText,
  MessageSquare,
  Paperclip,
  History,
  Link as LinkIcon,
  ArrowRight,
  Upload,
  Send,
  Building2,
  Activity,
  Edit2,
  Save,
} from 'lucide-react';
import { Button } from '../ui/Button.tsx';
import { Card } from '../ui/Card.tsx';
import { Badge } from '../ui/Badge.tsx';
import { ActionStatusBadge, ActionPriorityBadge, ActionTypeBadge } from './ActionStatusBadge.tsx';
import { actionService } from '../../services/actionService.ts';
import {
  ActionRecord,
  ActionStatus,
  ActionEvent,
  ActionComment,
  ActionEvidence,
  ActionPriority,
} from '../../types/action.ts';

interface ActionDetailModalProps {
  actionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onActionUpdated?: (updated: ActionRecord) => void;
  onNavigateToReport?: (reportId: string) => void;
  onNavigateToPattern?: (patternId: string) => void;
}

const REVIEWERS_LIST = [
  { id: 'user-priyanka-02', name: 'Priyanka Saikia', role: 'HSEOfficer' },
  { id: 'user-debajit-03', name: 'Debajit Bora', role: 'SafetyReviewer' },
  { id: 'user-alok-01', name: 'Dr. Alok Baruah', role: 'OrgAdmin' },
  { id: 'user-manish-04', name: 'Manish Chhetri', role: 'SiteManager' },
];

export const ActionDetailModal: React.FC<ActionDetailModalProps> = ({
  actionId,
  isOpen,
  onClose,
  onActionUpdated,
  onNavigateToReport,
  onNavigateToPattern,
}) => {
  const [action, setAction] = useState<ActionRecord | null>(null);
  const [history, setHistory] = useState<ActionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'comments' | 'history'>('overview');

  // Interactive Action States
  const [isProcessing, setIsProcessing] = useState(false);
  const [completionSummary, setCompletionSummary] = useState('');
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Verification
  const [verificationNotes, setVerificationNotes] = useState('');
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);

  // Closure
  const [closureSummary, setClosureSummary] = useState('');
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  // Reopen
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenDialog, setShowReopenDialog] = useState(false);

  // Cancel
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Comment
  const [newComment, setNewComment] = useState('');

  // Evidence
  const [evidenceFileName, setEvidenceFileName] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidenceType, setEvidenceType] = useState<'IMPLEMENTATION' | 'VERIFICATION'>('IMPLEMENTATION');
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);

  // Due Date & Priority Editing
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editPriority, setEditPriority] = useState<ActionPriority>('HIGH');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueReason, setEditDueReason] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');

  useEffect(() => {
    if (isOpen && actionId) {
      loadActionDetails();
    } else {
      setAction(null);
      setHistory([]);
      setError(null);
      resetDialogs();
    }
  }, [isOpen, actionId]);

  const resetDialogs = () => {
    setShowCompleteDialog(false);
    setShowVerifyDialog(false);
    setShowCloseDialog(false);
    setShowReopenDialog(false);
    setShowCancelDialog(false);
    setShowEvidenceDialog(false);
    setIsEditingMetadata(false);
    setCompletionSummary('');
    setVerificationNotes('');
    setClosureSummary('');
    setReopenReason('');
    setCancelReason('');
    setNewComment('');
  };

  const loadActionDetails = async () => {
    if (!actionId) return;
    try {
      setLoading(true);
      setError(null);
      const [data, hist] = await Promise.all([
        actionService.getActionById(actionId),
        actionService.getHistory(actionId),
      ]);
      setAction(data);
      setHistory(hist);
      setEditPriority(data.priority);
      setEditDueDate(data.due_at.split('T')[0]);
      setEditAssigneeId(data.owner_user_id || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load action details.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAction = async () => {
    if (!action) return;
    try {
      setIsProcessing(true);
      setError(null);
      const updated = await actionService.startAction(action.id);
      setAction(updated);
      await refreshHistory();
      if (onActionUpdated) onActionUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to start action.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteAction = async () => {
    if (!action || !completionSummary.trim()) {
      setError('A detailed completion summary is required.');
      return;
    }
    try {
      setIsProcessing(true);
      setError(null);
      const updated = await actionService.completeAction(action.id, completionSummary.trim());
      setAction(updated);
      setShowCompleteDialog(false);
      setCompletionSummary('');
      await refreshHistory();
      if (onActionUpdated) onActionUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to complete action.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyAction = async (verified: boolean) => {
    if (!action || !verificationNotes.trim()) {
      setError('Verification notes are mandatory.');
      return;
    }
    try {
      setIsProcessing(true);
      setError(null);
      const updated = await actionService.verifyAction(action.id, verified, verificationNotes.trim());
      setAction(updated);
      setShowVerifyDialog(false);
      setVerificationNotes('');
      await refreshHistory();
      if (onActionUpdated) onActionUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Verification submission failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseAction = async () => {
    if (!action) return;
    try {
      setIsProcessing(true);
      setError(null);
      const updated = await actionService.closeAction(
        action.id,
        closureSummary.trim() || 'Remediation completed and verified in compliance with safety standards.'
      );
      setAction(updated);
      setShowCloseDialog(false);
      setClosureSummary('');
      await refreshHistory();
      if (onActionUpdated) onActionUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to close action.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReopenAction = async () => {
    if (!action || !reopenReason.trim()) {
      setError('Reopening requires an explicit operational explanation.');
      return;
    }
    try {
      setIsProcessing(true);
      setError(null);
      const updated = await actionService.reopenAction(action.id, reopenReason.trim());
      setAction(updated);
      setShowReopenDialog(false);
      setReopenReason('');
      await refreshHistory();
      if (onActionUpdated) onActionUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to reopen action.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelAction = async () => {
    if (!action || !cancelReason.trim()) {
      setError('Cancellation requires a clear operational justification.');
      return;
    }
    try {
      setIsProcessing(true);
      setError(null);
      const updated = await actionService.cancelAction(action.id, cancelReason.trim());
      setAction(updated);
      setShowCancelDialog(false);
      setCancelReason('');
      await refreshHistory();
      if (onActionUpdated) onActionUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel action.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action || !newComment.trim()) return;
    try {
      setIsProcessing(true);
      const comment = await actionService.addComment(action.id, newComment.trim());
      setAction({ ...action, comments: [...action.comments, comment] });
      setNewComment('');
      await refreshHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to add comment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action || !evidenceFileName.trim() || !evidenceDescription.trim()) return;
    try {
      setIsProcessing(true);
      const evi = await actionService.addEvidence(action.id, {
        file_name: evidenceFileName.trim(),
        description: evidenceDescription.trim(),
        evidence_type: evidenceType,
        media_type: 'application/pdf',
        file_size: 245000,
      });
      setAction({ ...action, evidence: [...action.evidence, evi] });
      setShowEvidenceDialog(false);
      setEvidenceFileName('');
      setEvidenceDescription('');
      await refreshHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to attach evidence.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!action) return;
    try {
      setIsProcessing(true);
      setError(null);
      const patch: any = {
        priority: editPriority,
        expected_version: action.updated_at,
      };

      if (editDueDate && editDueDate !== action.due_at.split('T')[0]) {
        patch.due_at = new Date(editDueDate).toISOString();
        patch.due_date_change_reason = editDueReason || 'Operational adjustment by HSE supervisor';
      }

      if (editAssigneeId && editAssigneeId !== action.owner_user_id) {
        patch.owner_user_id = editAssigneeId;
      }

      const updated = await actionService.updateAction(action.id, patch);
      setAction(updated);
      setIsEditingMetadata(false);
      await refreshHistory();
      if (onActionUpdated) onActionUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update action metadata.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProgressChange = async (pct: number) => {
    if (!action) return;
    try {
      setIsProcessing(true);
      const updated = await actionService.updateAction(action.id, {
        progress_pct: pct,
        expected_version: action.updated_at,
      });
      setAction(updated);
      await refreshHistory();
      if (onActionUpdated) onActionUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update progress.');
    } finally {
      setIsProcessing(false);
    }
  };

  const refreshHistory = async () => {
    if (!actionId) return;
    try {
      const hist = await actionService.getHistory(actionId);
      setHistory(hist);
    } catch {
      // Non-blocking
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl my-6 bg-card rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-foreground">
                  {action?.action_number || 'Action Detail'}
                </span>
                {action && <ActionTypeBadge type={action.action_type} />}
                {action && <ActionPriorityBadge priority={action.priority} />}
              </div>
              <h1 className="text-base font-semibold text-foreground line-clamp-1 mt-0.5">
                {action?.title || 'Loading Action...'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {action && (
              <ActionStatusBadge status={action.status} isOverdue={action.is_overdue} />
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Clock className="w-8 h-8 animate-spin mb-3 text-primary" />
              <p className="text-sm">Loading authoritative action record...</p>
            </div>
          ) : action ? (
            <>
              {/* Lifecycle Action Bar (Interactive State Machine Controls) */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Current Lifecycle State:
                    </span>
                    <strong className="text-xs text-foreground font-bold">{action.status}</strong>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {action.status === 'ASSIGNED' && 'Assigned to specialist. Awaiting mobilization and start.'}
                    {action.status === 'OPEN' && 'Open in pool. Requires assignment or immediate start.'}
                    {action.status === 'IN_PROGRESS' && 'Remediation is actively underway.'}
                    {action.status === 'VERIFICATION_REQUIRED' && 'Awaiting independent physical verification from HSE Officer.'}
                    {action.status === 'VERIFIED' && 'Verified by safety officer. Ready for final administrative closure.'}
                    {action.status === 'CLOSED' && 'Remediation complete, verified, and officially closed.'}
                    {action.status === 'CANCELLED' && 'Action marked cancelled by supervisor.'}
                    {action.status === 'REOPENED' && 'Action reopened for secondary remediation.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Start Action */}
                  {(action.status === 'ASSIGNED' || action.status === 'OPEN') && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleStartAction}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Start Action</span>
                    </Button>
                  )}

                  {/* Complete Action */}
                  {action.status === 'IN_PROGRESS' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowCompleteDialog(true)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Completed</span>
                    </Button>
                  )}

                  {/* Verify Action */}
                  {action.status === 'VERIFICATION_REQUIRED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowVerifyDialog(true)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Remediation</span>
                    </Button>
                  )}

                  {/* Close Action */}
                  {(action.status === 'VERIFIED' || (!action.verification_required && action.status === 'COMPLETED')) && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowCloseDialog(true)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>Close Action</span>
                    </Button>
                  )}

                  {/* Reopen Action */}
                  {(action.status === 'CLOSED' || action.status === 'CANCELLED') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReopenDialog(true)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reopen Action</span>
                    </Button>
                  )}

                  {/* Cancel Action */}
                  {action.status !== 'CLOSED' && action.status !== 'CANCELLED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCancelDialog(true)}
                      disabled={isProcessing}
                      className="text-muted-foreground hover:text-rose-600"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      <span>Cancel</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Upstream Intelligence Linkage Box */}
              {(action.source_report_id || action.source_pattern_id || action.source_finding_summary) && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-bold text-primary tracking-wider uppercase">
                      <LinkIcon className="w-4 h-4" />
                      Upstream Safety Intelligence Source
                    </span>
                    <div className="flex items-center gap-2">
                      {action.source_report_id && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToReport && action.source_report_id) {
                              onNavigateToReport(action.source_report_id);
                              onClose();
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-colors flex items-center gap-1"
                        >
                          <span>Report: {action.source_report_number || action.source_report_id}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {action.source_pattern_id && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToPattern && action.source_pattern_id) {
                              onNavigateToPattern(action.source_pattern_id);
                              onClose();
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-500/15 text-amber-700 border border-amber-300 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-500/25 transition-colors flex items-center gap-1"
                        >
                          <span>Pattern: {action.source_pattern_number || action.source_pattern_id}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {action.source_finding_summary && (
                    <p className="text-xs text-foreground font-medium bg-background/60 p-2.5 rounded-lg border border-border">
                      {action.source_finding_summary}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                    {action.site_name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        Site: <strong className="text-foreground">{action.site_name}</strong>
                      </span>
                    )}
                    {action.activity_name && (
                      <span className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                        Activity: <strong className="text-foreground">{action.activity_name}</strong>
                      </span>
                    )}
                    {action.source_finding_type && (
                      <span>
                        Finding Category: <strong className="text-foreground">{action.source_finding_type}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Progress & Implementation Controls (when IN_PROGRESS) */}
              {action.status === 'IN_PROGRESS' && (
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Remediation Progress: {action.progress_pct}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Authoritative status remains {action.status}
                    </span>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${action.progress_pct}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-muted-foreground mr-1">Update Progress:</span>
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleProgressChange(pct)}
                        disabled={isProcessing}
                        className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors ${
                          action.progress_pct === pct
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/40 hover:bg-muted text-foreground border-border'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs Navigation */}
              <div className="flex items-center gap-2 border-b border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'overview'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Overview & Scope</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('evidence')}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'evidence'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Evidence & Sign-offs ({action.evidence.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('comments')}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'comments'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Comments ({action.comments.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'history'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit Trail ({history.length})</span>
                </button>
              </div>

              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Detailed Description */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Remediation Scope & Technical Requirements
                    </h3>
                    <div className="p-4 rounded-xl border border-border bg-card text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {action.description}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        Assigned Specialist
                      </span>
                      <p className="text-sm font-semibold text-foreground">
                        {action.owner_user_name || 'Unassigned'}
                      </p>
                      {action.owner_user_role && (
                        <p className="text-[11px] text-muted-foreground">{action.owner_user_role}</p>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Responsible Team
                      </span>
                      <p className="text-sm font-semibold text-foreground">
                        {action.owner_team_name || 'HSE Operational Remediation Team'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Department Responsibility</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Target Due Date
                      </span>
                      <p className="text-sm font-semibold text-foreground">
                        {new Date(action.due_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      {action.is_overdue ? (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                          {action.days_overdue} day(s) overdue
                        </p>
                      ) : (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">On Track</p>
                      )}
                    </div>
                  </div>

                  {/* Verification Status Card if required */}
                  {action.verification_required && (
                    <div className="p-4 rounded-xl border border-border bg-purple-500/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                          <ShieldCheck className="w-4 h-4" />
                          Independent Verification Protocol
                        </span>
                        <Badge variant="outline" size="sm">
                          Status: {action.verification_status}
                        </Badge>
                      </div>
                      {action.verifier_user_name ? (
                        <div className="text-xs text-foreground space-y-1">
                          <p>
                            Verified by <strong>{action.verifier_user_name}</strong> on{' '}
                            {action.verified_at && new Date(action.verified_at).toLocaleString()}
                          </p>
                          {action.verification_notes && (
                            <p className="p-2 rounded bg-card border border-border text-muted-foreground">
                              {action.verification_notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          This action requires physical confirmation and sign-off by a certified HSE verifier before administrative closure.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Completion Summary Card if completed */}
                  {action.completion_summary && (
                    <div className="p-4 rounded-xl border border-border bg-emerald-500/5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Remediation Summary & Outcome
                        </span>
                        <span>
                          {action.completed_at && new Date(action.completed_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {action.completion_summary}
                      </p>
                    </div>
                  )}

                  {/* Closure Card if closed */}
                  {action.status === 'CLOSED' && (
                    <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-foreground">
                        <span className="flex items-center gap-1.5">
                          <CheckCheck className="w-4 h-4 text-emerald-600" />
                          Final Sign-Off Closure
                        </span>
                        <span className="text-muted-foreground">
                          {action.closed_at && new Date(action.closed_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Signed off by <strong>{action.closed_by || 'HSE Lead'}</strong>
                        {action.closure_summary && `: ${action.closure_summary}`}
                      </p>
                    </div>
                  )}

                  {/* Metadata Edit Drawer */}
                  {action.status !== 'CLOSED' && action.status !== 'CANCELLED' && (
                    <div className="pt-2">
                      {!isEditingMetadata ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingMetadata(true)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Modify Due Date, Priority or Assignee</span>
                        </Button>
                      ) : (
                        <div className="p-4 rounded-xl border border-border bg-card space-y-4 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                              Modify Action Metadata
                            </h4>
                            <button
                              type="button"
                              onClick={() => setIsEditingMetadata(false)}
                              className="text-muted-foreground hover:text-foreground text-xs"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                                Priority
                              </label>
                              <select
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value as ActionPriority)}
                                className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-background"
                              >
                                <option value="CRITICAL">CRITICAL</option>
                                <option value="HIGH">HIGH</option>
                                <option value="MEDIUM">MEDIUM</option>
                                <option value="LOW">LOW</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                                Target Due Date
                              </label>
                              <input
                                type="date"
                                value={editDueDate}
                                onChange={(e) => setEditDueDate(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-background"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                                Specialist
                              </label>
                              <select
                                value={editAssigneeId}
                                onChange={(e) => setEditAssigneeId(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-background"
                              >
                                {REVIEWERS_LIST.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name} ({r.role})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                              Reason for Metadata Modification
                            </label>
                            <input
                              type="text"
                              value={editDueReason}
                              onChange={(e) => setEditDueReason(e.target.value)}
                              placeholder="e.g. Schedule adjustment approved during weekly operations meeting"
                              className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-background placeholder:text-muted-foreground/50"
                            />
                          </div>

                          <div className="flex justify-end">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleSaveMetadata}
                              disabled={isProcessing}
                              className="flex items-center gap-1.5 text-xs"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Modifications</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Evidence */}
              {activeTab === 'evidence' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Remediation Evidence & Inspection Attachments
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Photographic verification, calibration records, and inspection sign-off metadata.
                      </p>
                    </div>
                    {action.status !== 'CLOSED' && action.status !== 'CANCELLED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEvidenceDialog(true)}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Attach Evidence</span>
                      </Button>
                    )}
                  </div>

                  {action.evidence.length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground">
                      <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No evidence documents attached to this action yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {action.evidence.map((evi) => (
                        <div
                          key={evi.id}
                          className="p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-foreground truncate max-w-[200px]">
                              {evi.file_name}
                            </span>
                            <Badge
                              variant={evi.evidence_type === 'VERIFICATION' ? 'primary' : 'outline'}
                              size="sm"
                            >
                              {evi.evidence_type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {evi.description}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 pt-1 border-t border-border/50">
                            <span>By: {evi.uploaded_by}</span>
                            <span>{new Date(evi.uploaded_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Evidence Upload Simulator Dialog */}
                  {showEvidenceDialog && (
                    <form
                      onSubmit={handleAddEvidence}
                      className="p-4 rounded-xl border border-border bg-card space-y-3 mt-4"
                    >
                      <h4 className="text-xs font-bold text-foreground">Attach Remediation Evidence</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                            Document / File Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={evidenceFileName}
                            onChange={(e) => setEvidenceFileName(e.target.value)}
                            placeholder="e.g. Scaffolding_GreenTag_Audit.pdf"
                            className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-background"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                            Evidence Type
                          </label>
                          <select
                            value={evidenceType}
                            onChange={(e) => setEvidenceType(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-background"
                          >
                            <option value="IMPLEMENTATION">Implementation (Remediation Work)</option>
                            <option value="VERIFICATION">Verification (QA/QC Sign-off)</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                          Description of Evidence <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={evidenceDescription}
                          onChange={(e) => setEvidenceDescription(e.target.value)}
                          placeholder="e.g. Signed physical checklist and photographs of installed whip checks"
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-background"
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowEvidenceDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="sm" disabled={isProcessing}>
                          Attach Record
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Tab 3: Comments */}
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Operational Comment Log
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Append-only record of communication between specialists, supervisors, and reviewers.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {action.comments.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-4">No comments recorded yet.</p>
                    ) : (
                      action.comments.map((cmt) => (
                        <div key={cmt.id} className="p-3 rounded-xl border border-border bg-card space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">{cmt.author_name}</span>
                            <span className="text-muted-foreground text-[11px]">
                              {new Date(cmt.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{cmt.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {action.status !== 'CLOSED' && action.status !== 'CANCELLED' && (
                    <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add operational comment or update..."
                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isProcessing || !newComment.trim()}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Post</span>
                      </Button>
                    </form>
                  )}
                </div>
              )}

              {/* Tab 4: Audit History */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Authoritative Event Timeline
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Immutable sequence of state transitions, reassignments, and verification milestones.
                    </p>
                  </div>

                  <div className="relative pl-6 border-l-2 border-border space-y-5 my-2">
                    {history.map((evt) => (
                      <div key={evt.id} className="relative">
                        <div className="absolute -left-[31px] top-0 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">
                              {evt.event_type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(evt.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            By <strong>{evt.actor.name}</strong> ({evt.actor.role})
                          </p>
                          {evt.details && Object.keys(evt.details).length > 0 && (
                            <pre className="text-[10px] p-2 rounded bg-muted/50 border border-border overflow-x-auto text-muted-foreground">
                              {JSON.stringify(evt.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Modals/Prompts */}

              {/* Complete Dialog */}
              {showCompleteDialog && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Confirm Remediation Completion
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Please provide an authoritative summary of the physical modifications or procedural remediations completed.
                    {action.verification_required && ' This will transition the action to VERIFICATION_REQUIRED.'}
                  </p>
                  <textarea
                    value={completionSummary}
                    onChange={(e) => setCompletionSummary(e.target.value)}
                    rows={3}
                    placeholder="Describe exact work executed, personnel involved, and test results..."
                    className="w-full p-2.5 text-xs rounded-lg border border-border bg-background text-foreground"
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowCompleteDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCompleteAction}
                      disabled={isProcessing || !completionSummary.trim()}
                    >
                      Submit Completion
                    </Button>
                  </div>
                </div>
              )}

              {/* Verify Dialog */}
              {showVerifyDialog && (
                <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                  <h4 className="text-xs font-bold text-purple-800 dark:text-purple-300">
                    Independent HSE Physical Verification
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Record your verification inspection findings. If verified, the action is approved for closure. If rejected, the action returns to IN_PROGRESS.
                  </p>
                  <textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    rows={3}
                    placeholder="Enter physical inspection notes, tag validation, or deficiency observations..."
                    className="w-full p-2.5 text-xs rounded-lg border border-border bg-background text-foreground"
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowVerifyDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerifyAction(false)}
                      disabled={isProcessing || !verificationNotes.trim()}
                      className="text-rose-600 hover:bg-rose-50 border-rose-300"
                    >
                      Reject Verification (Rework)
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleVerifyAction(true)}
                      disabled={isProcessing || !verificationNotes.trim()}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Approve & Verify
                    </Button>
                  </div>
                </div>
              )}

              {/* Close Dialog */}
              {showCloseDialog && (
                <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 space-y-3">
                  <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300">
                    Final Sign-Off & Closure
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Confirm that all remedial actions, barrier checks, and independent verifications are successfully satisfied.
                  </p>
                  <input
                    type="text"
                    value={closureSummary}
                    onChange={(e) => setClosureSummary(e.target.value)}
                    placeholder="Optional closure summary comment..."
                    className="w-full p-2 text-xs rounded-lg border border-border bg-background text-foreground"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowCloseDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCloseAction}
                      disabled={isProcessing}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      Confirm Action Closure
                    </Button>
                  </div>
                </div>
              )}

              {/* Reopen Dialog */}
              {showReopenDialog && (
                <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 space-y-3">
                  <h4 className="text-xs font-bold text-orange-800 dark:text-orange-300">
                    Reopen Corrective Action
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    State the operational justification for reopening this closed or cancelled action.
                  </p>
                  <textarea
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    rows={2}
                    placeholder="Reason for reopening (e.g. recurrence of vibration, barrier bypass detected during subsequent audit)..."
                    className="w-full p-2.5 text-xs rounded-lg border border-border bg-background text-foreground"
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowReopenDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleReopenAction}
                      disabled={isProcessing || !reopenReason.trim()}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Reopen Action
                    </Button>
                  </div>
                </div>
              )}

              {/* Cancel Dialog */}
              {showCancelDialog && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                  <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    Cancel Action
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    State the justification for cancelling this action (e.g. equipment decommissioned, duplicate scope).
                  </p>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={2}
                    placeholder="Cancellation justification..."
                    className="w-full p-2.5 text-xs rounded-lg border border-border bg-background text-foreground"
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowCancelDialog(false)}>
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCancelAction}
                      disabled={isProcessing || !cancelReason.trim()}
                      className="bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      Confirm Cancellation
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/20 shrink-0 text-xs text-muted-foreground">
          <span>SUCHAK Enterprise HSE CAPA Framework</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
