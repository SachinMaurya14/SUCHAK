import React, { useState, useEffect } from 'react';
import { X, Bell, Moon, Sliders, Check } from 'lucide-react';
import { UserNotificationPreferences, AlertSeverity, AlertCategory } from '../../types/alert.ts';
import { alertService } from '../../services/alertService.ts';
import { Button } from '../ui/Button.tsx';
import { Switch } from '../ui/Switch.tsx';

interface AlertPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertPreferencesModal: React.FC<AlertPreferencesModalProps> = ({ isOpen, onClose }) => {
  const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setSavedSuccess(false);

    alertService
      .getUserPreferences()
      .then((prefs) => setPreferences(prefs))
      .catch((err) => setError(err.message || 'Failed to load preferences'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!preferences) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await alertService.updateUserPreferences(preferences);
      setPreferences(updated);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-card-enter">
        {/* Header */}
        <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Notification Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs">
          {error && (
            <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-danger">
              {error}
            </div>
          )}

          {loading || !preferences ? (
            <div className="py-8 text-center text-muted-foreground">Loading preferences...</div>
          ) : (
            <>
              {/* Delivery Channels */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Active Notification Channels
                </h3>
                <div className="space-y-2.5 rounded-xl border border-border p-3.5 bg-muted/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-foreground block">In-App Notification Center</span>
                      <span className="text-[11px] text-muted-foreground">Top bar badge and full alerts register</span>
                    </div>
                    <Switch
                      checked={preferences.in_app_enabled}
                      onChange={(val: boolean) =>
                        setPreferences({ ...preferences, in_app_enabled: val })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div>
                      <span className="font-medium text-foreground block">Email Dispatch</span>
                      <span className="text-[11px] text-muted-foreground">Summary alerts sent to authorized email address</span>
                    </div>
                    <Switch
                      checked={preferences.email_enabled}
                      onChange={(val: boolean) =>
                        setPreferences({ ...preferences, email_enabled: val })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div>
                      <span className="font-medium text-foreground block">Enterprise Webhook</span>
                      <span className="text-[11px] text-muted-foreground">Automated payload relay to HSSE security event bus</span>
                    </div>
                    <Switch
                      checked={preferences.webhook_enabled}
                      onChange={(val: boolean) =>
                        setPreferences({ ...preferences, webhook_enabled: val })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Minimum Severity Filter */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Minimum Severity Threshold
                </h3>
                <select
                  value={preferences.min_severity}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      min_severity: e.target.value as AlertSeverity,
                    })
                  }
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-card text-foreground"
                >
                  <option value="INFO">INFO & Above (All notifications)</option>
                  <option value="NOTICE">NOTICE & Above (Actionable notices)</option>
                  <option value="WARNING">WARNING & Above (Recommended attention)</option>
                  <option value="HIGH">HIGH & CRITICAL Only</option>
                  <option value="CRITICAL">CRITICAL Only</option>
                </select>
              </div>

              {/* Category Subscriptions */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Notification Domain Categories
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['REVIEW', 'RISK', 'PATTERN', 'ACTION', 'SYSTEM'] as AlertCategory[]).map(
                    (cat) => (
                      <label
                        key={cat}
                        className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/5 cursor-pointer hover:bg-muted/10 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={preferences.categories_enabled[cat]}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              categories_enabled: {
                                ...preferences.categories_enabled,
                                [cat]: e.target.checked,
                              },
                            })
                          }
                          className="rounded border-border"
                        />
                        <span className="font-medium">{cat}</span>
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Quiet Hours
                    </h3>
                  </div>
                  <Switch
                    checked={preferences.quiet_hours.enabled}
                    onChange={(val: boolean) =>
                      setPreferences({
                        ...preferences,
                        quiet_hours: { ...preferences.quiet_hours, enabled: val },
                      })
                    }
                  />
                </div>

                {preferences.quiet_hours.enabled && (
                  <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground block">From</label>
                        <input
                          type="time"
                          value={preferences.quiet_hours.start_time}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              quiet_hours: {
                                ...preferences.quiet_hours,
                                start_time: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs p-1.5 rounded border border-border bg-card"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block">To</label>
                        <input
                          type="time"
                          value={preferences.quiet_hours.end_time}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              quiet_hours: {
                                ...preferences.quiet_hours,
                                end_time: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs p-1.5 rounded border border-border bg-card"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={preferences.quiet_hours.allow_critical}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            quiet_hours: {
                              ...preferences.quiet_hours,
                              allow_critical: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-border"
                      />
                      <span>Allow CRITICAL workflow alerts during quiet hours</span>
                    </label>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <div>
            {savedSuccess && (
              <span className="text-xs text-success flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Preferences Saved
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
