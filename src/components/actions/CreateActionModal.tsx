import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Calendar,
  User,
  Users,
  AlertTriangle,
  FileText,
  CheckCircle,
  HelpCircle,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button.tsx';
import { Card } from '../ui/Card.tsx';
import { Badge } from '../ui/Badge.tsx';
import { actionService } from '../../services/actionService.ts';
import {
  ActionType,
  ActionPriority,
  CreateActionPayload,
  ActionRecord,
  SourceFindingType,
} from '../../types/action.ts';

interface CreateActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActionCreated: (action: ActionRecord) => void;
  initialData?: Partial<CreateActionPayload> & {
    source_report_number?: string;
    source_pattern_number?: string;
  };
}

const AVAILABLE_ASSIGNEES = [
  { id: 'user-priyanka-02', name: 'Priyanka Saikia', role: 'HSEOfficer', site: 'Digboi Central Asset' },
  { id: 'user-debajit-03', name: 'Debajit Bora', role: 'SafetyReviewer', site: 'Duliajan Field Operations' },
  { id: 'user-alok-01', name: 'Dr. Alok Baruah', role: 'OrgAdmin', site: 'Enterprise HSSE Lead' },
  { id: 'user-manish-04', name: 'Manish Chhetri', role: 'SiteManager', site: 'Moran Gathering Station' },
];

export const CreateActionModal: React.FC<CreateActionModalProps> = ({
  isOpen,
  onClose,
  onActionCreated,
  initialData,
}) => {
  const [actionType, setActionType] = useState<ActionType>('CORRECTIVE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ActionPriority>('HIGH');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [teamName, setTeamName] = useState('HSE Operational Remediation Team');
  const [verificationRequired, setVerificationRequired] = useState(true);
  const [initialComment, setInitialComment] = useState('');

  // Source traceability
  const [sourceReportId, setSourceReportId] = useState<string | undefined>(undefined);
  const [sourceReportNumber, setSourceReportNumber] = useState<string | undefined>(undefined);
  const [sourcePatternId, setSourcePatternId] = useState<string | undefined>(undefined);
  const [sourcePatternNumber, setSourcePatternNumber] = useState<string | undefined>(undefined);
  const [sourceFindingType, setSourceFindingType] = useState<SourceFindingType>('BARRIER_FAILURE');
  const [sourceFindingSummary, setSourceFindingSummary] = useState('');
  const [siteName, setSiteName] = useState('');
  const [activityName, setActivityName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Default due date to 7 days from now
      const d = new Date();
      d.setDate(d.getDate() + 7);
      const defaultDateStr = d.toISOString().split('T')[0];

      if (initialData) {
        setActionType(initialData.action_type || 'CORRECTIVE');
        setTitle(initialData.title || '');
        setDescription(initialData.description || '');
        setPriority(initialData.priority || 'HIGH');
        setDueDate(initialData.due_at ? initialData.due_at.split('T')[0] : defaultDateStr);
        setAssigneeId(initialData.owner_user_id || AVAILABLE_ASSIGNEES[0].id);
        setTeamName(initialData.owner_team_name || 'HSE Operational Remediation Team');
        setVerificationRequired(initialData.verification_required !== false);
        setSourceReportId(initialData.source_report_id);
        setSourceReportNumber(initialData.source_report_number);
        setSourcePatternId(initialData.source_pattern_id);
        setSourcePatternNumber(initialData.source_pattern_number);
        setSourceFindingType(initialData.source_finding_type || 'BARRIER_FAILURE');
        setSourceFindingSummary(initialData.source_finding_summary || '');
        setSiteName(initialData.site_name || '');
        setActivityName(initialData.activity_name || '');
      } else {
        setActionType('CORRECTIVE');
        setTitle('');
        setDescription('');
        setPriority('HIGH');
        setDueDate(defaultDateStr);
        setAssigneeId(AVAILABLE_ASSIGNEES[0].id);
        setTeamName('HSE Operational Remediation Team');
        setVerificationRequired(true);
        setSourceReportId(undefined);
        setSourceReportNumber(undefined);
        setSourcePatternId(undefined);
        setSourcePatternNumber(undefined);
        setSourceFindingType('BARRIER_FAILURE');
        setSourceFindingSummary('');
        setSiteName('');
        setActivityName('');
      }
      setInitialComment('');
      setErrorMessage(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Action title is required.');
      return;
    }
    if (title.trim().length < 5) {
      setErrorMessage('Action title must be at least 5 characters long.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Action scope description is required.');
      return;
    }
    if (!dueDate) {
      setErrorMessage('Due date is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateActionPayload = {
        organization_id: 'oil-india-demo',
        action_type: actionType,
        title: title.trim(),
        description: description.trim(),
        priority,
        due_at: new Date(dueDate).toISOString(),
        owner_user_id: assigneeId || undefined,
        owner_team_name: teamName.trim() || undefined,
        verification_required: verificationRequired,
        source_report_id: sourceReportId,
        source_pattern_id: sourcePatternId,
        source_finding_type: sourceFindingType,
        source_finding_summary: sourceFindingSummary || undefined,
        site_name: siteName || undefined,
        activity_name: activityName || undefined,
        comments: initialComment.trim() || undefined,
      };

      const created = await actionService.createAction(payload);
      onActionCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 bg-card rounded-xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {actionType === 'PREVENTIVE' ? 'Create Preventive Action' : 'Create Corrective Action (CAPA)'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Phase 10 Human-controlled HSE remediation workflow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Source Linkage Box if present */}
          {(sourceReportId || sourcePatternId || sourceFindingSummary) && (
            <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <span className="flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5" />
                  Linked Upstream Intelligence Source
                </span>
                {sourceReportNumber && (
                  <Badge variant="primary" size="sm">
                    Report: {sourceReportNumber}
                  </Badge>
                )}
                {sourcePatternNumber && (
                  <Badge variant="warning" size="sm">
                    Pattern: {sourcePatternNumber}
                  </Badge>
                )}
              </div>
              {sourceFindingSummary && (
                <p className="text-xs text-foreground font-medium">
                  {sourceFindingSummary}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                {siteName && <span>Site: <strong className="text-foreground">{siteName}</strong></span>}
                {activityName && <span>Activity: <strong className="text-foreground">{activityName}</strong></span>}
                <span>Finding Type: <strong className="text-foreground">{sourceFindingType}</strong></span>
              </div>
            </div>
          )}

          {/* Action Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Action Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActionType('CORRECTIVE')}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                    actionType === 'CORRECTIVE'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-muted/40 text-foreground border-border hover:bg-muted'
                  }`}
                >
                  Corrective (Finding)
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('PREVENTIVE')}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                    actionType === 'PREVENTIVE'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-muted/40 text-foreground border-border hover:bg-muted'
                  }`}
                >
                  Preventive (Pattern)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Workflow Priority <span className="text-rose-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ActionPriority)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="CRITICAL">CRITICAL (Immediate Action)</option>
                <option value="HIGH">HIGH (Standard CAPA)</option>
                <option value="MEDIUM">MEDIUM (Operational Audit)</option>
                <option value="LOW">LOW (Housekeeping / Minor)</option>
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Workflow priority tracks task urgency and does not modify Phase 6 risk score.
              </p>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Action Title / Scope <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Install Certified Whip-Checks on Standpipe Mud Manifold"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Detailed Scope of Remediation & Acceptance Criteria <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe exact physical modifications, procedure updates, or equipment recalibrations required..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50 resize-none"
              required
            />
          </div>

          {/* Due Date & Owner Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Target Due Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Assign Responsible Specialist
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Leave Unassigned (Open Pool) --</option>
                {AVAILABLE_ASSIGNEES.map((usr) => (
                  <option key={usr.id} value={usr.id}>
                    {usr.name} ({usr.role} - {usr.site})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Responsible Team */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Responsible Team / Department
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Rigging & Mechanical Maintenance"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="relative flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verificationRequired}
                  onChange={(e) => setVerificationRequired(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-semibold text-foreground">
                    Independent Verification Required
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Must be physically verified by safety officer before action can be closed.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Optional initial comment */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Initial Instructions or Audit Note (Optional)
            </label>
            <input
              type="text"
              value={initialComment}
              onChange={(e) => setInitialComment(e.target.value)}
              placeholder="e.g. High-pressure line safety stand-down scheduled prior to execution"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Human-in-the-Loop Governance Notice */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary shrink-0" />
            <span>
              <strong>Human Authority Mandate:</strong> This corrective action is created and governed directly by authorized HSE personnel. Actions are not autonomously generated by AI models.
            </span>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Action...' : 'Create HSE Action'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
