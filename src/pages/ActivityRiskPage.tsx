import React, { useState, useEffect } from 'react';
import { Activity, RotateCw, Calendar, Info } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { RiskBadge } from '../components/ui/RiskBadge.tsx';
import { TableShell, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/TableShell.tsx';
import { ActivityRiskAggregation } from '../types/index.ts';

export interface ActivityRiskPageProps {
  onNavigate: (path: string) => void;
}

export const ActivityRiskPage: React.FC<ActivityRiskPageProps> = ({ onNavigate }) => {
  const [windowPreset, setWindowPreset] = useState<string>('all');
  const [activities, setActivities] = useState<ActivityRiskAggregation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchActivities = (preset: string) => {
    setLoading(true);
    fetch(`/api/v1/risk/aggregations/activities?window_preset=${preset}`)
      .then((res) => res.json())
      .then((data: ActivityRiskAggregation[]) => {
        setActivities(data);
      })
      .catch((err) => console.warn('[SUCHAK] Failed to load activity risk aggregations:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchActivities(windowPreset);
  }, [windowPreset]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Activity SIF Precursor Prioritization"
        subtitle="Ranking operational tasks and maintenance activities by SIF precursor density across assets."
        badge={<Badge variant="primary" size="sm">Active Policy v1.0</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground ml-1.5" />
              {(['7d', '30d', '90d', '1y', 'all'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setWindowPreset(preset)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    windowPreset === preset
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {preset === 'all' ? 'All Time' : preset.toUpperCase()}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/reports')}
            >
              Filter Reports
            </Button>
          </div>
        }
      />

      <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-border text-xs flex items-start gap-2.5 text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Operational Activity Density:</span> Compares high-energy tasks (line testing, well interventions, rigging) by SIF precursor frequency. Activities with sample size under 5 are marked <em>INSUFFICIENT DATA</em> to prevent false ranking conclusions.
        </div>
      </div>

      <Card>
        <TableShell className="border-0">
          <TableHead>
            <tr>
              <TableHeaderCell>Operational Activity</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Sample Count</TableHeaderCell>
              <TableHeaderCell>SIF Precursors</TableHeaderCell>
              <TableHeaderCell>Precursor Density</TableHeaderCell>
              <TableHeaderCell>Priority Band</TableHeaderCell>
              <TableHeaderCell>Sample Validity</TableHeaderCell>
              <TableHeaderCell className="text-right">Action</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <RotateCw className="w-4 h-4 animate-spin text-primary" />
                    Calculating activity precursor density across {windowPreset} window...
                  </div>
                </TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                  No activity safety records found for the selected time period.
                </TableCell>
              </TableRow>
            ) : (
              activities.map((a) => (
                <TableRow key={a.activity_id}>
                  <TableCell className="font-semibold text-foreground flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div>
                      <div>{a.activity_name}</div>
                      <span className="text-[10px] text-muted-foreground font-mono">{a.activity_code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{a.category}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {a.sample_count} <span className="text-muted-foreground">reports</span>
                  </TableCell>
                  <TableCell className="font-mono font-semibold text-danger text-xs">
                    {a.sif_reports}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold">{a.sif_precursor_density_pct}%</span>
                      <div className="w-16 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                        <div
                          className={`h-full ${
                            a.sif_precursor_density_pct >= 25
                              ? 'bg-danger'
                              : a.sif_precursor_density_pct >= 10
                              ? 'bg-warning'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(100, a.sif_precursor_density_pct)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RiskBadge level={a.dominant_priority} />
                  </TableCell>
                  <TableCell>
                    {a.sample_sufficiency === 'SUFFICIENT' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-success/10 text-success border border-success/20">
                        SUFFICIENT
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-warning/10 text-warning border border-warning/20">
                        INSUFFICIENT DATA
                      </span>
                    )}
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
              ))
            )}
          </TableBody>
        </TableShell>
      </Card>
    </div>
  );
};
