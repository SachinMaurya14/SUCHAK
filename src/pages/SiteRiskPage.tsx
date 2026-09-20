import React from 'react';
import { MapPin, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { RiskBadge } from '../components/ui/RiskBadge.tsx';
import { TableShell, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/TableShell.tsx';

export interface SiteRiskPageProps {
  onNavigate: (path: string) => void;
}

export const SiteRiskPage: React.FC<SiteRiskPageProps> = ({ onNavigate }) => {
  const sites = [
    { name: 'Digboi Central Asset', region: 'Assam East', totalReports: 482, sifPrecursors: 38, priority: 'CRITICAL', riskScore: 84 },
    { name: 'Duliajan Field Operations', region: 'Assam Central', totalReports: 395, sifPrecursors: 24, priority: 'HIGH', riskScore: 71 },
    { name: 'Moran Gathering Station', region: 'Assam West', totalReports: 284, sifPrecursors: 14, priority: 'MEDIUM', riskScore: 56 },
    { name: 'Numaligarh Ref Terminal', region: 'Assam South', totalReports: 267, sifPrecursors: 8, priority: 'LOW', riskScore: 38 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Site Risk Prioritization"
        subtitle="Comparative precursor concentration and operational site risk indexing."
        badge={<Badge variant="primary" size="sm">Phase 1 Risk Shell</Badge>}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/reports')}
          >
            Filter by Site
          </Button>
        }
      />

      <Card>
        <TableShell className="border-0">
          <TableHead>
            <tr>
              <TableHeaderCell>Operational Asset</TableHeaderCell>
              <TableHeaderCell>Geographic Region</TableHeaderCell>
              <TableHeaderCell>Total Safety Logs</TableHeaderCell>
              <TableHeaderCell>SIF Precursors</TableHeaderCell>
              <TableHeaderCell>Precursor Index</TableHeaderCell>
              <TableHeaderCell>Risk Category</TableHeaderCell>
              <TableHeaderCell className="text-right">Action</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {sites.map((s, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {s.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{s.region}</TableCell>
                <TableCell className="font-mono">{s.totalReports}</TableCell>
                <TableCell className="font-mono text-danger font-semibold">{s.sifPrecursors}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">{s.riskScore}/100</span>
                    <div className="w-16 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className={`h-full ${s.riskScore > 75 ? 'bg-danger' : s.riskScore > 50 ? 'bg-warning' : 'bg-primary'}`}
                        style={{ width: `${s.riskScore}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <RiskBadge level={s.priority} />
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
