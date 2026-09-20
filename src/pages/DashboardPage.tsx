import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Share2,
  Building,
  TrendingUp,
  ArrowRight,
  Info,
  CheckCircle2,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { StatusBadge } from '../components/ui/StatusBadge.tsx';
import { RiskBadge } from '../components/ui/RiskBadge.tsx';
import { TableShell, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/ui/TableShell.tsx';
import { Skeleton } from '../components/ui/Skeleton.tsx';

export interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [chartLoading, setChartLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'30D' | '90D' | '1Y'>('30D');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; value: number } | null>(null);

  const handleTimeframeChange = (tf: '30D' | '90D' | '1Y') => {
    setTimeframe(tf);
    setChartLoading(true);
    setTimeout(() => {
      setChartLoading(false);
    }, 450);
  };

  // Phase 1 Static Baseline Metrics (Explicitly flagged as demo/static to adhere to integrity rules)
  const kpis = [
    { label: 'Total Safety Reports', value: '1,428', delta: '+12% vs last month', icon: <FileText className="w-5 h-5 text-primary" /> },
    { label: 'SIF Precursors Detected', value: '84', delta: '5.8% SIF Rate', icon: <AlertTriangle className="w-5 h-5 text-danger" /> },
    { label: 'Critical Priority Queue', value: '18', delta: '6 require review today', icon: <Flame className="w-5 h-5 text-warning" /> },
    { label: 'Open Corrective Actions', value: '42', delta: '8 overdue', icon: <ShieldCheck className="w-5 h-5 text-info" /> },
    { label: 'Active Precursor Patterns', value: '7', delta: '2 new clusters this week', icon: <Share2 className="w-5 h-5 text-primary" /> },
    { label: 'Operational Sites Monitored', value: '14', delta: '100% telemetry synced', icon: <Building className="w-5 h-5 text-muted-foreground" /> },
  ];

  // Static sample records for Phase 1 table shell
  const sampleReports = [
    { id: 'REP-2026-0891', date: '2026-09-18', site: 'Digboi Central Rig #4', activity: 'High Pressure Line Testing', type: 'Near-Miss', risk: 'SIF_POTENTIAL', status: 'Under Review' },
    { id: 'REP-2026-0889', date: '2026-09-18', site: 'Duliajan Gas Gathering', activity: 'Confined Space Entry', type: 'Unsafe Condition', risk: 'HIGH', status: 'Unreviewed' },
    { id: 'REP-2026-0885', date: '2026-09-17', site: 'Numaligarh Terminus', activity: 'Scaffold Disassembly', type: 'Unsafe Act', risk: 'SIF_POTENTIAL', status: 'Verified SIF' },
    { id: 'REP-2026-0880', date: '2026-09-17', site: 'Moran Drilling Site A', activity: 'Heavy Pipe Rigging', type: 'Near-Miss', risk: 'HIGH', status: 'Action Assigned' },
    { id: 'REP-2026-0876', date: '2026-09-16', site: 'Digboi Workshop #2', activity: 'Tool Grinding & Cutting', type: 'Unsafe Act', risk: 'NON_SIF', status: 'Overridden Non-SIF' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Executive Safety Intelligence Dashboard"
        subtitle="Operational overview of SIF precursors, IOGP safety rule mapping, and multi-site risk prioritization."
        badge={<Badge variant="primary" size="sm">Operational Intelligence</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Calendar className="w-3.5 h-3.5" />}
            >
              Last 30 Days
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('/evaluate')}
            >
              + Evaluate Report
            </Button>
          </div>
        }
      />

      {/* Dataset & Integrity Boundary Banner */}
      <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Demonstration Dataset & Offline Operational Mode:</span>{' '}
          All baseline telemetry and incident reports currently displayed are structured sample records for system validation and demonstration. Real-time enterprise feeds require connected API endpoints and valid enterprise credentials.
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} interactive className="group">
            <CardContent className="flex items-start justify-between p-5">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground font-display tracking-tight tabular-nums group-hover:text-primary transition-colors">
                  {kpi.value}
                </h3>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium pt-0.5">
                  <TrendingUp className="w-3 h-3 text-primary shrink-0" />
                  <span>{kpi.delta}</span>
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface-muted border border-border group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-200">
                {kpi.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Middle Row: Analytics / Chart Containers Placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SIF Precursor Trend Shell */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>SIF Precursor Trend & Early Warnings</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Historical incident precursor velocity across monitored sites</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border bg-surface-muted/50 p-0.5 text-xs">
                {(['30D', '90D', '1Y'] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => handleTimeframeChange(tf)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all duration-150 cursor-pointer ${
                      timeframe === tf
                        ? 'bg-white dark:bg-surface text-primary shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label="Refresh trend data"
                onClick={() => handleTimeframeChange(timeframe)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-all duration-150 cursor-pointer"
                title="Reload simulation"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${chartLoading ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              /* Enterprise Skeleton Loader */
              <div className="h-60 flex flex-col justify-between py-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex-1 flex items-end gap-3 pt-4">
                  <Skeleton className="h-28 flex-1" />
                  <Skeleton className="h-36 flex-1" />
                  <Skeleton className="h-20 flex-1" />
                  <Skeleton className="h-44 flex-1" />
                  <Skeleton className="h-32 flex-1" />
                  <Skeleton className="h-48 flex-1" />
                  <Skeleton className="h-40 flex-1" />
                  <Skeleton className="h-52 flex-1" />
                </div>
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ) : (
              /* Enterprise SVG Line Chart with reveal drawing animation */
              <div className="relative h-60 w-full flex flex-col justify-between">
                {/* Metric Summary Header */}
                <div className="flex items-center justify-between text-xs pb-2 border-b border-border/40">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                      SIF Precursor Density
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                      Baseline Target
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-primary">
                    Avg: 2.8 Precursors / Day
                  </span>
                </div>

                {/* SVG Visual Graphic Canvas */}
                <div className="relative flex-1 w-full mt-2">
                  <svg
                    viewBox="0 0 500 140"
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible"
                  >
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284C7" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0EA5E9" />
                        <stop offset="100%" stopColor="#0284C7" />
                      </linearGradient>
                    </defs>

                    {/* Subtle Horizontal Grid lines */}
                    <line x1="0" y1="20" x2="500" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" className="dark:stroke-slate-700/60" />
                    <line x1="0" y1="60" x2="500" y2="60" stroke="#E2E8F0" strokeDasharray="3 3" className="dark:stroke-slate-700/60" />
                    <line x1="0" y1="100" x2="500" y2="100" stroke="#E2E8F0" strokeDasharray="3 3" className="dark:stroke-slate-700/60" />

                    {/* Baseline dashed benchmark line */}
                    <path
                      d="M 10,75 L 490,75"
                      stroke="#94A3B8"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      fill="none"
                      opacity="0.6"
                    />

                    {/* Gradient Area under curve */}
                    <path
                      d="M 10,120 L 10,95 C 60,105 100,70 150,85 C 200,100 240,40 290,55 C 340,70 380,30 430,38 C 460,42 480,25 490,20 L 490,120 Z"
                      fill="url(#areaGradient)"
                    />

                    {/* Primary Animated Line */}
                    <path
                      d="M 10,95 C 60,105 100,70 150,85 C 200,100 240,40 290,55 C 340,70 380,30 430,38 C 460,42 480,25 490,20"
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="animate-line-draw"
                    />

                    {/* Highlight Interactive Data Dots */}
                    {[
                      { cx: 10, cy: 95, label: 'Wk 1', val: 12 },
                      { cx: 150, cy: 85, label: 'Wk 2', val: 15 },
                      { cx: 290, cy: 55, label: 'Wk 3', val: 24 },
                      { cx: 430, cy: 38, label: 'Wk 4', val: 31 },
                      { cx: 490, cy: 20, label: 'Current', val: 36 },
                    ].map((pt, i) => (
                      <g key={i} className="cursor-pointer group">
                        <circle
                          cx={pt.cx}
                          cy={pt.cy}
                          r={hoveredPoint?.label === pt.label ? 6 : 4}
                          className="fill-white dark:fill-surface stroke-primary transition-all duration-200"
                          strokeWidth="2.5"
                          onMouseEnter={() => setHoveredPoint({ x: pt.cx, y: pt.cy, label: pt.label, value: pt.val })}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      </g>
                    ))}
                  </svg>

                  {/* Hover tooltip */}
                  {hoveredPoint && (
                    <div
                      className="absolute z-20 pointer-events-none -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded-md shadow-lg font-medium"
                    >
                      {hoveredPoint.label}: {hoveredPoint.value} SIF Precursors detected
                    </div>
                  )}
                </div>

                {/* X-Axis Date Labels */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 px-1 font-mono">
                  <span>Aug 21</span>
                  <span>Aug 28</span>
                  <span>Sep 04</span>
                  <span>Sep 11</span>
                  <span>Sep 18 (Today)</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top IOGP Rule Failures */}
        <Card>
          <CardHeader>
            <CardTitle>IOGP Rule Vulnerability</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Precursor frequency by safety domain</p>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {[
              { rule: 'Line of Fire', count: 34, percentage: 85, color: 'bg-danger' },
              { rule: 'Energy Isolation (LOTO)', count: 22, percentage: 55, color: 'bg-warning' },
              { rule: 'Working at Height', count: 18, percentage: 45, color: 'bg-primary' },
              { rule: 'Confined Space Entry', count: 10, percentage: 25, color: 'bg-info' },
            ].map((item, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{item.rule}</span>
                  <span className="text-muted-foreground font-mono">{item.count} reports</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs text-primary"
                onClick={() => onNavigate('/rules')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                iconPosition="right"
              >
                Browse all IOGP Life-Saving Rules
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Triage Reports Table Shell */}
      <Card>
        <CardHeader className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Recent Reports Awaiting Review</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Prioritized intake stream from field safety observations</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/reports')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
            iconPosition="right"
          >
            View All Reports
          </Button>
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
                <TableHeaderCell>Risk Assessment</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="text-right">Action</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {sampleReports.map((rep) => (
                <TableRow
                  key={rep.id}
                  className="cursor-pointer group"
                  onClick={() => onNavigate(`/reports/${rep.id}`)}
                >
                  <TableCell>
                    <span className="font-mono text-xs font-semibold text-primary bg-primary/10 border border-primary/15 px-2 py-0.5 rounded-md">
                      {rep.id}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{rep.date}</TableCell>
                  <TableCell className="font-semibold text-foreground">{rep.site}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" size="sm">{rep.type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[180px]">{rep.activity}</TableCell>
                  <TableCell>
                    <RiskBadge level={rep.risk} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={rep.status as any} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(`/reports/${rep.id}`);
                      }}
                      className="group-hover:text-primary transition-colors"
                    >
                      Inspect
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableShell>
        </div>
      </Card>
    </div>
  );
};
