import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Download,
  Calendar,
  RefreshCw,
  Info,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Skeleton } from '../components/ui/Skeleton.tsx';

export interface AnalyticsPageProps {
  onNavigate: (path: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'drilling' | 'production'>('all');

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Safety Intelligence Analytics"
        subtitle="Multi-dimensional aggregate analytics, leading indicators, and SIF precursor distribution metrics."
        badge={<Badge variant="primary" size="sm">Executive Analytics</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('/exports')}
            >
              Export Analytics
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leading vs Lagging Precursor Ratios */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Leading vs Lagging Precursor Ratios</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Proactive barrier failure capture vs post-incident reporting
              </p>
            </div>
            <Badge variant="success" size="sm">78% Leading Health</Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-68 flex flex-col justify-between py-2 space-y-4">
                <div className="flex items-center justify-center py-4">
                  <Skeleton className="w-36 h-36 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* SVG Animated Circular Gauge & Ratio Breakdown */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                  {/* Circular Donut Visual with SVG animation */}
                  <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      {/* Background track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="stroke-slate-100 dark:stroke-slate-800"
                        strokeWidth="12"
                        fill="none"
                      />
                      {/* Lagging segment (22%) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="#F59E0B"
                        strokeWidth="12"
                        strokeDasharray="264"
                        strokeDashoffset="206"
                        fill="none"
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                      {/* Leading segment (78%) with smooth draw animation */}
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="#0284C7"
                        strokeWidth="12"
                        strokeDasharray="264"
                        strokeDashoffset="58"
                        fill="none"
                        strokeLinecap="round"
                        className="animate-donut-draw"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-bold text-foreground font-display">78%</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Leading</span>
                    </div>
                  </div>

                  {/* Precursor Category Distribution */}
                  <div className="flex-1 w-full space-y-2.5">
                    <div>
                      <div className="flex justify-between text-xs font-medium text-foreground mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                          Unsafe Conditions (Leading)
                        </span>
                        <span className="font-mono text-muted-foreground">42% (598)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-700 w-[42%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium text-foreground mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                          Near-Miss Reports (Leading)
                        </span>
                        <span className="font-mono text-muted-foreground">36% (514)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                        <div className="h-full bg-sky-400 rounded-full transition-all duration-700 w-[36%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium text-foreground mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                          Unsafe Acts (Lagging Focus)
                        </span>
                        <span className="font-mono text-muted-foreground">22% (316)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                        <div className="h-full bg-warning rounded-full transition-all duration-700 w-[22%]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Target Leading Ratio: &ge; 75.0%</span>
                  <span className="text-success font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Within HSE safety target
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Site-by-Site Exposure Heatmap */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Site-by-Site Exposure Ranking</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Precursor concentration and barrier degradation index
              </p>
            </div>
            <Badge variant="outline" size="sm">5 Monitored Assets</Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-68 flex flex-col justify-between py-2 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { site: 'Digboi Central Rig #4', activity: 'Drilling & Well Testing', score: 88, status: 'Critical', color: 'bg-danger text-danger-foreground', bar: 'bg-danger' },
                  { site: 'Moran Drilling Site A', activity: 'Heavy Lifting & Rigging', score: 64, status: 'High', color: 'bg-warning text-warning-foreground', bar: 'bg-warning' },
                  { site: 'Duliajan Gas Gathering', activity: 'Confined Space & Flange Work', score: 48, status: 'Moderate', color: 'bg-primary text-primary-foreground', bar: 'bg-primary' },
                  { site: 'Numaligarh Terminus', activity: 'Scaffold & Work at Height', score: 24, status: 'Low', color: 'bg-success text-success-foreground', bar: 'bg-success' },
                  { site: 'Sibsagar Storage Terminal', activity: 'Tank Cleaning & Transfer', score: 16, status: 'Low', color: 'bg-success text-success-foreground', bar: 'bg-success' },
                ].map((item, i) => (
                  <div
                    key={i}
                    onClick={() => onNavigate('/sites')}
                    className="p-2.5 rounded-lg border border-border bg-surface-muted/20 hover:bg-surface-muted hover:border-primary/30 transition-all duration-200 cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-foreground">{item.site}</span>
                        <span className="text-muted-foreground ml-2 text-[11px] hidden sm:inline">• {item.activity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">{item.score} / 100</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${item.color}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.bar} transition-all duration-700`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: IOGP Rule Precursor Distribution & Barrier Health Index */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>IOGP Life-Saving Rule Concordance</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Top rule violations detected by NLP precursor extraction
              </p>
            </div>
            <Badge variant="secondary" size="sm">9 Standard Rules</Badge>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {[
              { rule: 'Line of Fire', count: 184, share: 38, risk: 'High', color: 'bg-danger' },
              { rule: 'Working at Height', count: 112, share: 23, risk: 'High', color: 'bg-danger' },
              { rule: 'Energy Isolation (LOTO)', count: 78, share: 16, risk: 'Medium', color: 'bg-warning' },
              { rule: 'Safe Mechanical Lifting', count: 64, share: 13, risk: 'Medium', color: 'bg-warning' },
              { rule: 'Confined Space Entry', count: 48, share: 10, risk: 'Low', color: 'bg-primary' },
            ].map((r, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${r.color}`} />
                    {r.rule}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {r.share}% <span className="text-[11px]">({r.count} reports)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${r.color} transition-all duration-700`}
                    style={{ width: `${r.share * 2.5}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Critical Barrier Degradation Velocity</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Physical and operational barrier status over 30-day monitoring cycle
              </p>
            </div>
            <Badge variant="success" size="sm">Stable Defense Envelope</Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-border bg-surface-muted/30">
                <span className="text-[11px] text-muted-foreground uppercase font-bold block">Physical Restraints</span>
                <span className="text-lg font-bold text-foreground font-mono mt-1 block">94.2%</span>
                <span className="text-[10px] text-success font-medium flex items-center gap-1 mt-0.5">
                  <TrendingUp className="w-3 h-3" /> +1.8% vs last month
                </span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-surface-muted/30">
                <span className="text-[11px] text-muted-foreground uppercase font-bold block">Permit-to-Work Controls</span>
                <span className="text-lg font-bold text-foreground font-mono mt-1 block">91.6%</span>
                <span className="text-[10px] text-success font-medium flex items-center gap-1 mt-0.5">
                  <TrendingUp className="w-3 h-3" /> +0.4% vs last month
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5">
              <h5 className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                <span>SIF Early-Warning Outlook</span>
              </h5>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Aggregated early-warning indicators show high barrier resilience across Duliajan and Numaligarh sectors, with active surveillance recommended for high-pressure testing at Digboi Rig #4.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
