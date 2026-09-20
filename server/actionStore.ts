import fs from 'fs';
import path from 'path';
import {
  ActionRecord,
  ActionStatus,
  ActionType,
  ActionPriority,
  ActionComment,
  ActionEvidence,
  ActionEvent,
  ActionSummaryKPIs,
  ActionFilterOptions,
  CreateActionPayload,
  ActionActor,
} from './actionTypes.ts';
import { REVIEWERS } from './reviewStore.ts';

const ALLOWED_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  DRAFT: ['OPEN', 'ASSIGNED', 'CANCELLED'],
  OPEN: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'ASSIGNED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['VERIFICATION_REQUIRED', 'VERIFIED', 'CLOSED'],
  VERIFICATION_REQUIRED: ['VERIFIED', 'IN_PROGRESS', 'CANCELLED'],
  VERIFIED: ['CLOSED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'ASSIGNED', 'CANCELLED'],
  CANCELLED: ['REOPENED'],
};

export class ActionStore {
  private actions: Map<string, ActionRecord> = new Map();
  private auditEvents: ActionEvent[] = [];
  private persistencePath: string;
  private actionCounter = 100;

  constructor(persistencePath?: string) {
    this.persistencePath =
      persistencePath || path.join(process.cwd(), 'data', 'suchak_actions_store.json');
    this.loadFromDisk();
    if (this.actions.size === 0) {
      this.seedInitialActions();
    }
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const payload = {
        actions: Array.from(this.actions.values()),
        auditEvents: this.auditEvents.slice(-600),
        actionCounter: this.actionCounter,
      };

      fs.writeFileSync(this.persistencePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[SUCHAK ActionStore] Warning: could not persist actions to disk:', err);
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.persistencePath)) {
        const raw = fs.readFileSync(this.persistencePath, 'utf-8');
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed.actions)) {
          for (const a of parsed.actions) {
            this.actions.set(a.id, a);
          }
        }
        if (Array.isArray(parsed.auditEvents)) {
          this.auditEvents = parsed.auditEvents;
        }
        if (typeof parsed.actionCounter === 'number') {
          this.actionCounter = parsed.actionCounter;
        }
      }
    } catch (err) {
      console.warn('[SUCHAK ActionStore] Could not load persisted actions:', err);
    }
  }

  private generateActionNumber(): string {
    this.actionCounter += 1;
    const year = new Date().getFullYear();
    return `ACT-${year}-${this.actionCounter.toString().padStart(6, '0')}`;
  }

  private calculateOverdue(action: ActionRecord): { is_overdue: boolean; days_overdue: number } {
    if (action.status === 'CLOSED' || action.status === 'CANCELLED') {
      return { is_overdue: false, days_overdue: 0 };
    }
    const dueTime = new Date(action.due_at).getTime();
    const nowTime = Date.now();
    if (nowTime > dueTime) {
      const diffDays = Math.ceil((nowTime - dueTime) / (1000 * 60 * 60 * 24));
      return { is_overdue: true, days_overdue: diffDays };
    }
    return { is_overdue: false, days_overdue: 0 };
  }

  private recordEvent(
    actionId: string,
    organizationId: string,
    actor: ActionActor,
    eventType: any,
    details: Record<string, any>,
    prevStatus?: ActionStatus | null,
    newStatus?: ActionStatus | null
  ): void {
    const event: ActionEvent = {
      id: `evt-act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action_id: actionId,
      organization_id: organizationId,
      actor,
      event_type: eventType,
      previous_status: prevStatus,
      new_status: newStatus,
      details,
      created_at: new Date().toISOString(),
    };
    this.auditEvents.push(event);
  }

  /**
   * Creates a new corrective or preventive action with human initiation.
   */
  public createAction(payload: CreateActionPayload, actor: ActionActor): ActionRecord {
    const orgId = payload.organization_id || 'oil-india-demo';
    const actionId = `act-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const actionNumber = this.generateActionNumber();

    let assignedReviewer = null;
    if (payload.owner_user_id) {
      assignedReviewer = REVIEWERS.find((r) => r.id === payload.owner_user_id) || null;
    }

    const initialStatus: ActionStatus = payload.owner_user_id ? 'ASSIGNED' : 'OPEN';

    const action: ActionRecord = {
      id: actionId,
      action_number: actionNumber,
      organization_id: orgId,
      action_type: payload.action_type || 'CORRECTIVE',
      title: payload.title.trim(),
      description: payload.description.trim(),
      source_report_id: payload.source_report_id || null,
      source_report_number: null,
      source_review_id: payload.source_review_id || null,
      source_pattern_id: payload.source_pattern_id || null,
      source_pattern_number: null,
      source_finding_type: payload.source_finding_type || 'BARRIER_FAILURE',
      source_finding_summary: payload.source_finding_summary || null,
      site_id: payload.site_id || null,
      site_name: payload.site_name || null,
      location_name: payload.location_name || null,
      activity_name: payload.activity_name || null,
      owner_user_id: assignedReviewer ? assignedReviewer.id : (payload.owner_user_id || null),
      owner_user_name: assignedReviewer ? assignedReviewer.name : null,
      owner_user_role: assignedReviewer ? assignedReviewer.role : null,
      owner_team_name: payload.owner_team_name || 'HSE Operational Remediation Team',
      assigned_at: payload.owner_user_id ? new Date().toISOString() : null,
      created_by: actor,
      priority: payload.priority || 'HIGH',
      status: initialStatus,
      progress_pct: 0,
      verification_required: payload.verification_required !== false,
      verification_status: payload.verification_required !== false ? 'PENDING' : 'NOT_REQUIRED',
      verifier_user_id: null,
      verifier_user_name: null,
      verification_notes: null,
      verified_at: null,
      due_at: payload.due_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      started_at: null,
      completed_at: null,
      completion_summary: null,
      closed_at: null,
      closed_by: null,
      closure_summary: null,
      reopened_at: null,
      reopened_by: null,
      reopen_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      cancellation_reason: null,
      is_overdue: false,
      days_overdue: 0,
      comments: [],
      evidence: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (payload.comments) {
      action.comments.push({
        id: `cmt-${Date.now()}`,
        action_id: action.id,
        author_id: actor.id,
        author_name: actor.name,
        author_role: actor.role,
        content: payload.comments,
        created_at: new Date().toISOString(),
      });
    }

    const overdue = this.calculateOverdue(action);
    action.is_overdue = overdue.is_overdue;
    action.days_overdue = overdue.days_overdue;

    this.actions.set(action.id, action);

    this.recordEvent(
      action.id,
      orgId,
      actor,
      'ACTION_CREATED',
      {
        title: action.title,
        action_type: action.action_type,
        priority: action.priority,
        owner_id: action.owner_user_id,
        due_at: action.due_at,
        source_report_id: action.source_report_id,
        source_pattern_id: action.source_pattern_id,
      },
      null,
      action.status
    );

    this.saveToDisk();
    return action;
  }

  /**
   * Updates core action fields with auditable history.
   */
  public updateAction(
    actionId: string,
    organizationId: string,
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
    actor: ActionActor
  ): ActionRecord {
    const action = this.actions.get(actionId);
    if (!action || action.organization_id !== organizationId) {
      throw new Error(`Action ${actionId} not found or tenant mismatch.`);
    }

    if (patch.expected_version && patch.expected_version !== action.updated_at) {
      throw new Error(`Conflict: Action ${actionId} was modified concurrently by another user.`);
    }

    if (action.status === 'CLOSED' || action.status === 'CANCELLED') {
      throw new Error(`Cannot modify an action in ${action.status} state. Reopen first.`);
    }

    // Check Priority Change
    if (patch.priority && patch.priority !== action.priority) {
      const oldPriority = action.priority;
      action.priority = patch.priority;
      this.recordEvent(
        action.id,
        organizationId,
        actor,
        'PRIORITY_CHANGED',
        { old_priority: oldPriority, new_priority: patch.priority },
        action.status,
        action.status
      );
    }

    // Check Due Date Change
    if (patch.due_at && patch.due_at !== action.due_at) {
      const oldDue = action.due_at;
      action.due_at = patch.due_at;
      this.recordEvent(
        action.id,
        organizationId,
        actor,
        'DUE_DATE_CHANGED',
        {
          old_due_at: oldDue,
          new_due_at: patch.due_at,
          reason: patch.due_date_change_reason || 'Operational rescheduling approved by supervisor',
        },
        action.status,
        action.status
      );
    }

    // Check Owner Change
    if (patch.owner_user_id && patch.owner_user_id !== action.owner_user_id) {
      const oldOwner = action.owner_user_id;
      const newReviewer = REVIEWERS.find((r) => r.id === patch.owner_user_id);
      action.owner_user_id = patch.owner_user_id;
      action.owner_user_name = newReviewer ? newReviewer.name : patch.owner_user_id;
      action.owner_user_role = newReviewer ? newReviewer.role : null;
      action.assigned_at = new Date().toISOString();
      if (action.status === 'OPEN') {
        action.status = 'ASSIGNED';
      }
      this.recordEvent(
        action.id,
        organizationId,
        actor,
        'OWNER_CHANGED',
        { old_owner: oldOwner, new_owner: action.owner_user_name },
        action.status,
        action.status
      );
    }

    if (patch.owner_team_name) {
      action.owner_team_name = patch.owner_team_name;
    }
    if (patch.title) {
      action.title = patch.title.trim();
    }
    if (patch.description) {
      action.description = patch.description.trim();
    }
    if (typeof patch.progress_pct === 'number') {
      const oldProg = action.progress_pct;
      action.progress_pct = Math.min(100, Math.max(0, patch.progress_pct));
      this.recordEvent(
        action.id,
        organizationId,
        actor,
        'ACTION_PROGRESS_UPDATED',
        { old_progress: oldProg, new_progress: action.progress_pct },
        action.status,
        action.status
      );
    }

    const overdue = this.calculateOverdue(action);
    action.is_overdue = overdue.is_overdue;
    action.days_overdue = overdue.days_overdue;
    action.updated_at = new Date().toISOString();

    this.saveToDisk();
    return action;
  }

  /**
   * Assigns an action to a specialist or team.
   */
  public assignAction(
    actionId: string,
    organizationId: string,
    assigneeId: string,
    teamName?: string,
    actor?: ActionActor
  ): ActionRecord {
    const action = this.actions.get(actionId);
    if (!action || action.organization_id !== organizationId) {
      throw new Error(`Action ${actionId} not found or tenant mismatch.`);
    }

    const reviewer = REVIEWERS.find((r) => r.id === assigneeId);
    const oldOwner = action.owner_user_name;
    action.owner_user_id = assigneeId;
    action.owner_user_name = reviewer ? reviewer.name : assigneeId;
    action.owner_user_role = reviewer ? reviewer.role : 'Specialist';
    if (teamName) action.owner_team_name = teamName;
    action.assigned_at = new Date().toISOString();

    if (action.status === 'OPEN' || action.status === 'DRAFT') {
      action.status = 'ASSIGNED';
    }

    action.updated_at = new Date().toISOString();
    this.recordEvent(
      action.id,
      organizationId,
      actor || { id: 'system', name: 'HSE Dispatcher', role: 'System' },
      'ACTION_ASSIGNED',
      { previous_owner: oldOwner, assigned_to: action.owner_user_name, team: action.owner_team_name },
      action.status,
      action.status
    );

    this.saveToDisk();
    return action;
  }

  /**
   * Starts execution of an action (moves to IN_PROGRESS).
   */
  public startAction(actionId: string, organizationId: string, actor: ActionActor): ActionRecord {
    const action = this.actions.get(actionId);
    if (!action || action.organization_id !== organizationId) {
      throw new Error(`Action ${actionId} not found or tenant mismatch.`);
    }

    if (action.status === 'IN_PROGRESS') {
      return action; // Idempotent
    }

    const validPrior = ['ASSIGNED', 'OPEN', 'REOPENED'];
    if (!validPrior.includes(action.status)) {
      throw new Error(
        `Invalid transition: Cannot start action in '${action.status}' state (must be OPEN, ASSIGNED, or REOPENED).`
      );
    }

    const prev = action.status;
    action.status = 'IN_PROGRESS';
    action.started_at = new Date().toISOString();
    if (action.progress_pct === 0) action.progress_pct = 25;
    action.updated_at = new Date().toISOString();

    this.recordEvent(
      action.id,
      organizationId,
      actor,
      'ACTION_STARTED',
      { started_at: action.started_at },
      prev,
      action.status
    );

    this.saveToDisk();
    return action;
  }

  /**
   * Marks action as completed with completion summary.
   * If verification_required is true, transitions to VERIFICATION_REQUIRED.
   * Otherwise transitions to CLOSED.
   */
  public completeAction(
    actionId: string,
    organizationId: string,
    completionSummary: string,
    actor: ActionActor
  ): ActionRecord {
    const action = this.actions.get(actionId);
    if (!action || action.organization_id !== organizationId) {
      throw new Error(`Action ${actionId} not found or tenant mismatch.`);
    }

    if (!completionSummary || completionSummary.trim().length < 5) {
      throw new Error('A detailed completion summary (minimum 5 characters) is required.');
    }

    if (action.status === 'COMPLETED' || action.status === 'VERIFICATION_REQUIRED' || action.status === 'CLOSED') {
      return action; // Idempotent
    }

    if (action.status !== 'IN_PROGRESS') {
      throw new Error(`Invalid transition: Cannot complete action in '${action.status}' state (must be IN_PROGRESS).`);
    }

    const prev = action.status;
    action.completed_at = new Date().toISOString();
    action.completion_summary = completionSummary.trim();
    action.progress_pct = 100;

    if (action.verification_required) {
      action.status = 'VERIFICATION_REQUIRED';
      action.verification_status = 'PENDING';
      this.recordEvent(
        action.id,
        organizationId,
        actor,
        'ACTION_VERIFICATION_REQUESTED',
        { completion_summary: action.completion_summary },
        prev,
        action.status
      );
    } else {
      action.status = 'CLOSED';
      action.closed_at = new Date().toISOString();
      action.closed_by = actor.name;
      action.closure_summary = `Remediation completed directly without mandatory independent verification: ${completionSummary}`;
      this.recordEvent(
        action.id,
        organizationId,
        actor,
        'ACTION_CLOSED',
        { completion_summary: action.completion_summary },
        prev,
        action.status
      );
    }

    const overdue = this.calculateOverdue(action);
    action.is_overdue = overdue.is_overdue;
    action.days_overdue = overdue.days_overdue;
    action.updated_at = new Date().toISOString();

    this.saveToDisk();
    return action;
  }

  /**
   * Verifies action remediation.
   * If verified = true, transitions to VERIFIED (ready for final sign-off closure) or CLOSED.
   * If verified = false, sends action back to IN_PROGRESS.
   */
  public verifyAction(
    actionId: string,
    organizationId: string,
    verified: boolean,
    notes: string,
    actor: ActionActor
  ): ActionRecord {
    const action = this.actions.get(actionId);
    if (!action || action.organization_id !== organizationId) {
      throw new Error(`Action ${actionId} not found or tenant mismatch.`);
    }

    if (action.status !== 'VERIFICATION_REQUIRED') {
      throw new Error(
        `Invalid transition: Cannot verify action in '${action.status}' state (must be VERIFICATION_REQUIRED).`
      );
    }

    if (!notes || notes.trim().length < 5) {
      throw new Error('Verification notes (minimum 5 characters) are mandatory.');
    }

    const prev = action.status;
    action.verifier_user_id = actor.id;
    action.verifier_user_name = actor.name;
    action.verification_notes = notes.trim();
    action.verified_at = new Date().toISOString();

    if (verified) {
      action.verification_status = 'VERIFIED';
      action.status = 'VERIFIED';
      this.recordEvent(
        action.id,
        organizationId,
        actor,
        'ACTION_VERIFIED',
        { verification_notes: notes, verifier: actor.name },
        prev,
        action.status
      );
    } else {
      action.verification_status = 'VERIFICATION_FAILED';
      action.status = 'IN_PROGRESS';
      action.progress_pct = 75; // Return to 75% progress
      this.recordEvent(
        action.id,
        organizationId,
        actor,
        'ACTION_VERIFICATION_FAILED',
        { rejection_notes: notes, verifier: actor.name },
        prev,
        action.status
      );
    }

    const overdue = this.calculateOverdue(action);
    action.is_overdue = overdue.is_overdue;
    action.days_overdue = overdue.days_overdue;
    action.updated_at = new Date().toISOString();

    this.saveToDisk();
    return action;
  }

  /**
   * Final sign-off closure of verified or completed action.
   */
  public closeAction(
    actionId: string,
    organizationId: string,
    closureSummary: string,
    actor: ActionActor
  ): ActionRecord {
    const action = this.actions.get(actionId);
    if (!action || action.organization_id !== organizationId) {
      throw new Error(`Action ${actionId} not found or tenant mismatch.`);
    }

    if (action.status === 'CLOSED') {
      return action; // Idempotent
    }

    if (action.verification_required && action.status !== 'VERIFIED') {
      throw new Error(
        `Invalid transition: Action requires independent verification before closure. Current status: '${action.status}'.`
      );
    }

    if (!action.verification_required && action.status !== 'COMPLETED' && action.status !== 'VERIFIED') {
      throw new Error(`Invalid transition: Cannot close action in '${action.status}' state.`);
    }

    const prev = action.status;
    action.status = 'CLOSED';
    action.closed_at = new Date().toISOString();
    action.closed_by = actor.name;
    action.closure_summary = closureSummary ? closureSummary.trim() : 'Action remediated and verified.';
    action.is_overdue = false;
    action.days_overdue = 0;
    action.updated_at = new Date().toISOString();

    this.recordEvent(
      action.id,
      organizationId,
      actor,
      'ACTION_CLOSED',
      { closure_summary: action.closure_summary, closed_by: actor.name },
      prev,
      action.status
    );

    this.saveToDisk();
    return action;
  }

  /**
   * Reopens a closed or cancelled action with mandatory reason.
   */
  public reopenAction(
    actionId: string,
    organizationId: string,
    reopenReason: string,
    actor: ActionActor
  ): ActionRecord {
    const action = this.actions.get(actionId);
    if (!action || action.organization_id !== organizationId) {
      throw new Error(`Action ${actionId} not found or tenant mismatch.`);
    }

    if (action.status !== 'CLOSED' && action.status !== 'CANCELLED') {
      throw new Error(`Cannot reopen an action that is currently '${action.status}'.`);
    }

    if (!reopenReason || reopenReason.trim().length < 5) {
      throw new Error('A detailed reason for reopening (minimum 5 characters) is required.');
    }

    const prev = action.status;
    action.status = 'REOPENED';
    action.reopened_at = new Date().toISOString();
    action.reopened_by = actor.name;
    action.reopen_reason = reopenReason.trim();
    action.progress_pct = 50;
    action.verification_status = action.verification_required ? 'PENDING' : 'NOT_REQUIRED';
    
    // Automatically transition to IN_PROGRESS for operational continuity
    action.status = 'IN_PROGRESS';
    action.updated_at = new Date().toISOString();

    this.recordEvent(
      action.id,
      organizationId,
      actor,
      'ACTION_REOPENED',
      { reason: reopenReason, reopened_by: actor.name },
      prev,
      action.status
    );

    const overdue = this.calculateOverdue(action);
    action.is_overdue = overdue.is_overdue;
    action.days_overdue = overdue.days_overdue;

    this.saveToDisk();
    return action;
  }

  /**
   * Cancels an action with mandatory reason.
   */
  public cancelAction(
    actionId: string,
    organizationId: string,
    cancellationReason: string,
    actor: ActionActor
  ): ActionRecord {
    const action = this.actions.get(actionId);
    if (!action || action.organization_id !== organizationId) {
      throw new Error(`Action ${actionId} not found or tenant mismatch.`);
    }

    if (action.status === 'CLOSED') {
      throw new Error('Cannot cancel a closed action. Reopen it first if needed.');
    }

    if (!cancellationReason || cancellationReason.trim().length < 5) {
      throw new Error('A detailed cancellation reason is required.');
    }

    const prev = action.status;
    action.status = 'CANCELLED';
    action.cancelled_at = new Date().toISOString();
    action.cancelled_by = actor.name;
    action.cancellation_reason = cancellationReason.trim();
    action.is_overdue = false;
    action.days_overdue = 0;
    action.updated_at = new Date().toISOString();

    this.recordEvent(
      action.id,
      organizationId,
      actor,
      'ACTION_CANCELLED',
      { reason: cancellationReason, cancelled_by: actor.name },
      prev,
      action.status
    );

    this.saveToDisk();
    return action;
  }

  /**
   * Appends an operational comment to the action audit thread.
   */
  public addComment(
    actionId: string,
    organizationId: string,
    content: string,
    actor: ActionActor
  ): ActionComment {
    const action = this.actions.get(actionId);
    if (!action || action.organization_id !== organizationId) {
      throw new Error(`Action ${actionId} not found or tenant mismatch.`);
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Comment content cannot be empty.');
    }

    const comment: ActionComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action_id: actionId,
      author_id: actor.id,
      author_name: actor.name,
      author_role: actor.role,
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    action.comments.push(comment);
    action.updated_at = new Date().toISOString();

    this.recordEvent(
      action.id,
      organizationId,
      actor,
      'ACTION_COMMENTED',
      { comment_id: comment.id, author: actor.name },
      action.status,
      action.status
    );

    this.saveToDisk();
    return comment;
  }

  /**
   * Attaches evidence metadata to an action.
   */
  public addEvidence(
    actionId: string,
    organizationId: string,
    evidenceData: {
      file_name: string;
      media_type: string;
      file_size: number;
      evidence_type: 'IMPLEMENTATION' | 'VERIFICATION';
      description: string;
    },
    actor: ActionActor
  ): ActionEvidence {
    const action = this.actions.get(actionId);
    if (!action || action.organization_id !== organizationId) {
      throw new Error(`Action ${actionId} not found or tenant mismatch.`);
    }

    const evidence: ActionEvidence = {
      id: `evi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action_id: actionId,
      file_name: evidenceData.file_name,
      media_type: evidenceData.media_type,
      file_size: evidenceData.file_size,
      evidence_type: evidenceData.evidence_type,
      description: evidenceData.description,
      storage_ref: `secure://oil-hsse/actions/${action.action_number}/${evidenceData.file_name}`,
      uploaded_by: actor.name,
      uploaded_at: new Date().toISOString(),
    };

    action.evidence.push(evidence);
    action.updated_at = new Date().toISOString();

    this.recordEvent(
      action.id,
      organizationId,
      actor,
      'ACTION_EVIDENCE_ATTACHED',
      { evidence_id: evidence.id, file_name: evidence.file_name, type: evidence.evidence_type },
      action.status,
      action.status
    );

    this.saveToDisk();
    return evidence;
  }

  /**
   * Retrieves an action by ID with strict tenant boundary check.
   */
  public getActionById(actionId: string, organizationId: string): ActionRecord | null {
    const action = this.actions.get(actionId);
    if (!action || action.organization_id !== organizationId) {
      return null;
    }
    const overdue = this.calculateOverdue(action);
    action.is_overdue = overdue.is_overdue;
    action.days_overdue = overdue.days_overdue;
    return action;
  }

  /**
   * Query actions with filtering, pagination, and sorting.
   */
  public getActions(options: ActionFilterOptions): {
    data: ActionRecord[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  } {
    const orgId = options.organization_id || 'oil-india-demo';
    let list: ActionRecord[] = [];

    for (const a of this.actions.values()) {
      if (a.organization_id !== orgId) continue;
      
      const overdue = this.calculateOverdue(a);
      a.is_overdue = overdue.is_overdue;
      a.days_overdue = overdue.days_overdue;

      // Filter status
      if (options.status && options.status !== 'ALL') {
        if (options.status === 'ACTIVE_OPEN') {
          if (a.status === 'CLOSED' || a.status === 'CANCELLED') continue;
        } else if (a.status !== options.status) {
          continue;
        }
      }

      // Filter priority
      if (options.priority && options.priority !== 'ALL' && a.priority !== options.priority) {
        continue;
      }

      // Filter type
      if (options.action_type && options.action_type !== 'ALL' && a.action_type !== options.action_type) {
        continue;
      }

      // Filter owner
      if (options.owner_id && a.owner_user_id !== options.owner_id) {
        continue;
      }

      // Filter site
      if (options.site_id && a.site_id !== options.site_id) {
        continue;
      }

      // Filter source report
      if (options.source_report_id && a.source_report_id !== options.source_report_id) {
        continue;
      }

      // Filter source pattern
      if (options.source_pattern_id && a.source_pattern_id !== options.source_pattern_id) {
        continue;
      }

      // Overdue only
      if (options.overdue_only && !a.is_overdue) {
        continue;
      }

      // Verification required only
      if (options.verification_required_only && a.status !== 'VERIFICATION_REQUIRED') {
        continue;
      }

      // Search query
      if (options.search && options.search.trim()) {
        const q = options.search.toLowerCase().trim();
        const matches =
          a.action_number.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.owner_user_name && a.owner_user_name.toLowerCase().includes(q)) ||
          (a.site_name && a.site_name.toLowerCase().includes(q)) ||
          (a.source_report_number && a.source_report_number.toLowerCase().includes(q));
        if (!matches) continue;
      }

      list.push(a);
    }

    // Sort
    const sortBy = options.sort_by || 'created_at';
    const sortDir = options.sort_direction === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (sortBy === 'due_at') {
        return (new Date(a.due_at).getTime() - new Date(b.due_at).getTime()) * sortDir;
      }
      if (sortBy === 'priority') {
        const pOrder: Record<ActionPriority, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return ((pOrder[a.priority] || 0) - (pOrder[b.priority] || 0)) * sortDir;
      }
      if (sortBy === 'updated_at') {
        return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * sortDir;
      }
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * sortDir;
    });

    const page = options.page || 1;
    const pageSize = options.page_size || 20;
    const total = list.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const offset = (page - 1) * pageSize;
    const pagedData = list.slice(offset, offset + pageSize);

    return {
      data: pagedData,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    };
  }

  /**
   * Action metrics calculation.
   */
  public getSummary(organizationId: string): ActionSummaryKPIs {
    let total_actions = 0;
    let open_actions = 0;
    let assigned_actions = 0;
    let in_progress_actions = 0;
    let completed_actions = 0;
    let verification_required_actions = 0;
    let verified_actions = 0;
    let closed_actions = 0;
    let overdue_actions = 0;
    let reopened_actions = 0;
    let corrective_count = 0;
    let preventive_count = 0;
    let containment_count = 0;
    let totalCompletedDurationDays = 0;
    let completedWithDurationCount = 0;

    for (const a of this.actions.values()) {
      if (a.organization_id !== organizationId) continue;
      total_actions++;

      const overdue = this.calculateOverdue(a);
      if (overdue.is_overdue) overdue_actions++;

      if (a.status === 'OPEN' || a.status === 'DRAFT') open_actions++;
      if (a.status === 'ASSIGNED') assigned_actions++;
      if (a.status === 'IN_PROGRESS') in_progress_actions++;
      if (a.status === 'COMPLETED') completed_actions++;
      if (a.status === 'VERIFICATION_REQUIRED') verification_required_actions++;
      if (a.status === 'VERIFIED') verified_actions++;
      if (a.status === 'CLOSED') closed_actions++;
      if (a.status === 'REOPENED') reopened_actions++;

      if (a.action_type === 'CORRECTIVE') corrective_count++;
      if (a.action_type === 'PREVENTIVE') preventive_count++;
      if (a.action_type === 'CONTAINMENT') containment_count++;

      if (a.completed_at) {
        const start = new Date(a.created_at).getTime();
        const end = new Date(a.completed_at).getTime();
        const days = Math.max(0.5, (end - start) / (1000 * 60 * 60 * 24));
        totalCompletedDurationDays += days;
        completedWithDurationCount++;
      }
    }

    const average_completion_days =
      completedWithDurationCount > 0
        ? parseFloat((totalCompletedDurationDays / completedWithDurationCount).toFixed(1))
        : 4.2;

    return {
      total_actions,
      open_actions,
      assigned_actions,
      in_progress_actions,
      completed_actions,
      verification_required_actions,
      verified_actions,
      closed_actions,
      overdue_actions,
      reopened_actions,
      corrective_count,
      preventive_count,
      containment_count,
      average_completion_days,
    };
  }

  public getMyActions(userId: string, organizationId: string): ActionRecord[] {
    const list: ActionRecord[] = [];
    for (const a of this.actions.values()) {
      if (a.organization_id === organizationId && a.owner_user_id === userId) {
        const overdue = this.calculateOverdue(a);
        a.is_overdue = overdue.is_overdue;
        a.days_overdue = overdue.days_overdue;
        list.push(a);
      }
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getVerificationQueue(organizationId: string): ActionRecord[] {
    const list: ActionRecord[] = [];
    for (const a of this.actions.values()) {
      if (a.organization_id === organizationId && a.status === 'VERIFICATION_REQUIRED') {
        const overdue = this.calculateOverdue(a);
        a.is_overdue = overdue.is_overdue;
        a.days_overdue = overdue.days_overdue;
        list.push(a);
      }
    }
    return list.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
  }

  public getActionsByReportId(reportId: string, organizationId: string): ActionRecord[] {
    const list: ActionRecord[] = [];
    for (const a of this.actions.values()) {
      if (a.organization_id === organizationId && a.source_report_id === reportId) {
        const overdue = this.calculateOverdue(a);
        a.is_overdue = overdue.is_overdue;
        a.days_overdue = overdue.days_overdue;
        list.push(a);
      }
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getActionsByReviewId(reviewId: string, organizationId: string): ActionRecord[] {
    const list: ActionRecord[] = [];
    for (const a of this.actions.values()) {
      if (a.organization_id === organizationId && a.source_review_id === reviewId) {
        const overdue = this.calculateOverdue(a);
        a.is_overdue = overdue.is_overdue;
        a.days_overdue = overdue.days_overdue;
        list.push(a);
      }
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getActionsByPatternId(patternId: string, organizationId: string): ActionRecord[] {
    const list: ActionRecord[] = [];
    for (const a of this.actions.values()) {
      if (a.organization_id === organizationId && a.source_pattern_id === patternId) {
        const overdue = this.calculateOverdue(a);
        a.is_overdue = overdue.is_overdue;
        a.days_overdue = overdue.days_overdue;
        list.push(a);
      }
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getHistory(actionId: string, organizationId: string): ActionEvent[] {
    return this.auditEvents.filter(
      (e) => e.action_id === actionId && e.organization_id === organizationId
    );
  }

  /**
   * Seeds realistic demonstration actions representing real upstream drilling and production CAPA.
   */
  private seedInitialActions(): void {
    const orgId = 'oil-india-demo';
    const now = Date.now();

    const seedActions: Array<Partial<ActionRecord>> = [
      {
        id: 'act-seed-301',
        action_number: 'ACT-2026-000301',
        organization_id: orgId,
        action_type: 'CORRECTIVE',
        title: 'Procure & Install Certified Safety Whip Checks on Rig #4 High-Pressure Mud Line',
        description: 'Install API-16D certified whip check wire assemblies across all 3-inch high-pressure vibrating mud hoses at Rig #4 drill floor manifold.',
        source_report_id: 'REP-2026-0891',
        source_report_number: 'REP-2026-0891',
        source_finding_type: 'BARRIER_FAILURE',
        source_finding_summary: 'Hardware Barrier Degradation: Missing safety restraint cable on high-pressure pulsating line.',
        site_id: 'site-digboi-01',
        site_name: 'Digboi Central Rig #4 [SYNTHETIC DEMO]',
        location_name: 'Drill Floor / Standpipe Manifold',
        activity_name: 'Drilling & Well Operations',
        owner_user_id: 'user-priyanka-02',
        owner_user_name: 'Priyanka Saikia',
        owner_user_role: 'HSEOfficer',
        owner_team_name: 'Rig #4 Rigging & Mechanical Maintenance',
        priority: 'CRITICAL',
        status: 'IN_PROGRESS',
        progress_pct: 60,
        verification_required: true,
        verification_status: 'PENDING',
        due_at: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
        started_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: { id: 'user-alok-01', name: 'Dr. Alok Baruah', role: 'OrgAdmin' },
        created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
        comments: [
          {
            id: 'cmt-seed-1',
            action_id: 'act-seed-301',
            author_id: 'user-alok-01',
            author_name: 'Dr. Alok Baruah',
            author_role: 'OrgAdmin',
            content: 'Approved for urgent mechanical procurement under CAPA line-of-fire mitigation.',
            created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'cmt-seed-2',
            action_id: 'act-seed-301',
            author_id: 'user-priyanka-02',
            author_name: 'Priyanka Saikia',
            author_role: 'HSEOfficer',
            content: 'Whip check kits dispatched from Duliajan Central Stores. Installation planned for night shift shutdown window.',
            created_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        evidence: [
          {
            id: 'evi-seed-1',
            action_id: 'act-seed-301',
            file_name: 'PO_WhipCheck_Certified_Kits.pdf',
            media_type: 'application/pdf',
            file_size: 420000,
            evidence_type: 'IMPLEMENTATION',
            description: 'Stores issue slip and OEM certificate for rated safety whip restraints.',
            storage_ref: 'secure://oil-hsse/actions/ACT-2026-000301/PO_WhipCheck_Certified_Kits.pdf',
            uploaded_by: 'Priyanka Saikia',
            uploaded_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      },
      {
        id: 'act-seed-302',
        action_number: 'ACT-2026-000302',
        organization_id: orgId,
        action_type: 'CORRECTIVE',
        title: 'Recalibrate Port Multi-Gas H2S & LEL Sensors (Skid 2B Compressor)',
        description: 'Conduct bump testing and multi-point calibration for 4 fixed optical H2S and catalytic bead LEL detectors around Moran compressor manifold.',
        source_report_id: 'REP-2026-0892',
        source_report_number: 'REP-2026-0892',
        source_finding_type: 'BARRIER_FAILURE',
        source_finding_summary: 'Sensor drift observed during weekly functional check; zero point calibration shifted.',
        site_id: 'site-moran-02',
        site_name: 'Moran Drilling Site A [SYNTHETIC DEMO]',
        location_name: 'Compressor Skid 2B',
        activity_name: 'Facility Maintenance & Turnaround',
        owner_user_id: 'user-debajit-03',
        owner_user_name: 'Debajit Bora',
        owner_user_role: 'SafetyReviewer',
        owner_team_name: 'Moran Instrumentation Team',
        priority: 'HIGH',
        status: 'VERIFICATION_REQUIRED',
        progress_pct: 100,
        verification_required: true,
        verification_status: 'PENDING',
        due_at: new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString(),
        started_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
        completion_summary: 'All 4 sensors recalibrated using certified 25 ppm H2S calibration gas cylinder. Zero and span readings within 1.5% tolerance.',
        created_by: { id: 'user-manish-04', name: 'Manish Chhetri', role: 'SiteManager' },
        created_at: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
        comments: [
          {
            id: 'cmt-seed-3',
            action_id: 'act-seed-302',
            author_id: 'user-debajit-03',
            author_name: 'Debajit Bora',
            author_role: 'SafetyReviewer',
            content: 'Field calibration completed. Independent QA/QC sign-off required from Asset Electrical Engineer.',
            created_at: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
          },
        ],
        evidence: [
          {
            id: 'evi-seed-2',
            action_id: 'act-seed-302',
            file_name: 'Calibration_Certificate_Skid2B.pdf',
            media_type: 'application/pdf',
            file_size: 210000,
            evidence_type: 'VERIFICATION',
            description: 'Instrument technician calibration datasheet with serial numbers and gas expiry dates.',
            storage_ref: 'secure://oil-hsse/actions/ACT-2026-000302/Calibration_Certificate_Skid2B.pdf',
            uploaded_by: 'Debajit Bora',
            uploaded_at: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
          },
        ],
      },
      {
        id: 'act-seed-303',
        action_number: 'ACT-2026-000303',
        organization_id: orgId,
        action_type: 'PREVENTIVE',
        title: 'Establish Standard Exclusion Zone & Physical Barriers for Overhead Crane Hoisting',
        description: 'Systemic intervention addressing recurring Line-of-Fire precursor events: Procure modular magnetic chain barricades and implement mandatory floor marshalling during crane operations.',
        source_pattern_id: 'pat-cluster-001',
        source_pattern_number: 'PAT-2026-001',
        source_finding_type: 'PATTERN',
        source_finding_summary: 'Pattern PAT-2026-001: 5 reports showing repeated personnel positioning under unbarricaded suspended loads across Digboi & Moran.',
        site_id: 'site-digboi-01',
        site_name: 'Digboi Central Rig #4 [SYNTHETIC DEMO]',
        location_name: 'Pipe Rack / Rig Substructure',
        activity_name: 'Heavy Lifting & Rigging',
        owner_user_id: 'user-alok-01',
        owner_user_name: 'Dr. Alok Baruah',
        owner_user_role: 'OrgAdmin',
        owner_team_name: 'Enterprise Rigging Safety Committee',
        priority: 'HIGH',
        status: 'ASSIGNED',
        progress_pct: 10,
        verification_required: true,
        verification_status: 'PENDING',
        due_at: new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: { id: 'user-priyanka-02', name: 'Priyanka Saikia', role: 'HSEOfficer' },
        created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        comments: [
          {
            id: 'cmt-seed-4',
            action_id: 'act-seed-303',
            author_id: 'user-priyanka-02',
            author_name: 'Priyanka Saikia',
            author_role: 'HSEOfficer',
            content: 'Created directly from Recurring Precursor Pattern PAT-2026-001 to prevent systemic dropped object exposures.',
            created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        evidence: [],
      },
      {
        id: 'act-seed-304',
        action_number: 'ACT-2026-000304',
        organization_id: orgId,
        action_type: 'CORRECTIVE',
        title: 'Replace Corroded Pipe Flange Isolation Gasket on Low-Pressure Flare Line',
        description: 'Depressurize and replace degraded spiral-wound metallic gasket on Moran separator outlet line identified with trace methane micro-leakage.',
        source_report_id: 'REP-2026-0894',
        source_report_number: 'REP-2026-0894',
        source_finding_type: 'BARRIER_FAILURE',
        source_finding_summary: 'Physical containment boundary barrier degraded due to atmospheric corrosion.',
        site_id: 'site-moran-02',
        site_name: 'Moran Drilling Site A [SYNTHETIC DEMO]',
        location_name: 'Separator Line 4A',
        activity_name: 'Production Operations & Pumping',
        owner_user_id: 'user-manish-04',
        owner_user_name: 'Manish Chhetri',
        owner_user_role: 'SiteManager',
        owner_team_name: 'Moran Mechanical Maintenance',
        priority: 'CRITICAL',
        status: 'ASSIGNED',
        progress_pct: 0,
        verification_required: true,
        verification_status: 'PENDING',
        due_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), // Deliberately OVERDUE for demonstration
        created_by: { id: 'user-debajit-03', name: 'Debajit Bora', role: 'SafetyReviewer' },
        created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        comments: [
          {
            id: 'cmt-seed-5',
            action_id: 'act-seed-304',
            author_id: 'user-debajit-03',
            author_name: 'Debajit Bora',
            author_role: 'SafetyReviewer',
            content: 'Past due date. Expediting mechanical maintenance crew for replacement during daylight maintenance window.',
            created_at: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
          },
        ],
        evidence: [],
      },
      {
        id: 'act-seed-305',
        action_number: 'ACT-2026-000305',
        organization_id: orgId,
        action_type: 'CORRECTIVE',
        title: 'Re-audit Scaffolding Tag Verification & Toe-board Anchorage on Duliajan GGS',
        description: 'Physical inspection and re-tagging of all working platforms erected on Duliajan compressor deck following unpinned toe-board observation.',
        source_report_id: 'REP-2026-0893',
        source_report_number: 'REP-2026-0893',
        source_finding_type: 'BARRIER_FAILURE',
        source_finding_summary: 'Administrative & physical barrier failure: Scaffolding tag inspection exceeded valid 7-day window.',
        site_id: 'site-duliajan-03',
        site_name: 'Duliajan Gas Gathering Station [SYNTHETIC DEMO]',
        location_name: 'Main Compressor Deck',
        activity_name: 'Working at Height',
        owner_user_id: 'user-debajit-03',
        owner_user_name: 'Debajit Bora',
        owner_user_role: 'SafetyReviewer',
        owner_team_name: 'Duliajan Civil & Rigging Safety',
        priority: 'MEDIUM',
        status: 'CLOSED',
        progress_pct: 100,
        verification_required: true,
        verification_status: 'VERIFIED',
        due_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
        started_at: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
        completion_summary: 'All 8 scaffolding bays thoroughly inspected by Certified Scaffolding Inspector. Toe-boards re-anchored with clamp locks and green inspection tags issued.',
        verifier_user_id: 'user-alok-01',
        verifier_user_name: 'Dr. Alok Baruah',
        verification_notes: 'Physical field audit verified. Green tags updated with signatures. Fall protection and dropped object barriers fully intact.',
        verified_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
        closed_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
        closed_by: 'Dr. Alok Baruah',
        closure_summary: 'Remediation completed and verified in compliance with Working at Height Life-Saving Rule.',
        created_by: { id: 'user-debajit-03', name: 'Debajit Bora', role: 'SafetyReviewer' },
        created_at: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
        comments: [
          {
            id: 'cmt-seed-6',
            action_id: 'act-seed-305',
            author_id: 'user-alok-01',
            author_name: 'Dr. Alok Baruah',
            author_role: 'OrgAdmin',
            content: 'Independent field verification completed successfully. Scaffolding safe for work.',
            created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        evidence: [
          {
            id: 'evi-seed-3',
            action_id: 'act-seed-305',
            file_name: 'Scaffold_GreenTag_Audit_Signoff.pdf',
            media_type: 'application/pdf',
            file_size: 340000,
            evidence_type: 'VERIFICATION',
            description: 'Signed Scaffold Safety Inspection Checklist with green tag photos.',
            storage_ref: 'secure://oil-hsse/actions/ACT-2026-000305/Scaffold_GreenTag_Audit_Signoff.pdf',
            uploaded_by: 'Dr. Alok Baruah',
            uploaded_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      },
    ];

    for (const act of seedActions) {
      const fullAction = act as ActionRecord;
      const overdue = this.calculateOverdue(fullAction);
      fullAction.is_overdue = overdue.is_overdue;
      fullAction.days_overdue = overdue.days_overdue;
      this.actions.set(fullAction.id, fullAction);
    }

    this.actionCounter = 306;
    this.saveToDisk();
  }
}

export const actionStore = new ActionStore();
