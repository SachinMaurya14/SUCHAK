import React from 'react';
import { AlertStatus } from '../../types/alert.ts';
import { CheckCircle2, Eye, Bell, XCircle, Clock } from 'lucide-react';

interface AlertStatusBadgeProps {
  status: AlertStatus;
  size?: 'sm' | 'md';
}

export const AlertStatusBadge: React.FC<AlertStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const getStyle = () => {
    switch (status) {
      case 'UNREAD':
        return {
          bg: 'bg-primary/10 text-primary border-primary/30',
          dot: 'bg-primary animate-pulse',
          icon: Bell,
          label: 'Unread',
        };
      case 'READ':
        return {
          bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/30',
          dot: 'bg-slate-400',
          icon: Eye,
          label: 'Read',
        };
      case 'ACKNOWLEDGED':
        return {
          bg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
          dot: 'bg-indigo-500',
          icon: CheckCircle2,
          label: 'Acknowledged',
        };
      case 'RESOLVED':
        return {
          bg: 'bg-success/15 text-success-dark dark:text-success border-success/30',
          dot: 'bg-success',
          icon: CheckCircle2,
          label: 'Resolved',
        };
      case 'DISMISSED':
        return {
          bg: 'bg-muted/30 text-muted-foreground border-border',
          dot: 'bg-muted-foreground',
          icon: XCircle,
          label: 'Dismissed',
        };
      case 'EXPIRED':
        return {
          bg: 'bg-muted/20 text-muted-foreground border-border opacity-70',
          dot: 'bg-muted-foreground',
          icon: Clock,
          label: 'Expired',
        };
    }
  };

  const config = getStyle();
  const Icon = config.icon;

  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5 gap-1' : 'text-[11px] px-2 py-0.5 gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <Icon className="w-3 h-3 opacity-80" />
      <span>{config.label}</span>
    </span>
  );
};
