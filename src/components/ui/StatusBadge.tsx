import React from 'react';
import { Badge } from './Badge.tsx';
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';
import { ReviewStatus, ProcessingStatus } from '../../types/index.ts';

interface StatusBadgeProps {
  status: ReviewStatus | ProcessingStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  switch (status) {
    case 'Verified SIF':
      return (
        <Badge variant="danger" size={size}>
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          <span>Verified SIF</span>
        </Badge>
      );
    case 'Overridden Non-SIF':
      return (
        <Badge variant="success" size={size}>
          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
          <span>Non-SIF</span>
        </Badge>
      );
    case 'Under Review':
    case 'Processing':
      return (
        <Badge variant="warning" size={size}>
          <Clock className="w-3 h-3 animate-pulse" aria-hidden="true" />
          <span>{status}</span>
        </Badge>
      );
    case 'Action Assigned':
      return (
        <Badge variant="info" size={size}>
          <ShieldCheck className="w-3 h-3" aria-hidden="true" />
          <span>Action Assigned</span>
        </Badge>
      );
    case 'ANALYSIS_FAILED':
    case 'Failed':
      return (
        <Badge variant="danger" size={size}>
          <XCircle className="w-3 h-3" aria-hidden="true" />
          <span>Review Required (Analysis Failed)</span>
        </Badge>
      );
    case 'REVIEW_REQUIRED':
      return (
        <Badge variant="warning" size={size}>
          <AlertTriangle className="w-3 h-3 text-warning" aria-hidden="true" />
          <span>Review Required</span>
        </Badge>
      );
    case 'ANALYZED':
      return (
        <Badge variant="success" size={size}>
          <CheckCircle2 className="w-3 h-3 text-success" aria-hidden="true" />
          <span>Analyzed</span>
        </Badge>
      );
    case 'Unreviewed':
    case 'Pending':
    default:
      return (
        <Badge variant="secondary" size={size}>
          <Clock className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
          <span>{status}</span>
        </Badge>
      );
  }
};
