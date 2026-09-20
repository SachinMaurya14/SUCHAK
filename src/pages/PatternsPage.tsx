import React, { useState, useEffect } from 'react';
import {
  Share2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  MapPin,
  Activity,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { PatternStatusBadge } from '../components/patterns/PatternStatusBadge.tsx';
import { PatternStrengthIndicator } from '../components/patterns/PatternStrengthIndicator.tsx';
import { PatternDetailModal } from '../components/patterns/PatternDetailModal.tsx';
import { PrecursorPattern, PatternStatus, PatternSummaryKPIs } from '../types/index.ts';

export interface PatternsPageProps {
  onNavigate: (path: string) => void;
}

export const PatternsPage: React.FC<PatternsPageProps> = ({ onNavigate }) => {
  const [patterns, setPatterns] = useState<PrecursorPattern[]>([]);
  const [summary, setSummary] = useState<PatternSummaryKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PatternStatus | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'pattern_strength' | 'support_count' | 'last_seen_at'>('pattern_strength');

  // Modal inspection
  const [selectedPattern, setSelectedPattern] = useState<PrecursorPattern | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPatterns = async () => {
    setLoading(true);
    setError(null);
    try {
      const [patternsRes, summaryRes] = await Promise.all([
        fetch('/api/v1/patterns?organization_id=oil-india-demo&limit=50'),
        fetch('/api/v1/patterns/summary?organization_id=oil-india-demo'),
      ]);

      if (!patternsRes.ok || !summaryRes.ok) {
        throw new Error('Failed to load precursor patterns data.');
      }

      const patternsData = await patternsRes.json();
      const summaryData = await summaryRes.json();

      setPatterns(patternsData.patterns || []);
      setSummary(summaryData);
    } catch (err: any) {
      console.error('[PatternsPage] Fetch error:', err);
      setError(err.message || 'Error communicating with pattern discovery engine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  const handleRunDiscovery = async () => {
    setDiscovering(true);
    try {
      const res = await fetch('/api/v1/patterns/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: 'oil-india-demo', min_support: 3 }),
      });
      if (!res.ok) throw new Error('Discovery execution failed.');
      await fetchPatterns();
    } catch (err: any) {
      alert(err.message || 'Discovery run failed');
    } finally {
      setDiscovering(false);
    }
  };

  const handleRebuild = async () => {
    if (!confirm('Rebuild patterns will re-cluster all eligible reports into a fresh active version. Proceed?')) {
      return;
    }
    setRebuilding(true);
    try {
      const res = await fetch('/api/v1/patterns/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: 'oil-india-demo', min_support: 3 }),
      });
      if (!res.ok) throw new Error('Pattern rebuild failed.');
      await fetchPatterns();
    } catch (err: any) {
      alert(err.message || 'Rebuild failed');
    } finally {
      setRebuilding(false);
    }
  };

  // Filter & Sort Logic
  const filteredPatterns = patterns
    .filter((p) => {
      if (selectedStatus !== 'ALL' && p.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.primary_precursor.toLowerCase().includes(q) ||
          p.primary_barrier_failure.toLowerCase().includes(q) ||
          p.pattern_number.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'pattern_strength') return b.pattern_strength - a.pattern_strength;
      if (sortBy === 'support_count') return b.support_count - a.support_count;
      if (sortBy === 'last_seen_at') {
        return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
      }
      return 0;
    });

  const formatDate = (dStr: string) => {
    try {
      return new Date(dStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <PageHeader
        title="Recurring Precursor Patterns"
        subtitle="Precursor Pattern Discovery & Systemic Safety Barrier Intelligence across field operations."
        badge={<Badge variant="primary" size="sm">Pattern Discovery Engine</Badge>}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunDiscovery}
              disabled={discovering || loading}
              icon={<Play className={`w-3.5 h-3.5 ${discovering ? 'animate-spin' : ''}`} />}
            >
              {discovering ? 'Discovering...' : 'Run Discovery'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRebuild}
              disabled={rebuilding || loading}
              icon={<RotateCcw className={`w-3.5 h-3.5 ${rebuilding ? 'animate-spin' : ''}`} />}
            >
              {rebuilding ? 'Rebuilding...' : 'Rebuild'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('/reports')}
            >
              All Reports
            </Button>
          </div>
        }
      />

      {/* Critical Methodology & Scope Disclaimer */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-foreground flex items-start gap-3">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <span className="font-semibold block text-primary">
            Methodology Notice: Precursor Pattern Discovery ≠ SIF Risk Prioritization ≠ Similarity Search
          </span>
          <p className="text-muted-foreground text-[11px]">
            Pattern discovery identifies <strong>multi-observation systemic precursor patterns</strong> supported by multiple field reports over time.
            Pattern Strength reflects cross-report evidence volume and vector centroid cohesion. It does <strong>NOT</strong> represent accident probability or SIF fatality risk.
          </p>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Total Discovered</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold font-mono text-foreground">{summary.total_patterns}</span>
              <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                {summary.active_version_id}
              </Badge>
            </div>
          </Card>

          <Card className="p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Recurring</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {summary.recurring_patterns}
              </span>
              <span className="text-[10px] text-muted-foreground">Historical</span>
            </div>
          </Card>

          <Card className="p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Emerging</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {summary.emerging_patterns}
              </span>
              <span className="text-[10px] text-muted-foreground">Recent</span>
            </div>
          </Card>

          <Card className="p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Persistent</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {summary.persistent_patterns}
              </span>
              <span className="text-[10px] text-muted-foreground">&gt;60 Days</span>
            </div>
          </Card>

          <Card className="p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Avg Strength</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold font-mono text-foreground">
                {summary.average_pattern_strength}
                <span className="text-xs text-muted-foreground font-normal">/100</span>
              </span>
              <span className="text-[10px] text-muted-foreground">Evidence</span>
            </div>
          </Card>

          <Card className="p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Tracked Precursors</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold font-mono text-foreground">
                {summary.distinct_precursors_tracked}
              </span>
              <span className="text-[10px] text-muted-foreground">Categories</span>
            </div>
          </Card>
        </div>
      )}

      {/* Filter & Control Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patterns by title, precursor, barrier failure, or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-muted/40 border border-border text-xs rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="pattern_strength">Highest Pattern Strength</option>
              <option value="support_count">Most Supporting Reports</option>
              <option value="last_seen_at">Most Recently Observed</option>
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-border-subtle mt-3 text-xs">
          <span className="text-muted-foreground text-[11px] mr-1 shrink-0">Status:</span>
          {(['ALL', 'RECURRING', 'EMERGING', 'PERSISTENT', 'INACTIVE', 'INSUFFICIENT_SUPPORT'] as const).map(
            (st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  selectedStatus === st
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                {st === 'ALL'
                  ? 'All Patterns'
                  : st === 'INSUFFICIENT_SUPPORT'
                  ? 'Insufficient Support'
                  : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            )
          )}
        </div>
      </Card>

      {/* Main Pattern Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-xs gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          <span>Loading recurring precursor patterns...</span>
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-xs space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="font-semibold text-rose-600">{error}</p>
          <Button size="sm" variant="outline" onClick={fetchPatterns}>
            Retry
          </Button>
        </Card>
      ) : filteredPatterns.length === 0 ? (
        <Card className="p-8 text-center text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">No patterns match your search filter.</p>
          <p>Try clearing your search query or selecting "All Patterns".</p>
          <Button size="sm" variant="outline" onClick={() => { setSearchQuery(''); setSelectedStatus('ALL'); }}>
            Reset Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatterns.map((p) => (
            <Card
              key={p.id}
              className="flex flex-col justify-between hover:border-primary/50 transition-all duration-150 shadow-sm hover:shadow group"
            >
              <div>
                <CardHeader className="flex items-start justify-between pb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                        {p.pattern_number}
                      </span>
                      <PatternStatusBadge status={p.status} size="sm" />
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground leading-snug pt-1">
                      {p.title}
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {p.summary}
                  </p>

                  {/* Pattern Strength Gauge */}
                  <div className="p-2.5 rounded-lg bg-muted/20 border border-border-subtle">
                    <PatternStrengthIndicator score={p.pattern_strength} size="sm" />
                  </div>

                  {/* Supporting Observation Summary Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border-subtle">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Reports</span>
                      <span className="font-mono font-bold text-foreground">
                        {p.support_count}{' '}
                        <span className="font-normal text-[10px] text-muted-foreground">
                          ({p.unique_date_count} dates)
                        </span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Observation Span</span>
                      <span className="text-[11px] font-medium text-foreground block truncate">
                        {formatDate(p.last_seen_at)}
                      </span>
                    </div>
                  </div>

                  {/* Structured Precursor & Barrier Labels */}
                  <div className="space-y-1 text-xs pt-2 border-t border-border-subtle">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-muted-foreground text-[11px] shrink-0">Precursor:</span>
                      <span className="font-medium text-right text-foreground text-[11px] truncate">
                        {p.primary_precursor}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-muted-foreground text-[11px] shrink-0">Barrier Defect:</span>
                      <span className="font-medium text-right text-rose-600 dark:text-rose-400 text-[11px] truncate">
                        {p.primary_barrier_failure}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Action Button */}
              <div className="p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between group-hover:bg-primary/5 transition-colors"
                  onClick={() => {
                    setSelectedPattern(p);
                    setIsModalOpen(true);
                  }}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  iconPosition="right"
                >
                  Inspect Pattern Evidence ({p.support_count})
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pattern Detail Inspection Modal */}
      <PatternDetailModal
        pattern={selectedPattern}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNavigateReport={(repId) => onNavigate(`/reports/${repId}`)}
      />
    </div>
  );
};
