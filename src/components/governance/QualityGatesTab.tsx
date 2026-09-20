/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: Quality Gates Configuration & Evaluation Component
 */

import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, CheckCircle2, Edit2, Save, X } from 'lucide-react';
import { QualityGateRule, QualityGateEvaluation } from '../../../server/modelGovernanceTypes.ts';

export interface QualityGatesTabProps {
  rules: QualityGateRule[];
  evaluations?: QualityGateEvaluation[];
  onUpdateRule?: (ruleId: string, updates: Partial<QualityGateRule>) => Promise<void>;
  readOnly?: boolean;
}

export const QualityGatesTab: React.FC<QualityGatesTabProps> = ({
  rules,
  evaluations,
  onUpdateRule,
  readOnly = false,
}) => {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editThreshold, setEditThreshold] = useState<number>(0);
  const [editSeverity, setEditSeverity] = useState<'CRITICAL' | 'WARNING'>('CRITICAL');
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (rule: QualityGateRule) => {
    setEditingRuleId(rule.id);
    setEditThreshold(rule.threshold);
    setEditSeverity(rule.severity);
  };

  const cancelEdit = () => {
    setEditingRuleId(null);
  };

  const handleSave = async (ruleId: string) => {
    if (!onUpdateRule) return;
    setIsSaving(true);
    try {
      await onUpdateRule(ruleId, {
        threshold: editThreshold,
        severity: editSeverity,
      });
      setEditingRuleId(null);
    } catch (err) {
      console.error('Failed to update quality gate rule:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Policy banner */}
      <div className="p-4 rounded-xl border border-border-subtle bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Operational Quality Gate Policies</span>
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rules enforce mathematical standards required for candidate AI models before HSE leadership approval.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs font-mono font-medium text-foreground">
          <span>Release Protocol:</span>
          <span className="text-primary font-bold">MANUAL_HUMAN_APPROVAL_ONLY</span>
        </div>
      </div>

      {/* Rules list */}
      <div className="grid grid-cols-1 gap-3">
        {rules.map((rule) => {
          const evalOutcome = evaluations?.find((e) => e.rule_id === rule.id);
          const isEditing = editingRuleId === rule.id;

          return (
            <div
              key={rule.id}
              className={`p-4 rounded-xl border bg-surface transition-all ${
                evalOutcome?.status === 'FAIL'
                  ? 'border-red-500/40 bg-red-500/5'
                  : evalOutcome?.status === 'PASS'
                  ? 'border-emerald-500/30'
                  : 'border-border-subtle'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-foreground">{rule.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rule.severity === 'CRITICAL'
                          ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {rule.severity}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{rule.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{rule.rationale}</p>
                </div>

                <div className="flex items-center gap-2">
                  {evalOutcome && (
                    <div
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        evalOutcome.status === 'PASS'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                      }`}
                    >
                      {evalOutcome.status === 'PASS' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      )}
                      <span>{evalOutcome.status}</span>
                    </div>
                  )}

                  {!readOnly && onUpdateRule && !isEditing && (
                    <button
                      onClick={() => startEdit(rule)}
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 transition-colors"
                      title="Edit rule threshold"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="mt-3 pt-3 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Threshold ({rule.operator})
                    </label>
                    <input
                      type="number"
                      step={rule.threshold <= 1 ? '0.01' : '1'}
                      value={editThreshold}
                      onChange={(e) => setEditThreshold(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Severity</label>
                    <select
                      value={editSeverity}
                      onChange={(e) => setEditSeverity(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    >
                      <option value="CRITICAL">CRITICAL (Blocks Release)</option>
                      <option value="WARNING">WARNING (Review Required)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={isSaving}
                      onClick={() => handleSave(rule.id)}
                      className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg flex items-center gap-1 hover:opacity-90 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save Rule'}</span>
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground rounded-lg hover:bg-muted/30"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4 text-xs mt-2 pt-2 border-t border-border-subtle">
                  <div className="text-muted-foreground">
                    Metric Target:{' '}
                    <span className="font-mono text-foreground font-semibold">{rule.metric_key}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Constraint:{' '}
                    <span className="font-mono text-foreground font-bold">
                      {rule.operator} {rule.threshold}
                    </span>
                  </div>
                  {evalOutcome && evalOutcome.actual_value !== null && (
                    <div className="text-muted-foreground">
                      Current Evaluation Value:{' '}
                      <span
                        className={`font-mono font-bold ${
                          evalOutcome.status === 'PASS' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {evalOutcome.actual_value}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
