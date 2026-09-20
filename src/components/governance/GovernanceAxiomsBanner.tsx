/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: Governance Non-Causal Axioms Banner
 */

import React from 'react';
import { ShieldCheck, AlertOctagon, Scale, ArrowRight, ShieldAlert } from 'lucide-react';

export const GovernanceAxiomsBanner: React.FC = () => {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface shadow-2xs overflow-hidden">
      <div className="bg-slate-900 text-slate-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-wide uppercase text-slate-200">
              SUCHAK AI Safety Governance Protocol
            </div>
            <div className="text-[11px] text-slate-400">
              High-Hazard Operational AI Safety Standard • Zero-Harm Safety Intelligence
            </div>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Strict Human-in-the-Loop Gating Active</span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/20">
        {/* Axiom 1 */}
        <div className="p-3 rounded-lg border border-border-subtle bg-surface flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Principle 01</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                Non-Causal
              </span>
            </div>
            <div className="text-sm font-black tracking-tight text-foreground font-mono flex items-center gap-2">
              <span>AI RESULT</span>
              <span className="text-red-700 font-extrabold text-base">≠</span>
              <span>AI QUALITY</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Generating a structured JSON inference output does not validate safety accuracy. Systematic empirical evaluation against verified golden benchmarks is mandatory.
            </p>
          </div>
        </div>

        {/* Axiom 2 */}
        <div className="p-3 rounded-lg border border-border-subtle bg-surface flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Principle 02</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                Human Authority
              </span>
            </div>
            <div className="text-sm font-black tracking-tight text-foreground font-mono flex items-center gap-2">
              <span>AI QUALITY</span>
              <span className="text-amber-700 font-extrabold text-base">≠</span>
              <span>PROD APPROVAL</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              High statistical benchmark scores do not constitute operational authorization. Deployment requires formal sign-off from an authorized Chief Safety Officer.
            </p>
          </div>
        </div>

        {/* Axiom 3 */}
        <div className="p-3 rounded-lg border border-border-subtle bg-surface flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Principle 03</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                Gate Enforcement
              </span>
            </div>
            <div className="text-sm font-black tracking-tight text-foreground font-mono flex items-center gap-2">
              <span>EVAL PASS</span>
              <span className="text-sky-700 font-extrabold text-base">≠</span>
              <span>AUTO DEPLOY</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Passing quality gates only qualifies a model for release consideration. Automatic production promotion is strictly forbidden to prevent silent regression.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
