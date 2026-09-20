import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  User,
  Info,
  Layers,
  History,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { Alert, AlertAuditRecord } from '../../types/alert.ts';
import { alertService } from '../../services/alertService.ts';
import { AlertSeverityBadge } from './AlertSeverityBadge.tsx';
import { AlertStatusBadge } from './AlertStatusBadge.tsx';
import { Button } from '../ui/Button.tsx';
import { Textarea } from '../ui/Textarea.tsx';

interface AlertDetailModalProps {
  alertId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAlertUpdated: (updated: Alert) => void;
  onNavigateToSource?: (path: string) => void;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alertId,
  isOpen,
  onClose,
  onAlertUpdated,
  onNavigateToSource,
}) => {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [auditHistory, setAuditHistory] = useState<AlertAuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action Dialog States
  const [activeAction, setActiveAction] = useState<'ACKNOWLEDGE' | 'DISMISS' | 'RESOLVE' | 'ESCALATE' | null>(null);
  const [actionInput, setActionInput] = useState('');
  const [escalateTargetRole, setEscalateTargetRole] = useState('HSEOfficer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !alertId) {
      setAlert(null);
      setAuditHistory([]);
      setActiveAction(null);
      setActionInput('');
      return;
    }

    setLoading(true);
    setError(null);

    alertService
      .getAlert(alertId)
      .then((data) => {
        setAlert(data.alert);
        setAuditHistory(data.audit_history || []);
        // Automatically mark unread alerts as read
        if (data.alert.status === 'UNREAD') {
          alertService.markAsRead(alertId).then((readAlert) => {
            setAlert(readAlert);
            onAlertUpdated(readAlert);
          });
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load alert details');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, alertId]);

  if (!isOpen || !alertId) return null;

  const handleAcknowledge = async () => {
    if (!alert) return;
    setIsSubmitting(true);
    try {
      const updated = await alertService.acknowledgeAlert(alert.id, actionInput.trim() || undefined);
      setAlert(updated);
      onAlertUpdated(updated);
      setActiveAction(null);
      setActionInput('');
      // Reload audit history
      const fresh = await alertService.getAlert(alert.id);
      setAuditHistory(fresh.audit_history || []);
    } catch (err: any) {
      setError(err.message || 'Failed to acknowledge alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (!alert) return;
    if (!actionInput.trim()) {
      setError('A documented justification is required to dismiss this alert.');
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await alertService.dismissAlert(alert.id, actionInput.trim());
      setAlert(updated);
      onAlertUpdated(updated);
      setActiveAction(null);
      setActionInput('');
      const fresh = await alertService.getAlert(alert.id);
      setAuditHistory(fresh.audit_history || []);
    } catch (err: any) {
      setError(err.message || 'Failed to dismiss alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!alert) return;
    setIsSubmitting(true);
    try {
      const updated = await alertService.resolveAlert(alert.id, actionInput.trim() || 'Resolved following operational review.');
      setAlert(updated);
      onAlertUpdated(updated);
      setActiveAction(null);
      setActionInput('');
      const fresh = await alertService.getAlert(alert.id);
      setAuditHistory(fresh.audit_history || []);
    } catch (err: any) {
      setError(err.message || 'Failed to resolve alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalate = async () => {
    if (!alert) return;
    setIsSubmitting(true);
    try {
      const updated = await alertService.escalateAlert(
        alert.id,
        actionInput.trim() || 'Manual user escalation to higher supervisory tier.',
        escalateTargetRole
      );
      setAlert(updated);
      onAlertUpdated(updated);
      setActiveAction(null);
      setActionInput('');
      const fresh = await alertService.getAlert(alert.id);
      setAuditHistory(fresh.audit_history || []);
    } catch (err: any) {
      setError(err.message || 'Failed to escalate alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSource = () => {
    if (!alert) return;
    if (onNavigateToSource) {
      onNavigateToSource(alert.source_url);
    } else {
      window.location.href = alert.source_url;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-card-enter">
        {/* Header */}
        <div className="p-5 border-b border-border bg-muted/20 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground">{alert?.id}</span>
              {alert && <AlertSeverityBadge severity={alert.severity} size="sm" />}
              {alert && <AlertStatusBadge status={alert.status} size="sm" />}
              <span className="text-[11px] text-muted-foreground">
                Category: <strong className="text-foreground">{alert?.category}</strong>
              </span>
            </div>
            <h2 className="text-base font-bold text-foreground leading-snug">
              {alert?.title}
            </h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Rule: {alert?.rule_name} (v{alert?.rule_version})</span>
              <span>•</span>
              <span>Triggered: {alert ? new Date(alert.created_at).toLocaleString() : ''}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs flex-1">
          {error && (
            <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-danger text-xs">
              {error}
            </div>
          )}

          {/* Phase 11 Domain Disclaimer Banner */}
          <div className="rounded-xl border border-border-subtle bg-muted/15 p-3.5 flex items-start gap-2.5 text-muted-foreground">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px] leading-relaxed">
              <span className="font-semibold text-foreground block">
                Workflow Notification — Decoupled Safety Intelligence
              </span>
              <p>
                Alerts are informational workflow signals designed to notify authorized personnel. SIF Classification ≠ Risk Priority ≠ Pattern Strength ≠ Alert Severity ≠ Safety Outcome. This alert does not alter underlying reports, risk metrics, or CAPA barrier ratings.
              </p>
            </div>
          </div>

          {/* Deterministic Evidence: Why this alert triggered */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" />
              <span>Why This Alert Triggered (Deterministic Rule Evidence)</span>
            </h3>
            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Rule Matched:</span>
                  <span className="font-medium text-foreground">{alert?.why_triggered?.rule_matched}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Event Received:</span>
                  <span className="font-mono text-primary font-semibold">{alert?.why_triggered?.event_received}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-border/50">
                <span className="text-muted-foreground block text-[11px]">Deterministic Proof:</span>
                <p className="text-xs text-foreground font-medium mt-0.5 leading-relaxed">
                  {alert?.why_triggered?.deterministic_evidence}
                </p>
              </div>
            </div>
          </div>

          {/* Source Object Context */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Source Object Context</span>
              </h3>
              {alert?.source_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenSource}
                  className="text-xs flex items-center gap-1"
                >
                  <span>Open {alert.source_type} ({alert.source_number})</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>

            <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-foreground text-xs">{alert?.source_number}</span>
                  <span className="text-muted-foreground ml-2">({alert?.source_type})</span>
                </div>
                {alert?.source_context?.site_name && (
                  <span className="text-xs font-medium text-primary">
                    {alert.source_context.site_name}
                  </span>
                )}
              </div>

              {alert?.source_context?.title && (
                <p className="text-xs text-foreground leading-relaxed">
                  {alert.source_context.title}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-[11px]">
                {alert?.source_context?.activity_name && (
                  <div>
                    <span className="text-muted-foreground block">Activity:</span>
                    <span className="font-medium text-foreground">{alert.source_context.activity_name}</span>
                  </div>
                )}
                {alert?.source_context?.risk_level && (
                  <div>
                    <span className="text-muted-foreground block">Risk Level:</span>
                    <span className="font-bold text-danger">{alert.source_context.risk_level}</span>
                  </div>
                )}
                {alert?.source_context?.overdue_days !== undefined && (
                  <div>
                    <span className="text-muted-foreground block">Overdue Duration:</span>
                    <span className="font-bold text-warning-dark dark:text-warning">{alert.source_context.overdue_days} days</span>
                  </div>
                )}
                {alert?.source_context?.pattern_support_count !== undefined && (
                  <div>
                    <span className="text-muted-foreground block">Pattern Precursors:</span>
                    <span className="font-bold text-primary">{alert.source_context.pattern_support_count} reports</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Resolution / Acknowledgement Details if applicable */}
          {alert?.acknowledged_at && (
            <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                  Acknowledged by {alert.acknowledged_by?.name} ({alert.acknowledged_by?.role})
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(alert.acknowledged_at).toLocaleString()}
                </span>
              </div>
              {alert.acknowledged_by?.note && (
                <p className="text-xs text-foreground mt-1 italic">"{alert.acknowledged_by.note}"</p>
              )}
            </div>
          )}

          {alert?.resolved_at && (
            <div className="p-3.5 rounded-xl border border-success/30 bg-success/10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-success-dark dark:text-success">
                  Resolved by {alert.resolved_by?.name} ({alert.resolved_by?.role})
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(alert.resolved_at).toLocaleString()}
                </span>
              </div>
              {alert.resolved_by?.resolution_note && (
                <p className="text-xs text-foreground mt-1">"{alert.resolved_by.resolution_note}"</p>
              )}
            </div>
          )}

          {alert?.dismissed_at && (
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">
                  Dismissed by {alert.dismissed_by?.name} ({alert.dismissed_by?.role})
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(alert.dismissed_at).toLocaleString()}
                </span>
              </div>
              {alert.dismissed_by?.reason && (
                <p className="text-xs text-foreground mt-1">Reason: {alert.dismissed_by.reason}</p>
              )}
            </div>
          )}

          {/* Escalation History */}
          {alert && alert.escalation_history && alert.escalation_history.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-warning" />
                <span>Escalation History (Level {alert.escalation_level})</span>
              </h3>
              <div className="space-y-2">
                {alert.escalation_history.map((esc, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border bg-muted/10 flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">Level {esc.level}</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        <span className="font-semibold text-primary">{esc.escalated_to_role}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{esc.reason}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(esc.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Input Form (if user clicked Acknowledge/Dismiss/Resolve/Escalate) */}
          {activeAction && (
            <div className="p-4 rounded-xl border border-primary/40 bg-primary/5 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {activeAction === 'ACKNOWLEDGE' && 'Acknowledge Alert'}
                  {activeAction === 'DISMISS' && 'Dismiss Alert (Justification Required)'}
                  {activeAction === 'RESOLVE' && 'Mark Alert Resolved'}
                  {activeAction === 'ESCALATE' && 'Escalate to Higher Authority'}
                </h4>
                <button
                  onClick={() => setActiveAction(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>

              {activeAction === 'ACKNOWLEDGE' && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Acknowledging records that you have reviewed this workflow signal. It does not close or modify the underlying source record.
                </p>
              )}

              {activeAction === 'ESCALATE' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Target Role:</label>
                  <select
                    value={escalateTargetRole}
                    onChange={(e) => setEscalateTargetRole(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-border bg-card text-foreground"
                  >
                    <option value="HSEOfficer">HSE Officer</option>
                    <option value="SiteManager">Site Manager / Superintendent</option>
                    <option value="OrgAdmin">Corporate Safety Director (OrgAdmin)</option>
                  </select>
                </div>
              )}

              <Textarea
                rows={2}
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                placeholder={
                  activeAction === 'ACKNOWLEDGE'
                    ? 'Optional acknowledgment notes...'
                    : activeAction === 'DISMISS'
                    ? 'Reason why this notification is dismissed without action...'
                    : activeAction === 'RESOLVE'
                    ? 'Summary of remediation or resolution completed...'
                    : 'Reason for workflow escalation...'
                }
                className="text-xs"
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveAction(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting || (activeAction === 'DISMISS' && !actionInput.trim())}
                  onClick={() => {
                    if (activeAction === 'ACKNOWLEDGE') handleAcknowledge();
                    if (activeAction === 'DISMISS') handleDismiss();
                    if (activeAction === 'RESOLVE') handleResolve();
                    if (activeAction === 'ESCALATE') handleEscalate();
                  }}
                >
                  {isSubmitting ? 'Recording...' : `Confirm ${activeAction}`}
                </Button>
              </div>
            </div>
          )}

          {/* Audit History Log */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-primary" />
              <span>Immutable Audit Trail</span>
            </h3>
            <div className="rounded-xl border border-border bg-muted/5 divide-y divide-border/40 overflow-hidden">
              {auditHistory.length === 0 ? (
                <div className="p-3 text-center text-muted-foreground text-xs">
                  No additional audit records yet.
                </div>
              ) : (
                auditHistory.map((rec) => (
                  <div key={rec.id} className="p-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-primary">{rec.event_name}</span>
                        <span className="text-muted-foreground">by {rec.actor.name} ({rec.actor.role})</span>
                      </div>
                      {rec.details && (
                        <p className="text-[11px] text-muted-foreground">
                          {JSON.stringify(rec.details)}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(rec.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {alert && alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED' && (
              <>
                {alert.status !== 'ACKNOWLEDGED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveAction('ACKNOWLEDGE');
                      setActionInput('');
                    }}
                  >
                    Acknowledge
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setActiveAction('RESOLVE');
                    setActionInput('');
                  }}
                >
                  Resolve Alert
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveAction('ESCALATE');
                    setActionInput('');
                  }}
                >
                  Escalate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveAction('DISMISS');
                    setActionInput('');
                  }}
                  className="text-muted-foreground hover:text-danger"
                >
                  Dismiss
                </Button>
              </>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
