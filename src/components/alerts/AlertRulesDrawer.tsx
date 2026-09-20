import React, { useState, useEffect } from 'react';
import { X, Shield, Clock, Bell, Layers, CheckCircle2, AlertOctagon } from 'lucide-react';
import { AlertRule } from '../../types/alert.ts';
import { alertService } from '../../services/alertService.ts';
import { AlertSeverityBadge } from './AlertSeverityBadge.tsx';
import { Button } from '../ui/Button.tsx';
import { Switch } from '../ui/Switch.tsx';

interface AlertRulesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertRulesDrawer: React.FC<AlertRulesDrawerProps> = ({ isOpen, onClose }) => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    alertService
      .getRules()
      .then((data) => setRules(data))
      .catch((err) => setError(err.message || 'Failed to load alert rules'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      const updated = await alertService.updateRule(rule.id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch (err: any) {
      setError(err.message || 'Failed to update rule');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Configured Alert Rules & Policies</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Deterministic rule models triggering workflow notifications upon domain events.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-danger">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading alert rules...</div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  rule.enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/20 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-muted-foreground">
                        {rule.id} (v{rule.version})
                      </span>
                      <AlertSeverityBadge severity={rule.severity} size="sm" />
                      <span className="text-[10px] uppercase font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                        {rule.category}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground">{rule.name}</h4>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </span>
                    <Switch
                      checked={rule.enabled}
                      onChange={() => handleToggleRule(rule)}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {rule.description}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block">Event Trigger:</span>
                    <span className="font-mono font-medium text-foreground">{rule.event_type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Cooldown Window:</span>
                    <span className="font-medium text-foreground">
                      {Math.round(rule.cooldown_seconds / 60)} minutes
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Channels:</span>
                    <div className="flex gap-1">
                      {rule.channels.map((ch) => (
                        <span key={ch} className="px-1.5 py-0.2 rounded bg-muted text-[10px] font-mono">
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>

                  {rule.escalation_policy?.enabled && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {rule.escalation_policy.levels.length} Escalation Tiers
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
