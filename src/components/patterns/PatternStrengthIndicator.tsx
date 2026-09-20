import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

interface PatternStrengthIndicatorProps {
  score: number; // 0 - 100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const PatternStrengthIndicator: React.FC<PatternStrengthIndicatorProps> = ({
  score,
  size = 'md',
  showLabel = true,
}) => {
  // Color scale based on strength (evidence volume & cohesion)
  const getColors = (s: number) => {
    if (s >= 80) {
      return {
        bar: 'bg-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-500/10',
        tier: 'High Evidence',
      };
    }
    if (s >= 60) {
      return {
        bar: 'bg-blue-500',
        text: 'text-blue-700 dark:text-blue-400',
        bg: 'bg-blue-500/10',
        tier: 'Moderate Evidence',
      };
    }
    if (s >= 40) {
      return {
        bar: 'bg-amber-500',
        text: 'text-amber-700 dark:text-amber-400',
        bg: 'bg-amber-500/10',
        tier: 'Developing Evidence',
      };
    }
    return {
      bar: 'bg-zinc-400',
      text: 'text-zinc-600 dark:text-zinc-400',
      bg: 'bg-zinc-500/10',
      tier: 'Limited Evidence',
    };
  };

  const colors = getColors(score);

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-1.5" title={`Pattern Strength: ${score}/100 (${colors.tier})`}>
        <div className="w-12 bg-muted/60 dark:bg-muted/40 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
            style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
          />
        </div>
        <span className={`font-mono text-xs font-semibold ${colors.text}`}>{score}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            Pattern Strength
            <span
              title="Pattern Strength reflects supporting report volume, unique observation dates, and vector centroid cohesion. It does NOT represent accident probability or SIF risk."
              className="cursor-help text-muted-foreground/70 hover:text-foreground"
            >
              <Info className="w-3 h-3" />
            </span>
          </span>
          <span className={`font-mono font-bold ${colors.text}`}>
            {score}
            <span className="text-[10px] text-muted-foreground font-normal">/100</span>
          </span>
        </div>
      )}
      <div className="w-full bg-muted/70 dark:bg-muted/40 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
        <span>{colors.tier}</span>
        <span>Evidence-grounded</span>
      </div>
    </div>
  );
};
