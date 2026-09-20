import React from 'react';
import { Share2, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { RiskBadge } from '../components/ui/RiskBadge.tsx';

export interface PatternsPageProps {
  onNavigate: (path: string) => void;
}

export const PatternsPage: React.FC<PatternsPageProps> = ({ onNavigate }) => {
  const clusters = [
    {
      id: 'PAT-01',
      title: 'High Pressure Hose & Swivel Failures',
      rule: 'Line of Fire',
      reportsCount: 14,
      sites: ['Digboi Central', 'Duliajan Field'],
      severity: 'CRITICAL',
      description: 'Repeated observations of unlatched whip check cables and personnel entering barricaded pressure proof areas.',
    },
    {
      id: 'PAT-02',
      title: 'Confined Space Sensor Lapses',
      rule: 'Confined Space Entry',
      reportsCount: 8,
      sites: ['Numaligarh Ref', 'Duliajan Field'],
      severity: 'HIGH',
      description: 'Pre-entry continuous atmosphere testing calibrated certificate missing or delayed during vessel cleaning.',
    },
    {
      id: 'PAT-03',
      title: 'Scaffold Anchor Points Modification',
      rule: 'Working at Height',
      reportsCount: 11,
      sites: ['Digboi Central', 'Moran Station'],
      severity: 'HIGH',
      description: 'Planks and toe-boards removed without scaffolder supervisor sign-off for temporary conduit routing.',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Recurring Precursor Patterns"
        subtitle="Semantic clustering and discovery of systemic safety barrier vulnerabilities across sites."
        badge={<Badge variant="primary" size="sm">Phase 1 Pattern Shell</Badge>}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/reports')}
          >
            All Reports
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clusters.map((c) => (
          <Card key={c.id} className="flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div>
              <CardHeader className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold text-primary block">{c.id}</span>
                  <CardTitle className="text-sm mt-0.5">{c.title}</CardTitle>
                </div>
                <RiskBadge level={c.severity} size="sm" />
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">{c.description}</p>
                <div className="pt-2 border-t border-border-subtle space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mapped Rule:</span>
                    <span className="font-semibold text-foreground">{c.rule}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cluster Size:</span>
                    <span className="font-mono font-semibold text-foreground">{c.reportsCount} Reports</span>
                  </div>
                </div>
              </CardContent>
            </div>
            <div className="p-4 pt-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => onNavigate('/reports')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                iconPosition="right"
              >
                Inspect Cluster Reports
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
