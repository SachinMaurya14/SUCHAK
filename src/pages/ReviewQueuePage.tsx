import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  Check,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { RiskBadge } from '../components/ui/RiskBadge.tsx';
import { StatusBadge } from '../components/ui/StatusBadge.tsx';
import {
  TableShell,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '../components/ui/TableShell.tsx';
import { reportService } from '../services/reportService.ts';
import { SafetyReport } from '../types/index.ts';

export interface ReviewQueuePageProps {
  onNavigate: (path: string) => void;
}

interface QueueItem {
  id: string;
  reportNumber: string;
  date: string;
  site: string;
  activity: string;
  precursor: string;
  aiSifRank: string;
  rule: string;
  status: 'PENDING' | 'VERIFIED' | 'OVERRIDDEN';
}

export const ReviewQueuePage: React.FC<ReviewQueuePageProps> = ({ onNavigate }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'verified'>('pending');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const initialItems: QueueItem[] = [
    {
      id: 'REP-2026-0891',
      reportNumber: 'OIL-RPT-2026-0891',
      date: '2026-09-18 14:22',
      site: 'Digboi Central Asset',
      activity: 'High Pressure Line Testing',
      precursor: 'Barricade Breach & Missing Whip Check',
      aiSifRank: 'SIF_POTENTIAL',
      rule: 'Line of Fire',
      status: 'PENDING',
    },
    {
      id: 'REP-2026-0889',
      reportNumber: 'OIL-RPT-2026-0889',
      date: '2026-09-18 11:05',
      site: 'Duliajan Field Operations',
      activity: 'Confined Space Entry',
      precursor: 'Missing Pre-Entry Multi-Gas Sensor Certificate',
      aiSifRank: 'HIGH',
      rule: 'Confined Space',
      status: 'PENDING',
    },
    {
      id: 'REP-2026-0880',
      reportNumber: 'OIL-RPT-2026-0880',
      date: '2026-09-17 08:15',
      site: 'Moran Gathering Station',
      activity: 'Heavy Pipe Rigging',
      precursor: 'Slings Resting on Sharp Edges without Softeners',
      aiSifRank: 'HIGH',
      rule: 'Safe Mechanical Lifting',
      status: 'PENDING',
    },
    {
      id: 'REP-2026-0875',
      reportNumber: 'OIL-RPT-2026-0875',
      date: '2026-09-16 16:40',
      site: 'Numaligarh Terminal',
      activity: 'Scaffold Ingress',
      precursor: 'Unclipped Fall Arrest Lanyard at 6m Height',
      aiSifRank: 'SIF_POTENTIAL',
      rule: 'Working at Height',
      status: 'VERIFIED',
    },
  ];

  const loadQueue = async () => {
    setIsLoading(true);
    try {
      const res = await reportService.getReports({ limit: 20 });
      if (res && res.reports && res.reports.length > 0) {
        const mapped: QueueItem[] = res.reports.map((r: SafetyReport) => {
          const descLower = r.description.toLowerCase();
          const rule = descLower.includes('pressure') || descLower.includes('line of fire')
            ? 'Line of Fire'
            : descLower.includes('height')
            ? 'Working at Height'
            : descLower.includes('confined')
            ? 'Confined Space'
            : descLower.includes('energy') || descLower.includes('loto')
            ? 'Energy Isolation'
            : descLower.includes('lift') || descLower.includes('crane')
            ? 'Safe Mechanical Lifting'
            : 'Hot Work';

          const isSif = descLower.includes('pressure') || descLower.includes('height') || descLower.includes('confined') || descLower.includes('loto');

          return {
            id: r.id,
            reportNumber: r.id.length > 15 ? `OIL-RPT-${r.id.slice(0, 8).toUpperCase()}` : r.id,
            date: r.dateTime ? r.dateTime.slice(0, 16).replace('T', ' ') : '2026-09-18 10:00',
            site: r.siteName || 'Digboi Asset',
            activity: r.activity || 'Field Maintenance',
            precursor: r.description.length > 55 ? r.description.slice(0, 55) + '...' : r.description,
            aiSifRank: isSif ? 'SIF_POTENTIAL' : 'HIGH',
            rule: rule,
            status: r.reviewStatus === 'Verified SIF' ? 'VERIFIED' : 'PENDING',
          };
        });
        // Merge with initial mock ensuring we have rich test items
        const combined = [...mapped];
        initialItems.forEach((init) => {
          if (!combined.some((c) => c.id === init.id)) {
            combined.push(init);
          }
        });
        setItems(combined);
      } else {
        setItems(initialItems);
      }
    } catch {
      setItems(initialItems);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleAction = (id: string, newStatus: 'VERIFIED' | 'OVERRIDDEN') => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: newStatus } : it))
    );
  };

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'pending') return item.status === 'PENDING';
    if (activeFilter === 'verified') return item.status === 'VERIFIED';
    return true;
  });

  const pendingCount = items.filter((i) => i.status === 'PENDING').length;
  const verifiedCount = items.filter((i) => i.status === 'VERIFIED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="HSE Review & Verification Queue"
        subtitle="Human-in-the-loop triage queue: Verify, classify, or override automated SIF precursor detections."
        badge={
          <Badge variant={pendingCount > 0 ? 'warning' : 'success'} size="sm">
            {pendingCount} Pending Verification
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={loadQueue}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/reports')}
            >
              All Reports
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('/actions')}
            >
              Action Center
            </Button>
          </div>
        }
      />

      {/* Queue summary banner */}
      <div className="p-4 rounded-xl border border-warning/30 bg-warning/10 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/20 text-warning shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Active SIF Triage Window</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              High precursor scores require Safety Officer verification within 24 hours of submission to prevent severe life-threatening events.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" size="sm" className="font-mono">
            Target SLA: &lt; 24h
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle>Unverified High-Risk Observations</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review flagged precursor telemetry and confirm or de-escalate potential SIF classifications.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface-muted border border-border">
            <button
              type="button"
              onClick={() => setActiveFilter('pending')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeFilter === 'pending'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('verified')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeFilter === 'verified'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Verified ({verifiedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({items.length})
            </button>
          </div>
        </CardHeader>

        <TableShell className="border-0 rounded-none rounded-b-xl">
          <TableHead>
            <tr>
              <TableHeaderCell>Report ID</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Asset / Site</TableHeaderCell>
              <TableHeaderCell>Activity</TableHeaderCell>
              <TableHeaderCell>Primary Precursor Indicator</TableHeaderCell>
              <TableHeaderCell>SIF Potential</TableHeaderCell>
              <TableHeaderCell>IOGP Rule</TableHeaderCell>
              <TableHeaderCell className="text-right">Triage Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                  No observations in this queue filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-surface-muted/50 transition-colors">
                  <TableCell className="font-mono font-semibold text-primary">
                    {item.reportNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                    {item.date}
                  </TableCell>
                  <TableCell className="font-medium text-xs">{item.site}</TableCell>
                  <TableCell className="text-foreground text-xs">{item.activity}</TableCell>
                  <TableCell className="text-danger font-medium max-w-[220px] truncate text-xs">
                    {item.precursor}
                  </TableCell>
                  <TableCell>
                    <RiskBadge level={item.aiSifRank as any} />
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-foreground text-xs">{item.rule}</span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate(`/reports/${item.id}`)}
                        icon={<Eye className="w-3 h-3" />}
                      >
                        Inspect
                      </Button>

                      {item.status === 'VERIFIED' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success px-2 py-1 bg-success/10 rounded-md border border-success/20">
                          <Check className="w-3 h-3" />
                          Verified SIF
                        </span>
                      ) : item.status === 'OVERRIDDEN' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground px-2 py-1 bg-surface-muted rounded-md border border-border">
                          De-escalated
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAction(item.id, 'VERIFIED')}
                            icon={<CheckCircle className="w-3 h-3" />}
                          >
                            Verify SIF
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(item.id, 'OVERRIDDEN')}
                            title="De-escalate / Not SIF"
                          >
                            De-escalate
                          </Button>
                        </div>
                      )}
                    </div>
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
