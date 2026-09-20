import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';

export interface LoginPageProps {
  onNavigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('hse.officer@oil.example.in');
  const [password, setPassword] = useState('••••••••••••');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold mx-auto shadow-md">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            SUCHAK
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Enterprise HSE Safety Intelligence & Early-Warning Platform
          </p>
        </div>

        <Card elevated>
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                <span className="text-xs font-semibold text-foreground">Organization Portal Sign-In</span>
                <Badge variant="outline" size="sm">Phase 1 Preview</Badge>
              </div>

              <Input
                label="Enterprise Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
              />

              <Input
                label="Security Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div className="pt-2">
                <Button
                  variant="primary"
                  type="submit"
                  className="w-full justify-center"
                  icon={<ArrowRight className="w-4 h-4" />}
                  iconPosition="right"
                >
                  Enter Safety Intelligence Portal
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground text-center pt-2">
                Mock organizational sign-in for Phase 1 shell testing. Click enter to proceed to dashboard.
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-[11px] text-center text-muted-foreground">
          Protected by Enterprise HSE Protocol • Oil India Limited Specification
        </p>
      </div>
    </div>
  );
};
