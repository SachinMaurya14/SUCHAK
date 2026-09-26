import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  Flame,
  Share2,
  TrendingUp,
  ArrowRight,
  Plus,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { StatusBadge } from '../components/ui/StatusBadge.tsx';
import { RiskBadge } from '../components/ui/RiskBadge.tsx';
import {
  TableShell,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '../components/ui/TableShell.tsx';
import { reportService } from '../services/reportService.ts';

export interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(142);
  const [sifCount, setSifCount] = useState<number>(38);
  const [criticalCount, setCriticalCount] = useState<number>(18);
  const [patternCount, setPatternCount] = useState<number>(7);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ label: string; value: number } | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    Promise.allSettled([
      reportService.getReports({ limit: 6 }),
      fetch('/api/v1/patterns/summary?organization_id=oil-india-demo').then((r) => r.json()),
    ]).then(([reportsRes, patternsRes]) => {
      if (!active) return;
      if (reportsRes.status === 'fulfilled' && reportsRes.value.reports.length > 0) {
        setReports(reportsRes.value.reports);
        if (reportsRes.value.total) setTotalCount(reportsRes.value.total);
      } else {
        // Fallback sample reports
        setReports([
          {
            id: 'REP-2026-0891',
            dateTime: '2026-09-18 14:22',
            siteName: 'Digboi Central Rig #4',
            activity: 'High Pressure Line Testing',
            reportType: 'Near-Miss',
            risk: 'SIF_POTENTIAL',
            reviewStatus: 'Under Review',
          },
          {
            id: 'REP-2026-0889',
            dateTime: '2026-09-18 11:05',
            siteName: 'Duliajan Gas Gathering',
            activity: 'Confined Space Entry',
            reportType: 'Unsafe Condition',
            risk: 'HIGH',
            reviewStatus: 'Unreviewed',
          },
          {
            id: 'REP-2026-0885',
            dateTime: '2026-09-17 16:40',
            siteName: 'Numaligarh Terminus',
            activity: 'Scaffold Disassembly',
            reportType: 'Unsafe Act',
            risk: 'SIF_POTENTIAL',
            reviewStatus: 'Verified SIF',
          },
          {
            id: 'REP-2026-0880',
            dateTime: '2026-09-17 08:15',
            siteName: 'Moran Drilling Site A',
            activity: 'Heavy Pipe Rigging',
            reportType: 'Near-Miss',
            risk: 'HIGH',
            reviewStatus: 'Action Assigned',
          },
          {
            id: 'REP-2026-0876',
            dateTime: '2026-09-16 13:50',
            siteName: 'Digboi Workshop #2',
            activity: 'Tool Grinding & Cutting',
            reportType: 'Unsafe Act',
            risk: 'NON_SIF',
            reviewStatus: 'Overridden Non-SIF',
          },
        ]);
      }

      if (patternsRes.status === 'fulfilled' && patternsRes.value.total_patterns) {
        setPatternCount(patternsRes.value.total_patterns);
      }
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  // 4 Core KPIs requested by brief
  const coreKPIs = [
    {
      label: 'Total Reports',
      value: totalCount.toString(),
      delta: 'Field incident & observation intake',
      icon: <FileText className="w-5 h-5 text-primary" />,
    },
    {
      label: 'SIF Precursors',
      value: sifCount.toString(),
      delta: 'Serious injury & fatality precursors',
      icon: <AlertTriangle className="w-5 h-5 text-danger" />,
    },
    {
      label: 'High / Critical Priority',
      value: criticalCount.toString(),
      delta: 'Immediate barrier intervention',
      icon: <Flame className="w-5 h-5 text-amber-500" />,
    },
    {
      label: 'Active Patterns',
      value: patternCount.toString(),
      delta: 'Systemic cross-site clusters',
      icon: <Share2 className="w-5 h-5 text-indigo-500" />,
    },
  ];

  const trendPoints = [
    { cx: 20, cy: 110, label: 'Week 1', val: 8 },
    { cx: 160, cy: 95, label: 'Week 2', val: 14 },
    { cx: 300, cy: 65, label: 'Week 3', val: 22 },
    { cx: 440, cy: 45, label: 'Week 4', val: 31 },
    { cx: 580, cy: 25, label: 'Current Week', val: 38 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="HSE Safety Intelligence Dashboard"
        subtitle="Operational SIF precursor detection, barrier integrity monitoring, and risk prioritization."
        badge={<Badge variant="primary" size="sm">HSE Intelligence</Badge>}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('/evaluate')}
            icon={<Plus className="w-4 h-4" />}
          >
            Evaluate Report
          </Button>
        }
      />

      {/* 4 Core KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {coreKPIs.map((kpi, idx) => (
          <Card key={idx} elevated className="group hover:border-primary/40 transition-all">
            <CardContent className="flex items-start justify-between p-5">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {kpi.label}
                </p>
                <h3 className="text-3xl font-extrabold text-foreground font-display tracking-tight tabular-nums group-hover:text-primary transition-colors">
                  {kpi.value}
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium pt-0.5">
                  {kpi.delta}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface-muted border border-border group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                {kpi.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Precursor Trend & Velocity */}
      <Card elevated>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>SIF Precursor Trend</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Weekly trajectory of detected high-energy and barrier-compromise precursor signals.
            </p>
          </div>
          <Badge variant="danger" size="sm">
            Rising Precursor Velocity
          </Badge>
        </CardHeader>
        <CardContent className="pt-1 pb-3">
          <div className="relative pt-2 pb-1">
            <svg
              viewBox="0 0 600 140"
              className="w-full h-24 sm:h-26 overflow-visible select-none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="sif-trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284C7" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="120" x2="600" y2="120" stroke="currentColor" className="text-border/60" strokeDasharray="3 3" />
              <line x1="0" y1="80" x2="600" y2="80" stroke="currentColor" className="text-border/60" strokeDasharray="3 3" />
              <line x1="0" y1="40" x2="600" y2="40" stroke="currentColor" className="text-border/60" strokeDasharray="3 3" />

              {/* Area Under Curve */}
              <path
                d="M 20 110 L 160 95 L 300 65 L 440 45 L 580 25 L 580 125 L 20 125 Z"
                fill="url(#sif-trend-fill)"
              />

              {/* Trend Line */}
              <path
                d="M 20 110 L 160 95 L 300 65 L 440 45 L 580 25"
                fill="none"
                stroke="#0284C7"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {trendPoints.map((pt, i) => (
                <g key={i} className="cursor-pointer">
                  <circle
                    cx={pt.cx}
                    cy={pt.cy}
                    r={hoveredPoint?.label === pt.label ? 6 : 4.5}
                    className="fill-surface stroke-primary transition-all"
                    strokeWidth="2.5"
                    onMouseEnter={() => setHoveredPoint({ label: pt.label, value: pt.val })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              ))}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div className="absolute top-0 right-4 bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-md shadow-md font-semibold font-mono">
                {hoveredPoint.label}: {hoveredPoint.value} SIF Precursors
              </div>
            )}

            {/* X-axis labels */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 px-2 font-mono">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
              <span className="font-bold text-foreground">Current (Week 5)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports Table */}
      <Card elevated>
        <CardHeader className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Recent Field Reports</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest incoming safety observations and AI classification status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/reports')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              iconPosition="right"
            >
              View All Reports
            </Button>
          </div>
        </CardHeader>
        <div className="p-0">
          <TableShell className="border-0 rounded-none rounded-b-xl">
            <TableHead>
              <tr>
                <TableHeaderCell>Report ID</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Site Location</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Activity</TableHeaderCell>
                <TableHeaderCell>Risk Potential</TableHeaderCell>
                <TableHeaderCell>Review Status</TableHeaderCell>
                <TableHeaderCell className="text-right">Action</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {reports.map((rep) => {
                const reportId = rep.id || rep.report_number;
                const riskLevel =
                  rep.risk ||
                  (rep.latestAnalysis?.sif_potential
                    ? 'SIF_POTENTIAL'
                    : rep.latestAnalysis?.classification === 'NEEDS_REVIEW'
                    ? 'HIGH'
                    : 'MEDIUM');

                return (
                  <TableRow
                    key={reportId}
                    className="cursor-pointer group hover:bg-surface-muted/60 transition-colors"
                    onClick={() => onNavigate(`/reports/${reportId}`)}
                  >
                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-primary bg-primary/10 border border-primary/15 px-2 py-0.5 rounded-md">
                        {reportId}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {rep.dateTime || rep.report_datetime || '2026-09-18'}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-xs">
                      {rep.siteName || rep.site?.name || 'Operational Facility'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" size="sm">
                        {rep.reportType || rep.report_type || 'Observation'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[200px] text-xs">
                      {rep.activity || rep.activity?.name || 'Field Operation'}
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={riskLevel} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={(rep.reviewStatus || rep.review_status || 'Under Review') as any} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(`/reports/${reportId}`);
                        }}
                        className="group-hover:text-primary transition-colors text-xs"
                      >
                        Inspect →
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableShell>
        </div>
      </Card>
    </div>
  );
};
