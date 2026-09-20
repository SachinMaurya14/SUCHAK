import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  ShieldAlert,
  CheckCheck,
  RotateCcw,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
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
import {
  ActionStatusBadge,
  ActionPriorityBadge,
  ActionTypeBadge,
} from '../components/actions/ActionStatusBadge.tsx';
import { CreateActionModal } from '../components/actions/CreateActionModal.tsx';
import { ActionDetailModal } from '../components/actions/ActionDetailModal.tsx';
import { actionService } from '../services/actionService.ts';
import {
  ActionRecord,
  ActionSummaryKPIs,
  ActionStatus,
  ActionPriority,
  ActionType,
} from '../types/action.ts';

export interface ActionCenterPageProps {
  onNavigate: (path: string) => void;
  onNavigateToReport?: (reportId: string) => void;
  onNavigateToPattern?: (patternId: string) => void;
}

type TabType = 'ALL' | 'MY_ACTIONS' | 'VERIFICATION_QUEUE' | 'OVERDUE' | 'PREVENTIVE' | 'CORRECTIVE';

export const ActionCenterPage: React.FC<ActionCenterPageProps> = ({
  onNavigate,
  onNavigateToReport,
  onNavigateToPattern,
}) => {
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [summary, setSummary] = useState<ActionSummaryKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sum, res] = await Promise.all([
        actionService.getSummary(),
        actionService.getActions({ page_size: 100 }),
      ]);
      setSummary(sum);
      setActions(res.data);
    } catch (err) {
      console.error('Failed to load Action Center data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActionCreated = (newAction: ActionRecord) => {
    setActions((prev) => [newAction, ...prev]);
    if (summary) {
      setSummary({
        ...summary,
        total_actions: summary.total_actions + 1,
        open_actions: newAction.status === 'OPEN' ? summary.open_actions + 1 : summary.open_actions,
        assigned_actions: newAction.status === 'ASSIGNED' ? summary.assigned_actions + 1 : summary.assigned_actions,
        corrective_count: newAction.action_type === 'CORRECTIVE' ? summary.corrective_count + 1 : summary.corrective_count,
        preventive_count: newAction.action_type === 'PREVENTIVE' ? summary.preventive_count + 1 : summary.preventive_count,
      });
    }
  };

  const handleActionUpdated = (updated: ActionRecord) => {
    setActions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    // Refresh summary in background to update KPI cards accurately
    actionService.getSummary().then(setSummary).catch(console.warn);
  };

  // Filter actions based on active tab and search/dropdown filters
  const filteredActions = useMemo(() => {
    return actions.filter((act) => {
      // Tab filter
      if (activeTab === 'MY_ACTIONS') {
        // Mock current user match
        const currentUserId = 'user-priyanka-02';
        if (act.owner_user_id !== currentUserId) return false;
      } else if (activeTab === 'VERIFICATION_QUEUE') {
        if (act.status !== 'VERIFICATION_REQUIRED') return false;
      } else if (activeTab === 'OVERDUE') {
        if (!act.is_overdue || act.status === 'CLOSED' || act.status === 'CANCELLED') return false;
      } else if (activeTab === 'PREVENTIVE') {
        if (act.action_type !== 'PREVENTIVE') return false;
      } else if (activeTab === 'CORRECTIVE') {
        if (act.action_type !== 'CORRECTIVE') return false;
      }

      // Dropdown status filter
      if (statusFilter !== 'ALL' && act.status !== statusFilter) return false;

      // Dropdown priority filter
      if (priorityFilter !== 'ALL' && act.priority !== priorityFilter) return false;

      // Dropdown type filter
      if (actionTypeFilter !== 'ALL' && act.action_type !== actionTypeFilter) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = act.action_number.toLowerCase().includes(q);
        const matchesTitle = act.title.toLowerCase().includes(q);
        const matchesDesc = act.description.toLowerCase().includes(q);
        const matchesOwner = (act.owner_user_name || '').toLowerCase().includes(q);
        const matchesSite = (act.site_name || '').toLowerCase().includes(q);
        const matchesActivity = (act.activity_name || '').toLowerCase().includes(q);
        const matchesReport = (act.source_report_number || '').toLowerCase().includes(q);
        const matchesPattern = (act.source_pattern_number || '').toLowerCase().includes(q);

        if (
          !matchesNum &&
          !matchesTitle &&
          !matchesDesc &&
          !matchesOwner &&
          !matchesSite &&
          !matchesActivity &&
          !matchesReport &&
          !matchesPattern
        ) {
          return false;
        }
      }

      return true;
    });
  }, [actions, activeTab, statusFilter, priorityFilter, actionTypeFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              HSE Action Center (Phase 10 CAPA)
            </h1>
            <Badge variant="primary" size="sm">
              Operational Phase 10
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Enterprise workflow for Corrective & Preventive Actions (CAPA), barrier remediations, independent physical verifications, and compliance sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 text-xs shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create HSE Action</span>
          </Button>
        </div>
      </div>

      {/* Workflow Sequence Traceability Banner */}
      <div className="px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground flex items-center gap-2 overflow-x-auto">
        <span className="font-semibold text-foreground shrink-0 flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-primary" />
          Pipeline Flow:
        </span>
        <div className="flex items-center gap-1.5 whitespace-nowrap text-[11px]">
          <span className="text-muted-foreground">Report</span>
          <span>→</span>
          <span className="text-muted-foreground">Phase 4 SIF</span>
          <span>→</span>
          <span className="text-muted-foreground">Phase 5 Intel</span>
          <span>→</span>
          <span className="text-muted-foreground">Phase 6 Risk</span>
          <span>→</span>
          <span className="text-muted-foreground">Phase 7 Sim</span>
          <span>→</span>
          <span className="text-muted-foreground">Phase 8 Patterns</span>
          <span>→</span>
          <span className="text-muted-foreground">Phase 9 Human Review</span>
          <span>→</span>
          <span className="font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
            Phase 10 Action Center
          </span>
          <span>→</span>
          <span className="text-foreground font-medium">Create Action → Assign → In Progress → Completed → Verification → Closed</span>
        </div>
      </div>

      {/* Key Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Total Actions
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-foreground">
              {summary?.total_actions ?? actions.length}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {summary?.corrective_count || 0} C / {summary?.preventive_count || 0} P
            </span>
          </div>
        </Card>

        <Card className="p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
            Open & Assigned
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {(summary?.open_actions || 0) + (summary?.assigned_actions || 0)}
            </span>
            <span className="text-[10px] text-muted-foreground">Pending Start</span>
          </div>
        </Card>

        <Card className="p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
            In Progress
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {summary?.in_progress_actions ?? 0}
            </span>
            <span className="text-[10px] text-muted-foreground">Active Work</span>
          </div>
        </Card>

        <Card
          className={`p-3.5 space-y-1 cursor-pointer transition-colors ${
            activeTab === 'VERIFICATION_QUEUE'
              ? 'border-purple-500 ring-1 ring-purple-500'
              : 'hover:border-purple-500/50'
          }`}
          onClick={() => setActiveTab('VERIFICATION_QUEUE')}
        >
          <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider block flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Verification Queue
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {summary?.verification_required_actions ?? 0}
            </span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
              Requires Sign-off
            </span>
          </div>
        </Card>

        <Card
          className={`p-3.5 space-y-1 cursor-pointer transition-colors ${
            activeTab === 'OVERDUE'
              ? 'border-rose-500 ring-1 ring-rose-500'
              : 'hover:border-rose-500/50'
          }`}
          onClick={() => setActiveTab('OVERDUE')}
        >
          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider block flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {summary?.overdue_actions ?? 0}
            </span>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
              Target Missed
            </span>
          </div>
        </Card>

        <Card className="p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
            Verified & Closed
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {(summary?.verified_actions || 0) + (summary?.closed_actions || 0)}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Satisfied</span>
          </div>
        </Card>
      </div>

      {/* Tabs & Filters */}
      <Card className="p-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Actions', count: actions.length },
            { id: 'MY_ACTIONS', label: 'My Assigned Actions' },
            {
              id: 'VERIFICATION_QUEUE',
              label: 'Verification Queue',
              count: summary?.verification_required_actions,
              badgeVariant: 'warning',
            },
            {
              id: 'OVERDUE',
              label: 'Overdue Actions',
              count: summary?.overdue_actions,
              badgeVariant: 'danger',
            },
            { id: 'PREVENTIVE', label: 'Preventive (Patterns)', count: summary?.preventive_count },
            { id: 'CORRECTIVE', label: 'Corrective (Findings)', count: summary?.corrective_count },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTab === tab.id
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : tab.badgeVariant === 'danger'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search action #, title, site, owner..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status Select */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open (Unassigned)</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="VERIFICATION_REQUIRED">Verification Required</option>
              <option value="VERIFIED">Verified</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Priority Select */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          {/* Action Type Select */}
          <div>
            <select
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Types</option>
              <option value="CORRECTIVE">Corrective (Report Finding)</option>
              <option value="PREVENTIVE">Preventive (Systemic Pattern)</option>
              <option value="CONTAINMENT">Containment</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Actions Data Table */}
      <Card>
        <TableShell className="border-0">
          <TableHead>
            <tr>
              <TableHeaderCell>Action Number</TableHeaderCell>
              <TableHeaderCell>Remediation Scope & Upstream Source</TableHeaderCell>
              <TableHeaderCell>Assigned Specialist & Team</TableHeaderCell>
              <TableHeaderCell>Site & Activity</TableHeaderCell>
              <TableHeaderCell>Priority</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Due Date</TableHeaderCell>
              <TableHeaderCell className="text-right">Action</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  Loading HSE actions and verification queue...
                </TableCell>
              </TableRow>
            ) : filteredActions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
                  <p className="text-sm font-medium text-foreground">No matching actions found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Adjust your filter criteria or create a new corrective action.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-3 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Create Action
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              filteredActions.map((act) => (
                <TableRow
                  key={act.id}
                  onClick={() => setSelectedActionId(act.id)}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  {/* Action Number & Type */}
                  <TableCell className="align-top py-3.5">
                    <div className="space-y-1">
                      <span className="font-mono text-xs font-bold text-primary block">
                        {act.action_number}
                      </span>
                      <ActionTypeBadge type={act.action_type} />
                    </div>
                  </TableCell>

                  {/* Title & Source Link */}
                  <TableCell className="align-top py-3.5 max-w-sm">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-foreground line-clamp-2">
                        {act.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {act.source_report_number && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onNavigateToReport && act.source_report_id) {
                                onNavigateToReport(act.source_report_id);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary hover:underline"
                          >
                            <span>Report: {act.source_report_number}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}

                        {act.source_pattern_number && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onNavigateToPattern && act.source_pattern_id) {
                                onNavigateToPattern(act.source_pattern_id);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:underline"
                          >
                            <span>Pattern: {act.source_pattern_number}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Assigned Specialist */}
                  <TableCell className="align-top py-3.5">
                    <div className="space-y-0.5 text-xs">
                      <p className="font-medium text-foreground">
                        {act.owner_user_name || (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {act.owner_team_name || 'HSE Remediation'}
                      </p>
                    </div>
                  </TableCell>

                  {/* Site & Activity */}
                  <TableCell className="align-top py-3.5 text-xs">
                    <div className="space-y-0.5">
                      <p className="text-foreground">{act.site_name || 'Enterprise'}</p>
                      {act.activity_name && (
                        <p className="text-[11px] text-muted-foreground">{act.activity_name}</p>
                      )}
                    </div>
                  </TableCell>

                  {/* Priority */}
                  <TableCell className="align-top py-3.5">
                    <ActionPriorityBadge priority={act.priority} />
                  </TableCell>

                  {/* Status */}
                  <TableCell className="align-top py-3.5">
                    <ActionStatusBadge status={act.status} isOverdue={act.is_overdue} />
                  </TableCell>

                  {/* Due Date */}
                  <TableCell className="align-top py-3.5 text-xs whitespace-nowrap">
                    <div className="space-y-0.5">
                      <p className="text-foreground">
                        {new Date(act.due_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      {act.is_overdue && act.status !== 'CLOSED' && act.status !== 'CANCELLED' && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                          {act.days_overdue}d overdue
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Manage Button */}
                  <TableCell className="align-top py-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedActionId(act.id);
                      }}
                      className="text-xs text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <span>Manage</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableShell>
      </Card>

      {/* Create Modal */}
      <CreateActionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onActionCreated={handleActionCreated}
      />

      {/* Detail & Workflow Management Modal */}
      <ActionDetailModal
        actionId={selectedActionId}
        isOpen={!!selectedActionId}
        onClose={() => setSelectedActionId(null)}
        onActionUpdated={handleActionUpdated}
        onNavigateToReport={onNavigateToReport}
        onNavigateToPattern={onNavigateToPattern}
      />
    </div>
  );
};
