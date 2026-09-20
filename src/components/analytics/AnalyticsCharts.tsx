import React, { useState } from 'react';
import { TimeSeriesPoint, HeatmapCell, BarrierMetricItem, SifDistributionMetrics } from '../../types/analytics.ts';

// ----------------------------------------------------
// 1. Trend Timeline Chart (SVG)
// ----------------------------------------------------
interface TrendChartProps {
  series: TimeSeriesPoint[];
}

export const TrendTimelineChart: React.FC<TrendChartProps> = ({ series }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!series || series.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
        No time-series data available for the selected period
      </div>
    );
  }

  const maxVal = Math.max(...series.map((s) => s.total_reports), 5);
  const width = 640;
  const height = 220;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const getX = (i: number) => padLeft + (i / Math.max(series.length - 1, 1)) * chartW;
  const getY = (val: number) => padTop + chartH - (val / maxVal) * chartH;

  // Build SVG path strings
  const totalPath = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(s.total_reports)}`).join(' ');
  const sifPath = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(s.sif_potential)}`).join(' ');
  const riskPath = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(s.high_critical_risk)}`).join(' ');

  // Total area
  const areaPath = `${totalPath} L ${getX(series.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`;

  const hoveredPoint = hoveredIndex !== null ? series[hoveredIndex] : null;

  return (
    <div className="relative w-full overflow-hidden">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs mb-3 gap-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="w-3 h-0.5 bg-primary rounded-full inline-block" />
            Total Volume
          </span>
          <span className="flex items-center gap-1.5 font-medium text-danger">
            <span className="w-3 h-0.5 bg-danger rounded-full inline-block" />
            SIF Potential
          </span>
          <span className="flex items-center gap-1.5 font-medium text-warning">
            <span className="w-3 h-0.5 bg-warning rounded-full inline-block" />
            High/Critical Risk
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">
          Max daily: {maxVal} reports
        </span>
      </div>

      <div className="w-full aspect-[21/9] min-h-[220px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Y Axis Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = padTop + chartH * (1 - pct);
            const val = Math.round(pct * maxVal);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-border-subtle"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-muted-foreground font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area fill for total volume */}
          <path d={areaPath} fill="currentColor" className="text-primary/10" />

          {/* Lines */}
          <path d={totalPath} fill="none" stroke="currentColor" className="text-primary" strokeWidth={2.5} />
          <path d={riskPath} fill="none" stroke="currentColor" className="text-warning" strokeWidth={2} strokeDasharray="4 2" />
          <path d={sifPath} fill="none" stroke="currentColor" className="text-danger" strokeWidth={2.5} />

          {/* Interactive hover points */}
          {series.map((s, i) => {
            const cx = getX(i);
            const cy = getY(s.total_reports);
            return (
              <g key={i} className="cursor-pointer">
                {hoveredIndex === i && (
                  <line
                    x1={cx}
                    y1={padTop}
                    x2={cx}
                    y2={padTop + chartH}
                    stroke="currentColor"
                    className="text-foreground/30"
                    strokeWidth={1}
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={hoveredIndex === i ? 5 : 3}
                  className="fill-primary stroke-surface stroke-2 transition-all"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}

          {/* X Axis Labels */}
          {series.map((s, i) => {
            // Show every few labels
            const step = Math.ceil(series.length / 6);
            if (i % step !== 0 && i !== series.length - 1) return null;
            return (
              <text
                key={i}
                x={getX(i)}
                y={height - 8}
                textAnchor="middle"
                className="text-[10px] fill-muted-foreground font-mono"
              >
                {s.date.slice(5)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Floating Hover Info */}
      {hoveredPoint && (
        <div className="mt-2 p-2.5 rounded-lg border border-border bg-surface shadow-md flex items-center justify-between text-xs animate-in fade-in duration-150">
          <span className="font-semibold text-foreground font-mono">{hoveredPoint.date}</span>
          <div className="flex items-center gap-4">
            <span className="text-primary font-medium">Total: <strong>{hoveredPoint.total_reports}</strong></span>
            <span className="text-danger font-medium">SIF: <strong>{hoveredPoint.sif_potential}</strong></span>
            <span className="text-warning font-medium">High/Crit: <strong>{hoveredPoint.high_critical_risk}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------
// 2. SIF Distribution Donut Chart
// ----------------------------------------------------
interface SifDonutProps {
  sif: SifDistributionMetrics;
}

export const SifDonutChart: React.FC<SifDonutProps> = ({ sif }) => {
  const total = sif.sif_potential_count + sif.non_sif_potential_count + sif.needs_review_count;
  if (total === 0) {
    return <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">No reports recorded</div>;
  }

  const sifAngle = (sif.sif_potential_count / total) * 360;
  const nonSifAngle = (sif.non_sif_potential_count / total) * 360;

  // Polar to Cartesian
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
      {/* SVG Donut */}
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="-1 -1 2 2" className="w-full h-full -rotate-90 overflow-visible">
          {/* Segment 1: SIF Potential (Danger) */}
          <circle
            cx="0"
            cy="0"
            r="0.75"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="0.4"
            strokeDasharray={`${(sif.sif_potential_count / total) * 4.71} 4.71`}
            strokeDashoffset="0"
            className="text-danger transition-all duration-700"
          />
          {/* Segment 2: Non-SIF Potential (Success) */}
          <circle
            cx="0"
            cy="0"
            r="0.75"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="0.4"
            strokeDasharray={`${(sif.non_sif_potential_count / total) * 4.71} 4.71`}
            strokeDashoffset={`-${(sif.sif_potential_count / total) * 4.71}`}
            className="text-success transition-all duration-700"
          />
          {/* Segment 3: Needs Review (Warning) */}
          {sif.needs_review_count > 0 && (
            <circle
              cx="0"
              cy="0"
              r="0.75"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="0.4"
              strokeDasharray={`${(sif.needs_review_count / total) * 4.71} 4.71`}
              strokeDashoffset={`-${((sif.sif_potential_count + sif.non_sif_potential_count) / total) * 4.71}`}
              className="text-warning transition-all duration-700"
            />
          )}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-xl font-bold font-mono text-foreground">{sif.sif_rate_pct}%</span>
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">SIF Rate</span>
        </div>
      </div>

      {/* Legend & Counts */}
      <div className="flex-1 space-y-2.5 w-full">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-danger" />
            SIF Potential
          </span>
          <span className="font-mono text-foreground font-semibold">
            {sif.sif_potential_count} <span className="text-muted-foreground font-normal text-[11px]">({sif.sif_rate_pct}%)</span>
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
          <div className="h-full bg-danger rounded-full" style={{ width: `${sif.sif_rate_pct}%` }} />
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-success" />
            Non-SIF Potential
          </span>
          <span className="font-mono text-foreground font-semibold">
            {sif.non_sif_potential_count} <span className="text-muted-foreground font-normal text-[11px]">({(100 - sif.sif_rate_pct).toFixed(1)}%)</span>
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
          <div className="h-full bg-success rounded-full" style={{ width: `${100 - sif.sif_rate_pct}%` }} />
        </div>

        {sif.needs_review_count > 0 && (
          <>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                Needs HSE Review
              </span>
              <span className="font-mono text-foreground font-semibold">
                {sif.needs_review_count}
              </span>
            </div>
          </>
        )}

        <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Human Confirmed: <strong className="text-foreground font-mono">{sif.human_confirmed_count}</strong></span>
          <span>Human Corrected: <strong className="text-foreground font-mono">{sif.human_corrected_count}</strong></span>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 3. Site vs Precursor Heatmap
// ----------------------------------------------------
interface HeatmapProps {
  cells: HeatmapCell[];
  onSelectSite?: (siteName: string) => void;
}

export const SitePrecursorHeatmap: React.FC<HeatmapProps> = ({ cells, onSelectSite }) => {
  if (!cells || cells.length === 0) {
    return <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">No heatmap telemetry available</div>;
  }

  // Extract unique rows (sites) and columns (precursors)
  const sites = Array.from(new Set(cells.map((c) => c.x_label)));
  const precursors = Array.from(new Set(cells.map((c) => c.y_label)));

  const getCell = (site: string, precursor: string) => {
    return cells.find((c) => c.x_label === site && c.y_label === precursor);
  };

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-xs text-left border-collapse min-w-[500px]">
        <thead>
          <tr className="border-b border-border">
            <th className="p-2 font-semibold text-muted-foreground uppercase text-[10px] w-40">Asset / Facility</th>
            {precursors.map((p) => (
              <th key={p} className="p-2 font-semibold text-muted-foreground uppercase text-[10px] text-center">
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {sites.map((site) => (
            <tr key={site} className="hover:bg-surface-muted/50 transition-colors">
              <td
                className="p-2 font-medium text-foreground cursor-pointer hover:text-primary transition-colors whitespace-nowrap"
                onClick={() => onSelectSite && onSelectSite(site)}
              >
                {site}
              </td>
              {precursors.map((p) => {
                const cell = getCell(site, p);
                const count = cell ? cell.value : 0;
                const intensity = cell ? cell.intensity : 0;

                let bgClass = 'bg-surface-muted/20 text-muted-foreground';
                if (intensity > 0.7) bgClass = 'bg-danger text-danger-foreground font-bold';
                else if (intensity > 0.4) bgClass = 'bg-danger/40 text-danger-foreground font-semibold';
                else if (intensity > 0.15) bgClass = 'bg-warning/30 text-warning-foreground font-medium';
                else if (count > 0) bgClass = 'bg-primary/20 text-foreground';

                return (
                  <td key={p} className="p-1 text-center">
                    <div
                      className={`h-7 rounded flex items-center justify-center font-mono text-[11px] transition-transform hover:scale-105 ${bgClass}`}
                      title={`${site} - ${p}: ${count} observations (intensity ${Math.round(intensity * 100)}%)`}
                    >
                      {count > 0 ? count : '-'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ----------------------------------------------------
// 4. Critical Barrier Health Degradation Grid
// ----------------------------------------------------
interface BarrierGridProps {
  barriers: BarrierMetricItem[];
}

export const BarrierHealthGrid: React.FC<BarrierGridProps> = ({ barriers }) => {
  if (!barriers || barriers.length === 0) {
    return <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">No barrier failure records</div>;
  }

  const getStateBadge = (state: BarrierMetricItem['observed_state']) => {
    switch (state) {
      case 'FAILED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-danger text-danger-foreground">FAILED</span>;
      case 'BYPASSED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning text-warning-foreground">BYPASSED</span>;
      case 'INADEQUATE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning/80 text-foreground">INADEQUATE</span>;
      case 'UNKNOWN':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-muted text-muted-foreground">UNKNOWN (OBSERVED)</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-muted text-muted-foreground">{state}</span>;
    }
  };

  return (
    <div className="space-y-2.5">
      {barriers.slice(0, 6).map((b, idx) => (
        <div
          key={idx}
          className="p-2.5 rounded-lg border border-border bg-surface-muted/20 flex items-center justify-between text-xs"
        >
          <div className="space-y-0.5 pr-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{b.barrier_category}</span>
              {getStateBadge(b.observed_state)}
            </div>
            <p className="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-md">
              Affected: {b.affected_sites.join(', ')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono font-bold text-foreground block">{b.count} reports</span>
            <span className="text-[10px] text-muted-foreground font-mono">{b.share_pct}% share</span>
          </div>
        </div>
      ))}
    </div>
  );
};
