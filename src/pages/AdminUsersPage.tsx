import React from 'react';
import { Users, UserPlus, Shield, Check } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { TableShell, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/TableShell.tsx';

export interface AdminUsersPageProps {
  onNavigate: (path: string) => void;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ onNavigate }) => {
  const users = [
    { name: 'Dr. Alok Baruah', email: 'a.baruah@oil.example.in', role: 'OrgAdmin', site: 'All Enterprise Sites', status: 'Active' },
    { name: 'Priyanka Saikia', email: 'p.saikia@oil.example.in', role: 'HSEOfficer', site: 'Digboi Central Asset', status: 'Active' },
    { name: 'Debajit Bora', email: 'd.bora@oil.example.in', role: 'SafetyReviewer', site: 'Duliajan Field Operations', status: 'Active' },
    { name: 'Manish Chhetri', email: 'm.chhetri@oil.example.in', role: 'SiteManager', site: 'Moran Gathering Station', status: 'Active' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Users & Access Control (RBAC)"
        subtitle="Manage organizational users, role privileges, and site authorization assignments."
        badge={<Badge variant="primary" size="sm">Phase 1 Admin Shell</Badge>}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Invite User
          </Button>
        }
      />

      <Card>
        <TableShell className="border-0">
          <TableHead>
            <tr>
              <TableHeaderCell>User Name</TableHeaderCell>
              <TableHeaderCell>Work Email</TableHeaderCell>
              <TableHeaderCell>Enterprise Role</TableHeaderCell>
              <TableHeaderCell>Site Assignment</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {users.map((u, i) => (
              <TableRow key={i}>
                <TableCell className="font-semibold text-foreground flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {u.name.charAt(0)}
                  </div>
                  {u.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="primary" size="sm">{u.role}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.site}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    {u.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    Edit
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
