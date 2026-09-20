import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  ArrowUpRight,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';
import { ActionStatusBadge, ActionPriorityBadge, ActionTypeBadge } from './ActionStatusBadge.tsx';
import { CreateActionModal } from './CreateActionModal.tsx';
import { ActionDetailModal } from './ActionDetailModal.tsx';
import { actionService } from '../../services/actionService.ts';
import { ActionRecord, CreateActionPayload } from '../../types/action.ts';
import { SafetyReport } from '../../types/index.ts';

interface ReportActionsCardProps {
  report: SafetyReport;
  onNavigateToPattern?: (patternId: string) => void;
}

export const ReportActionsCard: React.FC<ReportActionsCardProps> = ({
  report,
  onNavigateToPattern,
}) => {
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  useEffect(() => {
    if (report?.id) {
      loadReportActions();
    }
  }, [report?.id]);

  const loadReportActions = async () => {
    try {
      setLoading(true);
      const data = await actionService.getActionsByReportId(report.id);
      setActions(data);
    } catch (err) {
      console.warn('Failed to fetch report actions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActionCreated = (newAction: ActionRecord) => {
    setActions((prev) => [newAction, ...prev]);
  };

  const handleActionUpdated = (updated: ActionRecord) => {
    setActions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  // Pre-fill creation data from report
  const initialData: Partial<CreateActionPayload> & { source_report_number?: string } = {
    action_type: 'CORRECTIVE',
    source_report_id: report.id,
    source_report_number: report.reportNumber || report.id,
    source_finding_type: report.latestAnalysis?.sif_potential ? 'SIF_CLASSIFICATION' : 'BARRIER_FAILURE',
    source_finding_summary: `${report.activity}: ${report.description.slice(0, 160)}...`,
    site_id: report.siteId,
    site_name: report.siteName,
    activity_name: report.activity,
    priority: report.latestRiskAssessment?.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
    title: `Remediate ${report.activity} barrier degradation (${report.siteName})`,
    description: `Action initiated from Report ${report.reportNumber || report.id}. Conduct investigation and implement physical barrier verification for ${report.activity}.`,
  };

  return (
    <Card className="p-6 space-y-4 border-border/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                HSE Corrective Actions (CAPA)
              </h3>
              <Badge variant="outline" size="sm">
                {actions.length} Linked Action{actions.length === 1 ? '' : 's'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Human-governed corrective actions and barrier remediations originating from this safety observation.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 self-start sm:self-auto text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Create HSE Action</span>
        </Button>
      </div>

      {loading ? (
        <div className="py-8 flex items-center justify-center text-xs text-muted-foreground">
          <Clock className="w-4 h-4 animate-spin mr-2 text-primary" />
          Loading linked corrective actions...
        </div>
      ) : actions.length === 0 ? (
        <div className="py-6 px-4 rounded-xl bg-muted/20 border border-dashed border-border text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            No corrective actions have been created for this report yet.
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            Authorized HSE officers may initiate a human-controlled corrective action to mandate and track barrier repair.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="text-xs mt-1"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Initiate First Corrective Action
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {actions.map((act) => (
            <div
              key={act.id}
              onClick={() => setSelectedActionId(act.id)}
              className="p-3.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm cursor-pointer transition-all space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">
                    {act.action_number}
                  </span>
                  <ActionTypeBadge type={act.action_type} />
                  <ActionPriorityBadge priority={act.priority} />
                </div>
                <div className="flex items-center gap-2">
                  <ActionStatusBadge status={act.status} isOverdue={act.is_overdue} />
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <h4 className="text-xs font-semibold text-foreground line-clamp-1">
                {act.title}
              </h4>

              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {act.owner_user_name || 'Unassigned'}
                  </span>
                  <span>Team: {act.owner_team_name || 'HSE Remediation'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Due: {new Date(act.due_at).toLocaleDateString()}
                  {act.is_overdue && (
                    <span className="text-rose-600 dark:text-rose-400 font-bold ml-1">
                      ({act.days_overdue}d overdue)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateActionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onActionCreated={handleActionCreated}
        initialData={initialData}
      />

      {/* Detail Modal */}
      <ActionDetailModal
        actionId={selectedActionId}
        isOpen={!!selectedActionId}
        onClose={() => setSelectedActionId(null)}
        onActionUpdated={handleActionUpdated}
        onNavigateToPattern={onNavigateToPattern}
      />
    </Card>
  );
};
