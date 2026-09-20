import React, { useState, useEffect } from 'react';
import {
  FileText,
  Filter,
  Download,
  Plus,
  ArrowUpDown,
  ExternalLink,
  RefreshCw,
  X,
  AlertOctagon,
  Clock,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { SearchField } from '../components/ui/SearchField.tsx';
import { Select } from '../components/ui/Select.tsx';
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
import { PaginationShell } from '../components/ui/PaginationShell.tsx';
import { reportService } from '../services/reportService.ts';

export interface ReportsPageProps {
  onNavigate: (path: string) => void;
}

interface DisplayReport {
  id: string;
  date: string;
  site: string;
  location: string;
  activity: string;
  type: string;
  risk: string;
  rule: string;
  status: string;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate }) => {
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [reports, setReports] = useState<DisplayReport[]>([]);

  // Baseline structured demonstration reports
  const baselineReports: DisplayReport[] = [
    {
      id: 'REP-2026-0891',
      date: '2026-09-18 14:22',
      site: 'Digboi Central',
      location: 'Rig Floor #4',
      activity: 'High Pressure Line Testing',
      type: 'Near-Miss',
      risk: 'SIF_POTENTIAL',
      rule: 'Line of Fire',
      status: 'Under Review',
    },
    {
      id: 'REP-2026-0889',
      date: '2026-09-18 11:05',
      site: 'Duliajan Field',
      location: 'Gas Separator Skid',
      activity: 'Confined Space Entry',
      type: 'Unsafe Condition',
      risk: 'HIGH',
      rule: 'Confined Space',
      status: 'Unreviewed',
    },
    {
      id: 'REP-2026-0885',
      date: '2026-09-17 16:40',
      site: 'Numaligarh Ref',
      location: 'Storage Tank #104',
      activity: 'Scaffold Disassembly',
      type: 'Unsafe Act',
      risk: 'SIF_POTENTIAL',
      rule: 'Working at Height',
      status: 'Verified SIF',
    },
    {
      id: 'REP-2026-0880',
      date: '2026-09-17 08:15',
      site: 'Moran Station',
      location: 'Pump Station #2',
      activity: 'Heavy Pipe Rigging',
      type: 'Near-Miss',
      risk: 'HIGH',
      rule: 'Safe Mechanical Lifting',
      status: 'Action Assigned',
    },
    {
      id: 'REP-2026-0876',
      date: '2026-09-16 17:30',
      site: 'Digboi Central',
      location: 'Workshop #2',
      activity: 'Tool Grinding & Cutting',
      type: 'Unsafe Act',
      risk: 'NON_SIF',
      rule: 'Hot Work',
      status: 'Overridden Non-SIF',
    },
    {
      id: 'REP-2026-0872',
      date: '2026-09-16 10:10',
      site: 'Duliajan Field',
      location: 'Substation Transformer B',
      activity: 'Breaker Replacement',
      type: 'Unsafe Condition',
      risk: 'SIF_POTENTIAL',
      rule: 'Energy Isolation',
      status: 'Verified SIF',
    },
  ];

  // Fetch live backend reports and merge with baseline
  useEffect(() => {
    let active = true;
    setIsLoading(true);

    reportService
      .getReports({ limit: 50 })
      .then((res) => {
        if (!active) return;
        if (res && res.reports && res.reports.length > 0) {
          const liveMapped: DisplayReport[] = res.reports.map((r) => ({
            id: r.id,
            date: r.dateTime,
            site: r.siteName,
            location: r.location,
            activity: r.activity,
            type: r.reportType,
            risk: (r.processingStatus as string) === 'ANALYZED' || r.processingStatus === 'Classified' ? 'SIF_POTENTIAL' : 'HIGH',
            rule: r.activity.includes('Drill') ? 'Line of Fire' : 'Energy Isolation',
            status: r.reviewStatus,
          }));

          // Merge without duplicate IDs
          const existingIds = new Set(liveMapped.map((m) => m.id));
          const uniqueBaseline = baselineReports.filter((b) => !existingIds.has(b.id));
          setReports([...liveMapped, ...uniqueBaseline]);
        } else {
          setReports(baselineReports);
        }
      })
      .catch(() => {
        if (active) setReports(baselineReports);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const hasActiveFilters =
    search !== '' ||
    siteFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    riskFilter !== 'ALL' ||
    statusFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearch('');
    setSiteFilter('ALL');
    setTypeFilter('ALL');
    setRiskFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  const filteredReports = reports.filter((r) => {
    if (siteFilter !== 'ALL' && !r.site.toLowerCase().includes(siteFilter.toLowerCase())) return false;
    if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
    if (riskFilter !== 'ALL' && r.risk !== riskFilter) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (
      search &&
      !r.id.toLowerCase().includes(search.toLowerCase()) &&
      !r.activity.toLowerCase().includes(search.toLowerCase()) &&
      !r.location.toLowerCase().includes(search.toLowerCase()) &&
      !r.site.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const pageSize = 10;
  const paginatedReports = filteredReports.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Safety Reports Repository"
        subtitle="Centralized register of field safety observations, near-misses, and incident reports."
        badge={<Badge variant="primary" size="sm">Enterprise Repository</Badge>}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('/exports')}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('/evaluate')}
            >
              Log New Report
            </Button>
          </div>
        }
      />

      {/* Metrics Mini-Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Reports</p>
            <p className="text-xl font-bold text-foreground font-display tracking-tight tabular-nums mt-0.5">{reports.length}</p>
          </div>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">SIF Potential</p>
            <p className="text-xl font-bold text-danger font-display tracking-tight tabular-nums mt-0.5">
              {reports.filter((r) => r.risk === 'SIF_POTENTIAL').length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-danger/10 text-danger">
            <AlertOctagon className="w-4 h-4" />
          </div>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Under Review</p>
            <p className="text-xl font-bold text-warning font-display tracking-tight tabular-nums mt-0.5">
              {reports.filter((r) => r.status === 'Under Review' || r.status === 'PENDING').length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-warning/10 text-warning">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Filtered Items</p>
            <p className="text-xl font-bold text-foreground font-display tracking-tight tabular-nums mt-0.5">
              {filteredReports.length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-surface-muted text-muted-foreground">
            <Filter className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <SearchField
                value={search}
                onChangeValue={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                placeholder="Search reports by ID, activity, site, or location..."
              />
            </div>

            <div className="w-44">
              <Select
                value={siteFilter}
                onChange={(e) => {
                  setSiteFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All Sites & Facilities' },
                  { value: 'Digboi', label: 'Digboi Central' },
                  { value: 'Duliajan', label: 'Duliajan Field' },
                  { value: 'Numaligarh', label: 'Numaligarh Ref' },
                  { value: 'Moran', label: 'Moran Station' },
                ]}
              />
            </div>

            <div className="w-36">
              <Select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All Types' },
                  { value: 'Near-Miss', label: 'Near-Miss' },
                  { value: 'Near Miss', label: 'Near Miss' },
                  { value: 'Unsafe Condition', label: 'Unsafe Condition' },
                  { value: 'Unsafe Act', label: 'Unsafe Act' },
                ]}
              />
            </div>

            <div className="w-36">
              <Select
                value={riskFilter}
                onChange={(e) => {
                  setRiskFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All Risk' },
                  { value: 'SIF_POTENTIAL', label: 'SIF Potential' },
                  { value: 'HIGH', label: 'High Priority' },
                  { value: 'NON_SIF', label: 'Non-SIF' },
                ]}
              />
            </div>

            <div className="w-36">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All Status' },
                  { value: 'Unreviewed', label: 'Unreviewed' },
                  { value: 'PENDING', label: 'Pending Review' },
                  { value: 'Under Review', label: 'Under Review' },
                  { value: 'Verified SIF', label: 'Verified SIF' },
                  { value: 'Action Assigned', label: 'Action Assigned' },
                ]}
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                icon={<X className="w-3.5 h-3.5" />}
                onClick={handleResetFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Table View */}
        <TableShell className="border-t border-border rounded-t-none">
          <TableHead>
            <tr>
              <TableHeaderCell>Report ID</TableHeaderCell>
              <TableHeaderCell>Date / Time</TableHeaderCell>
              <TableHeaderCell>Asset / Site</TableHeaderCell>
              <TableHeaderCell>Specific Location</TableHeaderCell>
              <TableHeaderCell>Observed Activity</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Mapped IOGP Rule</TableHeaderCell>
              <TableHeaderCell>Risk Status</TableHeaderCell>
              <TableHeaderCell>Review Status</TableHeaderCell>
              <TableHeaderCell className="text-right">Action</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-8 h-8 text-muted-foreground/50" />
                    <p className="font-semibold text-foreground">No reports match your filters</p>
                    <p className="text-xs text-muted-foreground">Try clearing your search keyword or resetting site/risk filters.</p>
                    <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2">
                      Clear All Filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedReports.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer group"
                  onClick={() => onNavigate(`/reports/${r.id}`)}
                >
                  <TableCell>
                    <span className="font-mono text-xs font-semibold text-primary bg-primary/10 border border-primary/15 px-2 py-0.5 rounded-md whitespace-nowrap">
                      {r.id}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap tabular-nums">{r.date}</TableCell>
                  <TableCell className="font-semibold text-foreground whitespace-nowrap">{r.site}</TableCell>
                  <TableCell className="text-muted-foreground">{r.location}</TableCell>
                  <TableCell className="text-foreground max-w-[200px] truncate font-medium">{r.activity}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" size="sm">{r.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground whitespace-nowrap">{r.rule}</span>
                  </TableCell>
                  <TableCell>
                    <RiskBadge level={r.risk} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status as any} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(`/reports/${r.id}`);
                      }}
                      icon={<ExternalLink className="w-3 h-3" />}
                      iconPosition="right"
                      className="group-hover:text-primary transition-colors"
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableShell>

        {filteredReports.length > 0 && (
          <PaginationShell
            currentPage={page}
            totalPages={totalPages}
            totalItems={filteredReports.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
};
