import React from 'react';
import {
  Clock,
  UserCheck,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { ClientReviewStatus } from '../../types/review.ts';

interface ReviewStatusBadgeProps {
  status: ClientReviewStatus | string;
  isStale?: boolean;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ReviewStatusBadge: React.FC<ReviewStatusBadgeProps> = ({
  status,
  isStale = false,
  className = '',
  showIcon = true,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium',
  }[size];

  if (isStale) {
    return (
      <span
        id="badge-review-stale"
        className={`inline-flex items-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 ${sizeClasses} ${className}`}
        title="Source report or AI model was updated after this review"
      >
        {showIcon && <RotateCcw className="w-3.5 h-3.5 animate-spin-reverse" />}
        <span>Stale — Re-Review Required</span>
      </span>
    );
  }

  switch (status) {
    case 'REVIEW_CONFIRMED':
      return (
        <span
          id="badge-review-confirmed"
          className={`inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${sizeClasses} ${className}`}
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5" />}
          <span>Verified SIF (Confirmed)</span>
        </span>
      );

    case 'REVIEW_CORRECTED':
      return (
        <span
          id="badge-review-corrected"
          className={`inline-flex items-center rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/30 ${sizeClasses} ${className}`}
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5" />}
          <span>Human Corrected</span>
        </span>
      );

    case 'REVIEW_REJECTED':
      return (
        <span
          id="badge-review-rejected"
          className={`inline-flex items-center rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 ${sizeClasses} ${className}`}
        >
          {showIcon && <XCircle className="w-3.5 h-3.5" />}
          <span>AI Interpretation Rejected</span>
        </span>
      );

    case 'NEEDS_MORE_REVIEW':
      return (
        <span
          id="badge-review-needs-more"
          className={`inline-flex items-center rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 ${sizeClasses} ${className}`}
        >
          {showIcon && <HelpCircle className="w-3.5 h-3.5" />}
          <span>Needs More Evidence</span>
        </span>
      );

    case 'IN_REVIEW':
      return (
        <span
          id="badge-review-in-progress"
          className={`inline-flex items-center rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 ${sizeClasses} ${className}`}
        >
          {showIcon && <Eye className="w-3.5 h-3.5" />}
          <span>In Review</span>
        </span>
      );

    case 'ASSIGNED':
      return (
        <span
          id="badge-review-assigned"
          className={`inline-flex items-center rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 ${sizeClasses} ${className}`}
        >
          {showIcon && <UserCheck className="w-3.5 h-3.5" />}
          <span>Assigned</span>
        </span>
      );

    case 'QUEUED':
      return (
        <span
          id="badge-review-queued"
          className={`inline-flex items-center rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 ${sizeClasses} ${className}`}
        >
          {showIcon && <Clock className="w-3.5 h-3.5" />}
          <span>Pending Review</span>
        </span>
      );

    case 'RE_REVIEW_REQUIRED':
      return (
        <span
          id="badge-review-re-review"
          className={`inline-flex items-center rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 ${sizeClasses} ${className}`}
        >
          {showIcon && <AlertTriangle className="w-3.5 h-3.5" />}
          <span>Re-Review Required</span>
        </span>
      );

    default:
      return (
        <span
          id="badge-review-unreviewed"
          className={`inline-flex items-center rounded-full bg-slate-800 text-slate-400 border border-slate-700 ${sizeClasses} ${className}`}
        >
          {showIcon && <Clock className="w-3.5 h-3.5" />}
          <span>Unreviewed</span>
        </span>
      );
  }
};
