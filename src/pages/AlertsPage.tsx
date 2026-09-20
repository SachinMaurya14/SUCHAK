import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Sliders,
  Shield,
  Layers,
  ExternalLink,
  Info,
  Clock,
  Send,
  ArrowUpRight,
  Eye,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Alert, AlertSeverity, AlertStatus, AlertCategory, AlertMetrics } from '../types/alert.ts';
import { alertService } from '../services/alertService.ts';
import { AlertSeverityBadge } from '../components/alerts/AlertSeverityBadge.tsx';
import { AlertStatusBadge } from '../components/alerts/AlertStatusBadge.tsx';
import { AlertDetailModal } from '../components/alerts/AlertDetailModal.tsx';
import { AlertRulesDrawer } from '../components/alerts/AlertRulesDrawer.tsx';
import { AlertPreferencesModal } from '../components/alerts/AlertPreferencesModal.tsx';

export interface AlertsPageProps {
  onNavigate: (path: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onNavigate }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metrics, setMetrics] = useState<AlertMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [alertsRes, metricsRes] = await Promise.all([
        alertService.getAlerts({
          search: search.trim() || undefined,
          severity: selectedSeverity !== 'ALL' ? (selectedSeverity as AlertSeverity) : undefined,
          status: selectedStatus !== 'ALL' ? (selectedStatus as AlertStatus) : undefined,
          category: selectedCategory !== 'ALL' ? (selectedCategory as AlertCategory) : undefined,
          page,
          page_size: 12,
          sort_by: 'created_at',
          sort_dir: 'desc',
        }),
        alertService.getAlertMetrics(),
      ]);

      setAlerts(alertsRes.items);
      setTotalPages(alertsRes.total_pages);
      setTotalCount(alertsRes.total);
      setMetrics(metricsRes);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch alerts.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedSeverity, selectedStatus, selectedCategory, page]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleRunEvaluationCycle = async () => {
    setEvaluating(true);
    try {
      const result = await alertService.triggerEvaluationCycle();
      setSuccessToast(
        `Evaluation scan completed: ${result.alerts_generated} alert(s) evaluated; ${result.outbox.sent} notifications dispatched.`
      );
      setTimeout(() => setSuccessToast(null), 5000);
      fetchAlerts();
    } catch (err: any) {
      setError(err.message || 'Evaluation scan failed.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleQuickAcknowledge = async (e: React.MouseEvent, alert: Alert) => {
    e.stopPropagation();
    try {
      const updated = await alertService.acknowledgeAlert(alert.id, 'Quick acknowledged from alerts dashboard');
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? updated : a)));
      setSuccessToast(`Alert ${alert.id} acknowledged.`);
      setTimeout(() => setSuccessToast(null), 3000);
      alertService.getAlertMetrics().then((m) => setMetrics(m));
    } catch (err: any) {
      setError(err.message || 'Failed to acknowledge alert');
    }
  };

  const handleAlertUpdated = (updated: Alert) => {
    setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    alertService.getAlertMetrics().then((m) => setMetrics(m));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <PageHeader
        title="Alerts & Escalation Center"
        subtitle="Operational workflow notifications, escalation policies, and audit trails across safety domains."
        badge={
          metrics?.unread_count ? (
            <Badge variant="danger" size="sm">
              {metrics.unread_count} Unread Notifications
            </Badge>
          ) : (
            <Badge variant="secondary" size="sm">All Caught Up</Badge>
          )
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreferencesOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Preferences</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRulesOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Alert Rules</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunEvaluationCycle}
              disabled={evaluating}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
              <span>{evaluating ? 'Evaluating...' : 'Scan Rules Now'}</span>
            </Button>
          </div>
        }
      />

      {/* Domain Separation Principle Disclaimer */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 text-xs leading-relaxed text-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold flex items-center gap-2">
            <span>Decoupled Safety Intelligence Principle</span>
            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              ISO 45001 / Oil India HSSE
            </span>
          </div>
          <p className="text-muted-foreground">
            <strong>SIF Classification ≠ Risk Priority ≠ Pattern Strength ≠ Alert Severity ≠ Safety Outcome.</strong>{' '}
            Safety alerts function strictly as informational/workflow signals to notify authorized users and guide operational remediation. They do not mutate underlying incident classifications, risk scores, or action barrier ratings.
          </p>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Active Unread
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-primary">
                {metrics ? metrics.unread_count : '—'}
              </span>
              <Bell className="w-4 h-4 text-primary/60" />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {metrics ? `${metrics.total_active} total active` : 'Loading...'}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Urgent (High/Crit)
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-danger">
                {metrics ? metrics.high_or_critical_count : '—'}
              </span>
              <AlertTriangle className="w-4 h-4 text-danger/60" />
            </div>
            <span className="text-[10px] text-muted-foreground">
              Require operational review
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Overdue Actions
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-warning-dark dark:text-warning">
                {metrics ? metrics.overdue_action_alerts : '—'}
              </span>
              <Clock className="w-4 h-4 text-warning/60" />
            </div>
            <span className="text-[10px] text-muted-foreground">
              Past scheduled completion
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Acknowledged
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {metrics ? metrics.acknowledged_count : '—'}
              </span>
              <CheckCircle2 className="w-4 h-4 text-indigo-500/60" />
            </div>
            <span className="text-[10px] text-muted-foreground">
              In supervisory review
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Delivery Health
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-success-dark dark:text-success mt-1">
                {metrics ? metrics.delivery_health : 'HEALTHY'}
              </span>
              <Send className="w-4 h-4 text-success/60" />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {metrics ? `${metrics.outbox_pending} in queue` : 'Outbox synced'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Notifications / Feedback */}
      {successToast && (
        <div className="p-3 rounded-xl border border-success/30 bg-success/10 text-success text-xs font-medium flex items-center justify-between animate-in fade-in duration-150">
          <span>{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by alert ID, title, action number, or report number..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-[11px]">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => {
                  setSelectedSeverity(e.target.value);
                  setPage(1);
                }}
                className="text-xs py-1 px-2 rounded-lg border border-border bg-card text-foreground"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="WARNING">Warning</option>
                <option value="NOTICE">Notice</option>
                <option value="INFO">Info</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-[11px]">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="text-xs py-1 px-2 rounded-lg border border-border bg-card text-foreground"
              >
                <option value="ALL">All Statuses</option>
                <option value="UNREAD">Unread</option>
                <option value="READ">Read</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-[11px]">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="text-xs py-1 px-2 rounded-lg border border-border bg-card text-foreground"
              >
                <option value="ALL">All Categories</option>
                <option value="REVIEW">Review</option>
                <option value="RISK">Risk</option>
                <option value="PATTERN">Pattern</option>
                <option value="ACTION">Action (CAPA)</option>
                <option value="SYSTEM">System</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Stream List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs">
            <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-primary" />
            Loading notifications and alerts stream...
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-success/60" />
              <h3 className="text-sm font-bold text-foreground">No Alerts Matching Filter</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No active notifications found for the selected severity, status, or search query. Run an evaluation cycle or change filters.
              </p>
              <Button variant="outline" size="sm" onClick={() => {
                setSelectedSeverity('ALL');
                setSelectedStatus('ALL');
                setSelectedCategory('ALL');
                setSearch('');
              }}>
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alt) => (
            <Card
              key={alt.id}
              onClick={() => setSelectedAlertId(alt.id)}
              className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${
                alt.status === 'UNREAD' ? 'border-l-4 border-l-primary bg-primary/2' : ''
              }`}
            >
              <CardContent className="p-4 flex items-start justify-between flex-wrap gap-4">
                <div className="space-y-2 flex-1 min-w-[300px]">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-mono text-[10px] font-bold text-muted-foreground">
                      {alt.id}
                    </span>
                    <AlertSeverityBadge severity={alt.severity} size="sm" />
                    <AlertStatusBadge status={alt.status} size="sm" />
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                      {alt.category}
                    </span>
                    {alt.escalation_level > 1 && (
                      <span className="text-[10px] font-bold text-warning-dark dark:text-warning flex items-center gap-0.5 bg-warning/10 px-1.5 py-0.5 rounded">
                        <ArrowUpRight className="w-3 h-3" /> Tier {alt.escalation_level} Escalated
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground ml-auto">
                      {new Date(alt.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground leading-snug">
                      {alt.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {alt.message}
                    </p>
                  </div>

                  {/* Context Snippet */}
                  <div className="flex items-center flex-wrap gap-3 pt-2 text-[11px] text-muted-foreground border-t border-border/40">
                    <div className="flex items-center gap-1 font-mono">
                      <span>Source:</span>
                      <strong className="text-foreground">{alt.source_number}</strong>
                      <span>({alt.source_type})</span>
                    </div>

                    {alt.target_site_name && (
                      <div className="flex items-center gap-1 text-primary">
                        <span>•</span>
                        <span>{alt.target_site_name}</span>
                      </div>
                    )}

                    {alt.target_role && (
                      <div className="flex items-center gap-1">
                        <span>•</span>
                        <span>Routing: <strong className="text-foreground">{alt.target_role}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 self-center shrink-0">
                  {alt.status === 'UNREAD' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleQuickAcknowledge(e, alt)}
                      className="text-xs"
                    >
                      Acknowledge
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAlertId(alt.id);
                    }}
                    className="text-xs flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>Showing page {page} of {totalPages} ({totalCount} total alerts)</span>
          <div className="flex gap-2">
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

      {/* Modals & Drawers */}
      <AlertDetailModal
        alertId={selectedAlertId}
        isOpen={Boolean(selectedAlertId)}
        onClose={() => setSelectedAlertId(null)}
        onAlertUpdated={handleAlertUpdated}
        onNavigateToSource={(path) => onNavigate(path)}
      />

      <AlertRulesDrawer
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      <AlertPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />
    </div>
  );
};
