import React from 'react';
import {
  Clock,
  UserCheck,
  PlayCircle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  CheckCheck,
  RotateCcw,
  XCircle,
  FileEdit,
  AlertTriangle,
} from 'lucide-react';
import { ActionStatus, ActionPriority, ActionType } from '../../types/action.ts';

interface ActionStatusBadgeProps {
  status: ActionStatus;
  isOverdue?: boolean;
  className?: string;
}

export const ActionStatusBadge: React.FC<ActionStatusBadgeProps> = ({
  status,
  isOverdue = false,
  className = '',
}) => {
  const getStatusConfig = (st: ActionStatus) => {
    switch (st) {
      case 'DRAFT':
        return {
          label: 'Draft',
          icon: FileEdit,
          classes: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        };
      case 'OPEN':
        return {
          label: 'Open / Unassigned',
          icon: Clock,
          classes: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
        };
      case 'ASSIGNED':
        return {
          label: 'Assigned',
          icon: UserCheck,
          classes: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
        };
      case 'IN_PROGRESS':
        return {
          label: 'In Progress',
          icon: PlayCircle,
          classes: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
        };
      case 'COMPLETED':
        return {
          label: 'Completed',
          icon: CheckCircle2,
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
        };
      case 'VERIFICATION_REQUIRED':
        return {
          label: 'Verification Required',
          icon: ShieldAlert,
          classes: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
        };
      case 'VERIFIED':
        return {
          label: 'Verified',
          icon: ShieldCheck,
          classes: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
        };
      case 'CLOSED':
        return {
          label: 'Closed',
          icon: CheckCheck,
          classes: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700',
        };
      case 'REOPENED':
        return {
          label: 'Reopened',
          icon: RotateCcw,
          classes: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          icon: XCircle,
          classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
        };
      default:
        return {
          label: st,
          icon: Clock,
          classes: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{config.label}</span>
      </span>

      {isOverdue && status !== 'CLOSED' && status !== 'CANCELLED' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 border border-rose-300 dark:text-rose-300 dark:border-rose-800">
          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>OVERDUE</span>
        </span>
      )}
    </div>
  );
};

export const ActionPriorityBadge: React.FC<{ priority: ActionPriority; className?: string }> = ({
  priority,
  className = '',
}) => {
  const getPriorityClasses = (p: ActionPriority) => {
    switch (p) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
      case 'LOW':
        return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border tracking-wider uppercase ${getPriorityClasses(
        priority
      )} ${className}`}
    >
      {priority}
    </span>
  );
};

export const ActionTypeBadge: React.FC<{ type: ActionType; className?: string }> = ({
  type,
  className = '',
}) => {
  const isCorrective = type === 'CORRECTIVE';
  const isPreventive = type === 'PREVENTIVE';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
        isCorrective
          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
          : isPreventive
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
          : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
      } ${className}`}
    >
      {type}
    </span>
  );
};
