import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, RotateCw, Filter, Calendar, Info } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { RiskBadge } from '../components/ui/RiskBadge.tsx';
import { TableShell, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/TableShell.tsx';
import { SiteRiskAggregation } from '../types/index.ts';

export interface SiteRiskPageProps {
  onNavigate: (path: string) => void;
}

export const SiteRiskPage: React.FC<SiteRiskPageProps> = ({ onNavigate }) => {
  const [windowPreset, setWindowPreset] = useState<string>('all');
  const [sites, setSites] = useState<SiteRiskAggregation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSites = (preset: string) => {
    setLoading(true);
    fetch(`/api/v1/risk/aggregations/sites?window_preset=${preset}`)
      .then((res) => res.json())
      .then((data: SiteRiskAggregation[]) => {
        setSites(data);
      })
      .catch((err) => console.warn('[SUCHAK] Failed to load site risk aggregations:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSites(windowPreset);
  }, [windowPreset]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Site SIF Precursor Prioritization"
        subtitle="Comparative precursor concentration and operational site risk indexing across operating assets."
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
              Filter by Site
            </Button>
          </div>
        }
      />

      {/* Disclaimers & Methodology Header */}
      <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-border text-xs flex items-start gap-2.5 text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Prototype Prioritization Foundation:</span> SIF Precursor Density represents the ratio of verified SIF precursor observations to total sample size. Sites with fewer than 5 records are explicitly flagged as <em>INSUFFICIENT DATA</em> to prevent sample-size distortion. This is a prototype prioritization index, not an official OIL formula.
        </div>
      </div>

      <Card>
        <TableShell className="border-0">
          <TableHead>
            <tr>
              <TableHeaderCell>Operational Asset</TableHeaderCell>
              <TableHeaderCell>Facility Type</TableHeaderCell>
              <TableHeaderCell>Sample Size</TableHeaderCell>
              <TableHeaderCell>SIF Precursor Logs</TableHeaderCell>
              <TableHeaderCell>SIF Precursor Density</TableHeaderCell>
              <TableHeaderCell>Priority Category</TableHeaderCell>
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
                    Calculating site precursor density across {windowPreset} window...
                  </div>
                </TableCell>
              </TableRow>
            ) : sites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                  No site safety reports recorded for this time window.
                </TableCell>
              </TableRow>
            ) : (
              sites.map((s) => (
                <TableRow key={s.site_id}>
                  <TableCell className="font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div>
                      <div>{s.site_name}</div>
                      <span className="text-[10px] text-muted-foreground font-mono">{s.site_code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{s.site_type.replace('_', ' ')}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {s.sample_count} <span className="text-muted-foreground">reports</span>
                  </TableCell>
                  <TableCell className="font-mono text-danger font-semibold text-xs">
                    {s.sif_reports}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold">{s.sif_precursor_density_pct}%</span>
                      <div className="w-16 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                        <div
                          className={`h-full ${
                            s.sif_precursor_density_pct >= 25
                              ? 'bg-danger'
                              : s.sif_precursor_density_pct >= 10
                              ? 'bg-warning'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(100, s.sif_precursor_density_pct)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RiskBadge level={s.dominant_priority} />
                  </TableCell>
                  <TableCell>
                    {s.sample_sufficiency === 'SUFFICIENT' ? (
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
