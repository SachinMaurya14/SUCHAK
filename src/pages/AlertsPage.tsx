import React from 'react';
import { Bell, AlertTriangle, CheckCircle, ShieldAlert, ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { RiskBadge } from '../components/ui/RiskBadge.tsx';

export interface AlertsPageProps {
  onNavigate: (path: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onNavigate }) => {
  const alerts = [
    {
      id: 'ALT-101',
      title: 'Repeated Line of Fire Precursor Surge',
      site: 'Digboi Central (Rig #4)',
      time: '15 mins ago',
      level: 'CRITICAL',
      details: '3 distinct reports within 48 hours observing unlatched whip checks on pressurized testing lines.',
    },
    {
      id: 'ALT-102',
      title: 'Confined Space Atmosphere Sensor Expiration',
      site: 'Duliajan Field',
      time: '2 hours ago',
      level: 'HIGH',
      details: 'Work permitted with portable gas detector calibration interval expiring within shift window.',
    },
    {
      id: 'ALT-103',
      title: 'Scaffold Defect Escalation',
      site: 'Numaligarh Terminal',
      time: '1 day ago',
      level: 'MEDIUM',
      details: 'Red-tag violation recorded during morning maintenance walk-through.',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Active Risk Alerts"
        subtitle="Automated threshold warnings triggered by precursor velocity spikes and barrier failures."
        badge={<Badge variant="danger" size="sm">3 Active Triggers</Badge>}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('/actions')}
          >
            Action Center
          </Button>
        }
      />

      <div className="space-y-4">
        {alerts.map((alt) => (
          <Card key={alt.id} className="border-l-4 border-l-danger">
            <CardContent className="p-4 flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">{alt.id}</span>
                  <RiskBadge level={alt.level} size="sm" />
                  <span className="text-[11px] text-muted-foreground">• {alt.time}</span>
                </div>
                <h4 className="text-sm font-bold text-foreground">{alt.title}</h4>
                <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">{alt.details}</p>
                <span className="text-[11px] font-medium text-primary block mt-1">
                  Location: {alt.site}
                </span>
              </div>
              <div className="flex items-center gap-2 self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('/reports')}
                >
                  View Evidence
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate('/actions')}
                >
                  Assign Action
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
