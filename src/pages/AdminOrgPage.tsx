import React from 'react';
import { Building2, Shield, Globe, Lock } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';

export interface AdminOrgPageProps {
  onNavigate: (path: string) => void;
}

export const AdminOrgPage: React.FC<AdminOrgPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Organization Settings"
        subtitle="Manage enterprise tenant profile, safety reporting standards, and compliance presets."
        badge={<Badge variant="primary" size="sm">Phase 1 Admin Shell</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle>Enterprise Tenant Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-2xl text-xs">
          <Input label="Organization Legal Name" defaultValue="Oil India Limited (HSE Directorate)" />
          <Input label="Tenant Identifier" defaultValue="oil-india-hse-prod" disabled />
          <Input label="Primary Industry Classification" defaultValue="Upstream Exploration & Production (E&P)" />
          <Input label="Standard Safety Rule Framework" defaultValue="IOGP Life-Saving Rules (Report 459)" />
          <div className="pt-2">
            <Button variant="primary" size="sm">
              Save Organization Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
