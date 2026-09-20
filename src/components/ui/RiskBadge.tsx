import React from 'react';
import { Badge } from './Badge.tsx';
import { AlertOctagon, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';
import { RiskPriority, SifPotential } from '../../types/index.ts';

interface RiskBadgeProps {
  level: RiskPriority | SifPotential | string;
  size?: 'sm' | 'md';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'sm' }) => {
  if (level === 'SIF_POTENTIAL' || level === 'CRITICAL') {
    return (
      <Badge variant="danger" size={size}>
        <AlertOctagon className="w-3 h-3 text-danger" aria-hidden="true" />
        <span>{level === 'SIF_POTENTIAL' ? 'SIF Potential' : 'Critical Risk'}</span>
      </Badge>
    );
  }

  if (level === 'HIGH') {
    return (
      <Badge variant="warning" size={size}>
        <AlertTriangle className="w-3 h-3 text-warning" aria-hidden="true" />
        <span>High Priority</span>
      </Badge>
    );
  }

  if (level === 'MEDIUM') {
    return (
      <Badge variant="info" size={size}>
        <ShieldAlert className="w-3 h-3 text-info" aria-hidden="true" />
        <span>Medium</span>
      </Badge>
    );
  }

  if (level === 'NON_SIF' || level === 'LOW') {
    return (
      <Badge variant="success" size={size}>
        <CheckCircle className="w-3 h-3 text-success" aria-hidden="true" />
        <span>{level === 'NON_SIF' ? 'Non-SIF' : 'Low Priority'}</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" size={size}>
      <span>{level}</span>
    </Badge>
  );
};
