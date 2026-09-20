import React from 'react';
import { AlertSeverity } from '../../types/alert.ts';
import { AlertOctagon, AlertTriangle, Info, BellRing } from 'lucide-react';

interface AlertSeverityBadgeProps {
  severity: AlertSeverity;
  size?: 'sm' | 'md' | 'lg';
  showLabelPrefix?: boolean;
}

export const AlertSeverityBadge: React.FC<AlertSeverityBadgeProps> = ({
  severity,
  size = 'md',
  showLabelPrefix = true,
}) => {
  const getStyles = () => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-danger/10 text-danger border-danger/30',
          dot: 'bg-danger',
          icon: AlertOctagon,
          label: 'CRITICAL',
          desc: 'Immediate Workflow Attention Required',
        };
      case 'HIGH':
        return {
          bg: 'bg-warning/15 text-warning-dark dark:text-warning border-warning/40',
          dot: 'bg-warning',
          icon: AlertTriangle,
          label: 'HIGH',
          desc: 'Timely Attention Recommended',
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
          icon: AlertTriangle,
          label: 'WARNING',
          desc: 'Attention Recommended',
        };
      case 'NOTICE':
        return {
          bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
          dot: 'bg-blue-500',
          icon: BellRing,
          label: 'NOTICE',
          desc: 'Action May Be Useful',
        };
      case 'INFO':
      default:
        return {
          bg: 'bg-muted text-muted-foreground border-border',
          dot: 'bg-muted-foreground',
          icon: Info,
          label: 'INFO',
          desc: 'Informational Event',
        };
    }
  };

  const config = getStyles();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-[11px] px-2 py-0.5 gap-1.5',
    lg: 'text-xs px-2.5 py-1 gap-2 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md border font-mono uppercase tracking-wider ${config.bg} ${sizeClasses}`}
      title={`Alert Severity: ${config.label} (${config.desc}) - Workflow Signal Only`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{showLabelPrefix ? `URGENCY: ${config.label}` : config.label}</span>
    </span>
  );
};
