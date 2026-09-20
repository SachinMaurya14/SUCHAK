import React from 'react';
import { ShieldCheck, Clock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { StatusBadge } from '../components/ui/StatusBadge.tsx';
import { TableShell, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/TableShell.tsx';

export interface ActionCenterPageProps {
  onNavigate: (path: string) => void;
}

export const ActionCenterPage: React.FC<ActionCenterPageProps> = ({ onNavigate }) => {
  const actions = [
    { id: 'ACT-301', title: 'Procure & Install Certified Whip Checks on Rig #4', assignee: 'Rajiv Sharma (Rig Supv)', dueDate: '2026-09-22', priority: 'CRITICAL', status: 'IN_PROGRESS' },
    { id: 'ACT-302', title: 'Recalibrate Port Multi-Gas Sensors (Skid 2B)', assignee: 'Ananya Gogoi (HSE Tech)', dueDate: '2026-09-20', priority: 'HIGH', status: 'ASSIGNED' },
    { id: 'ACT-303', title: 'Re-audit Scaffolding Tag Verification Procedure', assignee: 'Bikash Das (Site Mgr)', dueDate: '2026-09-25', priority: 'MEDIUM', status: 'COMPLETED' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Corrective Action Center (CAPA)"
        subtitle="Tracking safety barrier remediations, assigned engineers, and closure verifications."
        badge={<Badge variant="primary" size="sm">Phase 1 Workflow Shell</Badge>}
      />

      <Card>
        <TableShell className="border-0">
          <TableHead>
            <tr>
              <TableHeaderCell>Action ID</TableHeaderCell>
              <TableHeaderCell>Remediation Scope</TableHeaderCell>
              <TableHeaderCell>Assigned Specialist</TableHeaderCell>
              <TableHeaderCell>Due Date</TableHeaderCell>
              <TableHeaderCell>Priority</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell className="text-right">Action</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {actions.map((act) => (
              <TableRow key={act.id}>
                <TableCell className="font-mono font-semibold text-primary">{act.id}</TableCell>
                <TableCell className="font-medium text-foreground">{act.title}</TableCell>
                <TableCell className="text-muted-foreground">{act.assignee}</TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">{act.dueDate}</TableCell>
                <TableCell>
                  <Badge variant={act.priority === 'CRITICAL' ? 'danger' : 'warning'} size="sm">
                    {act.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={act.status as any} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    Manage
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
