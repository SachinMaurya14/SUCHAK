import React from 'react';
import { Download, FileSpreadsheet, FileText, Printer, CheckCircle } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';

export interface ExportsPageProps {
  onNavigate: (path: string) => void;
}

export const ExportsPage: React.FC<ExportsPageProps> = ({ onNavigate }) => {
  const exportTypes = [
    { title: 'Monthly Executive SIF Intelligence Report', format: 'PDF Document', desc: 'Summary of SIF potential rate, high-risk activity trends, and IOGP Life-Saving Rule breaches for management review.', icon: <FileText className="w-5 h-5 text-danger" /> },
    { title: 'Raw Observation & Precursor Dataset', format: 'CSV / Excel', desc: 'Normalized export of all safety reports, barrier failure tags, and reviewer triage notes.', icon: <FileSpreadsheet className="w-5 h-5 text-success" /> },
    { title: 'CAPA Remediations & Audit Trail', format: 'CSV', desc: 'List of all assigned corrective actions, target completion dates, and verified closures.', icon: <Download className="w-5 h-5 text-primary" /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Compliance & Export Reports"
        subtitle="Generate formatted executive briefs, audit dossiers, and tabular safety exports."
        badge={<Badge variant="primary" size="sm">Phase 1 Export Shell</Badge>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exportTypes.map((exp, idx) => (
          <Card key={idx} className="flex flex-col justify-between">
            <div>
              <CardHeader className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-surface-muted border border-border">
                    {exp.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">{exp.format}</span>
                    <CardTitle className="text-sm mt-0.5">{exp.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{exp.desc}</p>
              </CardContent>
            </div>
            <div className="p-4 pt-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => {}}
              >
                Generate Export
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
