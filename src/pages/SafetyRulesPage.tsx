import React from 'react';
import {
  BookOpen,
  Zap,
  Flame,
  Box,
  Target,
  ArrowUpRight,
  Shield,
  Search,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';

export interface SafetyRulesPageProps {
  onNavigate: (path: string) => void;
}

export const SafetyRulesPage: React.FC<SafetyRulesPageProps> = ({ onNavigate }) => {
  // IOGP Life-Saving Rules foundational cards as required by prompt
  const rules = [
    {
      id: 'energy-isolation',
      name: 'Energy Isolation (LOTO)',
      icon: <Zap className="w-5 h-5 text-warning" />,
      ruleNumber: 'Rule 01',
      summary: 'Verify isolation and zero energy state before work begins.',
      mappedReports: 22,
      severityCategory: 'High Energy Systems',
    },
    {
      id: 'hot-work',
      name: 'Hot Work',
      icon: <Flame className="w-5 h-5 text-danger" />,
      ruleNumber: 'Rule 02',
      summary: 'Control flammables and ignition sources in hazardous operating environments.',
      mappedReports: 14,
      severityCategory: 'Ignition Control',
    },
    {
      id: 'confined-space',
      name: 'Confined Space Entry',
      icon: <Box className="w-5 h-5 text-info" />,
      ruleNumber: 'Rule 03',
      summary: 'Obtain authorization to enter, verify atmosphere, and confirm standby personnel.',
      mappedReports: 10,
      severityCategory: 'Toxic / Asphyxiation',
    },
    {
      id: 'line-of-fire',
      name: 'Line of Fire',
      icon: <Target className="w-5 h-5 text-danger" />,
      ruleNumber: 'Rule 04',
      summary: 'Position yourself for safety, away from moving equipment and pressurized release vectors.',
      mappedReports: 34,
      severityCategory: 'Mechanical & Stored Energy',
    },
    {
      id: 'working-at-height',
      name: 'Working at Height',
      icon: <ArrowUpRight className="w-5 h-5 text-primary" />,
      ruleNumber: 'Rule 05',
      summary: 'Protect yourself against a fall when working outside protected decking.',
      mappedReports: 18,
      severityCategory: 'Fall Protection',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="IOGP Life-Saving Rule Guide"
        subtitle="Standardized international oil & gas producer safety rules mapped against incident precursors."
        badge={<Badge variant="primary" size="sm">Rule Registry</Badge>}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/reports')}
          >
            View All Reports
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rules.map((r) => (
          <Card key={r.id} className="flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div>
              <CardHeader className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-surface-muted border border-border">
                    {r.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      {r.ruleNumber}
                    </span>
                    <CardTitle className="text-sm">{r.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">{r.summary}</p>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border-subtle">
                  <span className="text-muted-foreground">Precursor Category:</span>
                  <span className="font-semibold text-foreground">{r.severityCategory}</span>
                </div>
              </CardContent>
            </div>
            <CardFooter>
              <span className="text-xs font-semibold text-foreground">
                {r.mappedReports} Precursors Mapped
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate(`/rules/${r.id}`)}
                icon={<ExternalLink className="w-3.5 h-3.5" />}
                iconPosition="right"
              >
                Inspect
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};
