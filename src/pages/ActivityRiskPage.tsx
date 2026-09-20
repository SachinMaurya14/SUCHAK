import React from 'react';
import { Activity, AlertTriangle, ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { RiskBadge } from '../components/ui/RiskBadge.tsx';
import { TableShell, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/TableShell.tsx';

export interface ActivityRiskPageProps {
  onNavigate: (path: string) => void;
}

export const ActivityRiskPage: React.FC<ActivityRiskPageProps> = ({ onNavigate }) => {
  const activities = [
    { name: 'High Pressure Line Testing', rule: 'Line of Fire', sifRate: '28.4%', count: 46, risk: 'CRITICAL' },
    { name: 'Confined Space Cleaning & Inspection', rule: 'Confined Space Entry', sifRate: '22.0%', count: 32, risk: 'HIGH' },
    { name: 'Scaffolding Erection & Dismantling', rule: 'Working at Height', sifRate: '18.5%', count: 40, risk: 'HIGH' },
    { name: 'Heavy Rigging & Tandem Crane Lifting', rule: 'Safe Mechanical Lifting', sifRate: '15.2%', count: 28, risk: 'MEDIUM' },
    { name: 'Hot Tapping & Welding in Zone 1', rule: 'Hot Work', sifRate: '12.0%', count: 24, risk: 'MEDIUM' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Activity Risk Prioritization"
        subtitle="Ranking operational tasks and maintenance activities by SIF precursor frequency."
        badge={<Badge variant="primary" size="sm">Phase 1 Activity Shell</Badge>}
      />

      <Card>
        <TableShell className="border-0">
          <TableHead>
            <tr>
              <TableHeaderCell>Activity Description</TableHeaderCell>
              <TableHeaderCell>Dominant IOGP Rule</TableHeaderCell>
              <TableHeaderCell>Total Logged Events</TableHeaderCell>
              <TableHeaderCell>SIF Potential Concentration</TableHeaderCell>
              <TableHeaderCell>Criticality</TableHeaderCell>
              <TableHeaderCell className="text-right">Action</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {activities.map((a, i) => (
              <TableRow key={i}>
                <TableCell className="font-semibold text-foreground flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  {a.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{a.rule}</TableCell>
                <TableCell className="font-mono">{a.count}</TableCell>
                <TableCell className="font-mono font-semibold text-danger">{a.sifRate}</TableCell>
                <TableCell>
                  <RiskBadge level={a.risk} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('/reports')}
                  >
                    View Reports
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableShell>
      </Card>
    </div>
  );
};
