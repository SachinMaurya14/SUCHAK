import React, { useState } from 'react';
import { Settings, Sun, Moon, Laptop, Bell, Shield, Key } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Switch } from '../components/ui/Switch.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { useTheme } from '../lib/theme.tsx';

export interface SettingsPageProps {
  onNavigate: (path: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const { theme, setTheme } = useTheme();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [highRiskInstant, setHighRiskInstant] = useState(true);
  const [autoTriageFlag, setAutoTriageFlag] = useState(true);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Platform Preferences"
        subtitle="Configure individual display preferences, alert thresholds, and system notifications."
        badge={<Badge variant="primary" size="sm">Phase 1 Settings</Badge>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance Card */}
        <Card>
          <CardHeader>
            <CardTitle>Interface Appearance & Theme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <p className="text-muted-foreground">
              SUCHAK defaults to an enterprise Light Mode, optimized for daylight control room and field viewing.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${
                  theme === 'light'
                    ? 'border-primary bg-primary/10 font-bold text-primary'
                    : 'border-border bg-surface-muted/50 text-foreground hover:bg-surface-muted'
                }`}
              >
                <Sun className="w-4 h-4 mx-auto mb-1 text-warning" />
                <span>Light (Default)</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/10 font-bold text-primary'
                    : 'border-border bg-surface-muted/50 text-foreground hover:bg-surface-muted'
                }`}
              >
                <Moon className="w-4 h-4 mx-auto mb-1 text-primary" />
                <span>Dark Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${
                  theme === 'system'
                    ? 'border-primary bg-primary/10 font-bold text-primary'
                    : 'border-border bg-surface-muted/50 text-foreground hover:bg-surface-muted'
                }`}
              >
                <Laptop className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <span>System</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Early-Warning Alert Triggers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Switch
              label="Instant Critical SIF Precursor Alert"
              description="Notify designated HSE officers immediately when a report exceeds 80% precursor threshold."
              checked={highRiskInstant}
              onChange={setHighRiskInstant}
            />
            <div className="border-t border-border-subtle pt-3">
              <Switch
                label="Weekly Multi-Site Intelligence Summary"
                description="Receive consolidated weekly digest of recurring precursor clusters and barrier degradation."
                checked={emailAlerts}
                onChange={setEmailAlerts}
              />
            </div>
            <div className="border-t border-border-subtle pt-3">
              <Switch
                label="Auto-Assign Triaged Reports to Queue"
                description="Direct unreviewed high-priority reports automatically to the designated site reviewer."
                checked={autoTriageFlag}
                onChange={setAutoTriageFlag}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
