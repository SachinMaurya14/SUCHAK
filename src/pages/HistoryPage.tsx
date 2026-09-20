import React from 'react';
import { History, Clock, FileText, CheckCircle, Shield } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Badge } from '../components/ui/Badge.tsx';

export interface HistoryPageProps {
  onNavigate: (path: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigate }) => {
  const events = [
    { time: '2026-09-19 10:14', actor: 'HSE Reviewer', action: 'Verified SIF Potential on REP-2026-0885', target: 'Numaligarh Ref' },
    { time: '2026-09-18 16:30', actor: 'System Pipeline', action: 'Auto-clustered 3 reports into Pattern PAT-01', target: 'Line of Fire' },
    { time: '2026-09-18 14:22', actor: 'Digboi Rig Supv', action: 'Ingested Near-Miss Report REP-2026-0891', target: 'Digboi Central' },
    { time: '2026-09-17 11:00', actor: 'Org Administrator', action: 'Updated Site Configuration for Duliajan Field', target: 'Assets Registry' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Audit & Execution History"
        subtitle="Chronological audit log of evaluations, triage overrides, and barrier updates."
        badge={<Badge variant="primary" size="sm">Audit History</Badge>}
      />

      <Card>
        <CardContent className="divide-y divide-border-subtle p-0">
          {events.map((ev, i) => (
            <div key={i} className="p-4 flex items-center justify-between text-xs hover:bg-surface-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-surface-muted text-muted-foreground border border-border">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{ev.action}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Initiated by <span className="font-medium text-foreground">{ev.actor}</span> • Scope: {ev.target}
                  </p>
                </div>
              </div>
              <span className="text-muted-foreground font-mono text-[11px]">{ev.time}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
