import React from 'react';
import { Repeat, Layers, Sparkles, Clock, AlertCircle, HelpCircle } from 'lucide-react';
import { PatternStatus } from '../../types/index.ts';

interface PatternStatusBadgeProps {
  status: PatternStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const PatternStatusBadge: React.FC<PatternStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const getStatusConfig = (st: PatternStatus) => {
    switch (st) {
      case 'RECURRING':
        return {
          label: 'Recurring',
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
          text: 'text-emerald-700 dark:text-emerald-400',
          border: 'border-emerald-300 dark:border-emerald-800/60',
          icon: Repeat,
          tooltip: 'Repeated historical support across multiple distinct observation dates',
        };
      case 'PERSISTENT':
        return {
          label: 'Persistent',
          bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
          text: 'text-indigo-700 dark:text-indigo-400',
          border: 'border-indigo-300 dark:border-indigo-800/60',
          icon: Layers,
          tooltip: 'Pattern observed continuously across extended time windows (> 60 days)',
        };
      case 'EMERGING':
        return {
          label: 'Emerging',
          bg: 'bg-amber-500/10 dark:bg-amber-500/20',
          text: 'text-amber-700 dark:text-amber-400',
          border: 'border-amber-300 dark:border-amber-800/60',
          icon: Sparkles,
          tooltip: 'Recent repeated recurrence (< 45 days) with limited longer historical depth',
        };
      case 'INACTIVE':
        return {
          label: 'Inactive',
          bg: 'bg-slate-500/10 dark:bg-slate-500/20',
          text: 'text-slate-600 dark:text-slate-400',
          border: 'border-slate-300 dark:border-slate-700',
          icon: Clock,
          tooltip: 'Previously observed pattern with zero reports in recent observation periods',
        };
      case 'INSUFFICIENT_SUPPORT':
        return {
          label: 'Insufficient Support',
          bg: 'bg-zinc-500/10 dark:bg-zinc-500/20',
          text: 'text-zinc-600 dark:text-zinc-400',
          border: 'border-zinc-300 dark:border-zinc-700',
          icon: AlertCircle,
          tooltip: 'Fewer than required minimum reports (default: 3) to qualify as a pattern',
        };
      case 'CANDIDATE':
      default:
        return {
          label: 'Candidate',
          bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
          text: 'text-cyan-700 dark:text-cyan-400',
          border: 'border-cyan-300 dark:border-cyan-800/60',
          icon: HelpCircle,
          tooltip: 'Meets report threshold; undergoing cross-date and semantic cohesion validation',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5 gap-1 font-medium'
      : 'text-xs px-2.5 py-1 gap-1.5 font-semibold';

  return (
    <span
      title={config.tooltip}
      className={`inline-flex items-center rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} transition-colors select-none`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span>{config.label}</span>
    </span>
  );
};
