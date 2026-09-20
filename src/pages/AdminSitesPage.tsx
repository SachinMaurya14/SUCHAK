import React from 'react';
import { Network, Plus, MapPin, Building } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { TableShell, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/TableShell.tsx';

export interface AdminSitesPageProps {
  onNavigate: (path: string) => void;
}

export const AdminSitesPage: React.FC<AdminSitesPageProps> = ({ onNavigate }) => {
  const sites = [
    { code: 'SITE-01', name: 'Digboi Central Asset', type: 'Drilling & Production', units: 8, status: 'Active' },
    { code: 'SITE-02', name: 'Duliajan Field Operations', type: 'Gas Processing & Wellheads', units: 14, status: 'Active' },
    { code: 'SITE-03', name: 'Moran Gathering Station', type: 'Crude Oil Desalting & Manifold', units: 5, status: 'Active' },
    { code: 'SITE-04', name: 'Numaligarh Ref Pipeline Terminal', type: 'Product Pipeline & Storage', units: 6, status: 'Active' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Sites & Assets Configuration"
        subtitle="Operational sites, drilling rigs, gathering stations, and pipeline networks."
        badge={<Badge variant="primary" size="sm">Asset Operations</Badge>}
        actions={
          <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
            Add Operational Asset
          </Button>
        }
      />

      <Card>
        <TableShell className="border-0">
          <TableHead>
            <tr>
              <TableHeaderCell>Site Code</TableHeaderCell>
              <TableHeaderCell>Asset Name</TableHeaderCell>
              <TableHeaderCell>Operations Type</TableHeaderCell>
              <TableHeaderCell>Sub-Modules / Wells</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {sites.map((s, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-mono font-semibold text-primary">{s.code}</TableCell>
                <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.type}</TableCell>
                <TableCell className="font-mono">{s.units}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    {s.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    Configure
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
