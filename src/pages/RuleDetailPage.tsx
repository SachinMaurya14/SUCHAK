import React from 'react';
import { ArrowLeft, ShieldCheck, Target, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';

export interface RuleDetailPageProps {
  ruleId: string;
  onNavigate: (path: string) => void;
}

export const RuleDetailPage: React.FC<RuleDetailPageProps> = ({ ruleId = 'line-of-fire', onNavigate }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="IOGP Rule Guidance: Line of Fire"
        subtitle="Rule 04: Position yourself for safety and protect personnel from stored energy releases."
        breadcrumbs={[
          { label: 'Safety Rules', onClick: () => onNavigate('/rules') },
          { label: 'Line of Fire' },
        ]}
        badge={<Badge variant="warning" size="sm">High Precursor Zone</Badge>}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={() => onNavigate('/rules')}
          >
            Back to Rules
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Mandatory Control Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-foreground leading-relaxed">
            <div className="p-4 rounded-xl border border-border bg-surface-muted/40 space-y-2">
              <p className="font-semibold text-sm">Individual Safety Commitments</p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>I identify potential stored energy vectors (pneumatic, hydraulic, mechanical, electrical).</li>
                <li>I establish and respect physical exclusionary barricades around active pressurized proof testing.</li>
                <li>I verify secondary mechanical restraint cables (whip checks) are rigged prior to pressurization.</li>
                <li>I position myself out of line of fire during active crane swings and suspended loads.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precursor Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-border-subtle">
              <span className="text-muted-foreground">Total Reports Mapped:</span>
              <span className="font-bold text-foreground font-mono">34</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle">
              <span className="text-muted-foreground">SIF Potential Rate:</span>
              <span className="font-bold text-danger font-mono">70.5%</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Most Affected Site:</span>
              <span className="font-medium text-primary">Digboi Central</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
