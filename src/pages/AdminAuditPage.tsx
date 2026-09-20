import React from 'react';
import { ScrollText, Shield, Download } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { TableShell, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/TableShell.tsx';

export interface AdminAuditPageProps {
  onNavigate: (path: string) => void;
}

export const AdminAuditPage: React.FC<AdminAuditPageProps> = ({ onNavigate }) => {
  const logs = [
    { timestamp: '2026-09-19 10:14:02', user: 'p.saikia@oil.example.in', action: 'TRIAGE_CONFIRM_SIF', target: 'REP-2026-0885', ip: '10.14.2.19' },
    { timestamp: '2026-09-18 16:30:11', user: 'system.scheduler', action: 'BATCH_CLUSTER_PATTERN', target: 'PAT-01', ip: '127.0.0.1' },
    { timestamp: '2026-09-18 14:22:45', user: 'rig.op@oil.example.in', action: 'REPORT_INGEST', target: 'REP-2026-0891', ip: '10.14.8.44' },
    { timestamp: '2026-09-17 11:00:29', user: 'a.baruah@oil.example.in', action: 'ROLE_UPDATE', target: 'd.bora (SafetyReviewer)', ip: '10.14.1.5' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Security & System Audit Logs"
        subtitle="Immutable compliance audit log for HSE actions, security policies, and permission changes."
        badge={<Badge variant="primary" size="sm">Audit Log</Badge>}
        actions={
          <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
            Export Audit Trail
          </Button>
        }
      />

      <Card>
        <TableShell className="border-0">
          <TableHead>
            <tr>
              <TableHeaderCell>Timestamp (UTC)</TableHeaderCell>
              <TableHeaderCell>Actor Identity</TableHeaderCell>
              <TableHeaderCell>Security Action</TableHeaderCell>
              <TableHeaderCell>Target Resource</TableHeaderCell>
              <TableHeaderCell>Origin IP</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {logs.map((l, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-mono text-muted-foreground whitespace-nowrap">{l.timestamp}</TableCell>
                <TableCell className="font-medium text-foreground">{l.user}</TableCell>
                <TableCell className="font-mono text-primary">{l.action}</TableCell>
                <TableCell className="text-foreground">{l.target}</TableCell>
                <TableCell className="font-mono text-muted-foreground">{l.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableShell>
      </Card>
    </div>
  );
};
