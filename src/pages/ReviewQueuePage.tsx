import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Flame,
  UserCheck,
  RotateCcw,
  HelpCircle,
  XCircle,
  FileCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import {
  TableShell,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '../components/ui/TableShell.tsx';
import { reviewService } from '../services/reviewService.ts';
import {
  ClientReviewQueueItem,
  ClientReviewSummaryKPIs,
  ClientReviewStatus,
} from '../types/review.ts';
import { ReviewStatusBadge } from '../components/review/ReviewStatusBadge.tsx';
import { ReviewWorkspaceModal } from '../components/review/ReviewWorkspaceModal.tsx';

export interface ReviewQueuePageProps {
  onNavigate: (path: string) => void;
}

const ELIGIBILITY_REASON_LABELS: Record<string, string> = {
  SIF_UNCERTAIN: 'SIF Uncertain',
  INSUFFICIENT_EVIDENCE: 'Low AI Confidence (<72%)',
  NEEDS_REVIEW_CLASSIFICATION: 'Flagged Needs Review',
  IOGP_MAPPING_UNCERTAIN: 'IOGP Rule Uncertain',
  SAFETY_INTELLIGENCE_UNKNOWN: 'Taxonomy Ambiguity',
  RISK_FLAGGED_FOR_REVIEW: 'High Risk Priority (Phase 6)',
  PATTERN_ASSOCIATION_UNCERTAIN: 'Recurring Pattern Check',
  MANUAL_REVIEW_REQUESTED: 'Manual HSE Triage',
  SOURCE_DATA_CHANGED: 'Underlying Report Edited',
};

export const ReviewQueuePage: React.FC<ReviewQueuePageProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<ClientReviewSummaryKPIs | null>(null);
  const [reviews, setReviews] = useState<ClientReviewQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_ALL');
  const [assignedFilter, setAssignedFilter] = useState<string>('ALL');
  const [sifFilter, setSifFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('oldest_pending');

  // Active Review Workspace Modal
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter, assignedFilter, sifFilter, sortBy, page]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [sumRes, queueRes] = await Promise.all([
        reviewService.getSummary(),
        reviewService.getReviews({
          status: statusFilter,
          assigned_to: assignedFilter,
          sif_classification: sifFilter === 'ALL' ? undefined : sifFilter,
          search_query: searchQuery.trim() || undefined,
          sort_by: sortBy,
          page,
          limit,
        }),
      ]);
      setSummary(sumRes);
      setReviews(queueRes.reviews || []);
      setTotal(queueRes.total || 0);
      setTotalPages(queueRes.total_pages || 1);
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadData();
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <PageHeader
        title="Phase 9: Human HSE Review & Verification Queue"
        subtitle="Operational human-in-the-loop validation: review AI-proposed SIF classifications, verify barrier controls, and authorize enterprise safety intelligence."
        badge={
          <Badge variant={summary && summary.pending > 0 ? 'warning' : 'success'} size="sm">
            {summary?.pending || 0} Pending HSE Action
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={() => loadData()}
            >
              Refresh Queue
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('/patterns')}>
              Phase 8 Patterns
            </Button>
            <Button variant="primary" size="sm" onClick={() => onNavigate('/reports')}>
              All Incident Records
            </Button>
          </div>
        }
      />

      {/* Summary KPIs Row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total in Queue</span>
              <Clock className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {summary.total_in_queue}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Active review records</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-sm">
            <div className="flex items-center justify-between text-xs text-amber-300">
              <span>Pending Review</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {summary.pending}
            </div>
            <span className="text-[10px] text-amber-300/80 mt-1 block">Requires safety officer</span>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 shadow-sm">
            <div className="flex items-center justify-between text-xs text-sky-300">
              <span>In Review</span>
              <UserCheck className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
              {summary.in_review + summary.assigned}
            </div>
            <span className="text-[10px] text-sky-300/80 mt-1 block">Under active investigation</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
            <div className="flex items-center justify-between text-xs text-emerald-300">
              <span>Human Confirmed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {summary.confirmed}
            </div>
            <span className="text-[10px] text-emerald-300/80 mt-1 block">Verified SIF intelligence</span>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 shadow-sm">
            <div className="flex items-center justify-between text-xs text-teal-300">
              <span>Human Corrected</span>
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-teal-400 mt-1">
              {summary.corrected}
            </div>
            <span className="text-[10px] text-teal-300/80 mt-1 block">Overridden & refined</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Avg Review SLA</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {summary.average_review_age_hours}h
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Queue turnaround time</span>
          </div>
        </div>
      )}

      {/* Primary Queue Container */}
      <Card>
        <CardHeader className="flex flex-col space-y-4 pb-4 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                HSE Review Queue
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every record flagged with SIF potential or taxonomic uncertainty must receive certified human review before updating enterprise safety records.
              </p>
            </div>

            {/* Assignment Filter */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface-muted border border-border text-xs">
              <button
                type="button"
                onClick={() => {
                  setAssignedFilter('ALL');
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  assignedFilter === 'ALL'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Assignments
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignedFilter('ME');
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  assignedFilter === 'ME'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Assigned to Me
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignedFilter('UNASSIGNED');
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  assignedFilter === 'UNASSIGNED'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Unassigned
              </button>
            </div>
          </div>

          {/* Status Tabs Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {[
                { id: 'PENDING_ALL', label: 'Pending / Actionable', count: summary?.pending },
                { id: 'IN_REVIEW', label: 'In Review', count: (summary?.in_review || 0) + (summary?.assigned || 0) },
                { id: 'COMPLETED', label: 'Completed (All)', count: summary?.completed },
                { id: 'REVIEW_CONFIRMED', label: 'Confirmed', count: summary?.confirmed },
                { id: 'REVIEW_CORRECTED', label: 'Corrected', count: summary?.corrected },
                { id: 'NEEDS_MORE_REVIEW', label: 'Needs Evidence', count: summary?.needs_more_review },
                { id: 'ALL', label: 'All Records', count: summary?.total_in_queue },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        statusFilter === tab.id
                          ? 'bg-slate-950/20 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* SIF Filter & Sorting */}
            <div className="flex items-center gap-2">
              <select
                id="select-sif-filter"
                value={sifFilter}
                onChange={(e) => {
                  setSifFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All SIF Classes</option>
                <option value="SIF_POTENTIAL">SIF Potential Only</option>
                <option value="NEEDS_REVIEW">Needs Review Only</option>
                <option value="NON_SIF_POTENTIAL">Non-SIF Only</option>
              </select>

              <select
                id="select-sort-by"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="oldest_pending">Sort: SLA First (Oldest)</option>
                <option value="priority">Sort: Risk Priority Score</option>
                <option value="newest_report">Sort: Newest First</option>
                <option value="recently_updated">Sort: Recently Updated</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              id="input-search-reviews"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Report ID, Site, Activity, Narrative, or Reviewer..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-24 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1.5 px-2.5 py-1 rounded bg-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white"
            >
              Filter
            </button>
          </form>
        </CardHeader>

        {/* Table View */}
        <TableShell className="border-0 rounded-none rounded-b-xl">
          <TableHead>
            <tr>
              <TableHeaderCell>Report ID</TableHeaderCell>
              <TableHeaderCell>Asset / Site</TableHeaderCell>
              <TableHeaderCell>Precursor Narrative Excerpt</TableHeaderCell>
              <TableHeaderCell>Review Trigger Reasons</TableHeaderCell>
              <TableHeaderCell>AI SIF (Phase 4)</TableHeaderCell>
              <TableHeaderCell>Risk (Phase 6)</TableHeaderCell>
              <TableHeaderCell>Pattern (Phase 8)</TableHeaderCell>
              <TableHeaderCell>Review Age</TableHeaderCell>
              <TableHeaderCell>Review Status</TableHeaderCell>
              <TableHeaderCell className="text-right">Action</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-16 text-slate-400 text-xs">
                  <div className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p>Loading Review Queue Records...</p>
                </TableCell>
              </TableRow>
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-slate-400 text-xs">
                  No records match current filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((r) => (
                <TableRow
                  key={r.review_id}
                  className="hover:bg-slate-900/70 transition-colors border-b border-slate-800/80"
                >
                  <TableCell className="font-mono text-xs font-semibold text-amber-400 whitespace-nowrap">
                    <div>{r.report_number}</div>
                    <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                      {new Date(r.report_date).toLocaleDateString()}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs max-w-[160px]">
                    <div className="font-medium text-slate-200 truncate">{r.site_name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{r.activity_name}</div>
                  </TableCell>

                  <TableCell className="text-xs text-slate-300 max-w-[220px]">
                    <p className="line-clamp-2 leading-relaxed">{r.description_snippet}</p>
                  </TableCell>

                  <TableCell className="text-xs max-w-[180px]">
                    <div className="flex flex-wrap gap-1">
                      {r.eligibility_reasons.slice(0, 2).map((reason, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/20 whitespace-nowrap"
                        >
                          {ELIGIBILITY_REASON_LABELS[reason] || reason}
                        </span>
                      ))}
                      {r.eligibility_reasons.length > 2 && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          +{r.eligibility_reasons.length - 2} more
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs whitespace-nowrap">
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] border ${
                        r.ai_sif_classification === 'SIF_POTENTIAL'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : r.ai_sif_classification === 'NON_SIF_POTENTIAL'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {r.ai_sif_classification === 'SIF_POTENTIAL'
                        ? 'SIF Potential'
                        : r.ai_sif_classification === 'NON_SIF_POTENTIAL'
                        ? 'Non-SIF'
                        : 'Needs Review'}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      Conf: {Math.round(r.ai_confidence * 100)}%
                    </div>
                  </TableCell>

                  <TableCell className="text-xs whitespace-nowrap">
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        r.risk_priority_band === 'CRITICAL'
                          ? 'text-rose-400'
                          : r.risk_priority_band === 'HIGH'
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {r.risk_priority_band}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs max-w-[150px]">
                    {r.pattern_title ? (
                      <div className="flex items-center gap-1 text-[11px] text-rose-300 font-medium truncate">
                        <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate" title={r.pattern_title}>
                          {r.pattern_number}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[11px]">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-xs whitespace-nowrap text-slate-400 font-mono">
                    {r.review_age_hours}h
                  </TableCell>

                  <TableCell className="text-xs whitespace-nowrap">
                    <ReviewStatusBadge status={r.status} isStale={r.is_stale} size="sm" />
                    {r.assigned_to && (
                      <div className="text-[10px] text-slate-400 mt-1 truncate max-w-[120px]">
                        {r.assigned_to.name}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate(`/reports/${r.report_id}`)}
                        icon={<Eye className="w-3 h-3" />}
                        title="View Report"
                      >
                        Inspect
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setActiveReviewId(r.review_id)}
                        icon={<FileCheck className="w-3 h-3" />}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                      >
                        Review
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableShell>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
            <span>
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total records)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Review Workspace Modal */}
      {activeReviewId && (
        <ReviewWorkspaceModal
          reviewId={activeReviewId}
          isOpen={!!activeReviewId}
          onClose={() => setActiveReviewId(null)}
          onReviewUpdated={() => loadData()}
        />
      )}
    </div>
  );
};
