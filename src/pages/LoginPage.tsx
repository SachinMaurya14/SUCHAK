import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, AlertTriangle, CheckCircle2, Building2, KeyRound } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { authService } from '../services/authService.ts';

export interface LoginPageProps {
  onNavigate: (path: string) => void;
}

interface DemoPersona {
  name: string;
  email: string;
  pass: string;
  role: string;
  org: string;
  tenantType: 'Primary Enterprise' | 'Secondary Isolated Tenant';
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    name: 'Rajesh Sharma',
    email: 'r.sharma@oil-enterprise.com',
    pass: 'SuchakAdmin2026!',
    role: 'OrgAdmin',
    org: 'Oil India Limited',
    tenantType: 'Primary Enterprise',
  },
  {
    name: 'Priyanka Sen',
    email: 'p.sen@oil-enterprise.com',
    pass: 'HseOfficer2026!',
    role: 'HSEOfficer',
    org: 'Oil India Limited',
    tenantType: 'Primary Enterprise',
  },
  {
    name: 'Anil Kakati',
    email: 'a.kakati@oil-enterprise.com',
    pass: 'Reviewer2026!',
    role: 'SafetyReviewer',
    org: 'Oil India Limited',
    tenantType: 'Primary Enterprise',
  },
  {
    name: 'Bikram Borah',
    email: 'b.borah@oil-enterprise.com',
    pass: 'SiteManager2026!',
    role: 'SiteManager',
    org: 'Oil India Limited',
    tenantType: 'Primary Enterprise',
  },
  {
    name: 'Kabir Singha (Contractor)',
    email: 'contractor.admin@alpha-contractors.com',
    pass: 'Contractor2026!',
    role: 'OrgAdmin',
    org: 'Alpha Drilling Contractors Ltd.',
    tenantType: 'Secondary Isolated Tenant',
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('p.sen@oil-enterprise.com');
  const [password, setPassword] = useState('HseOfficer2026!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await authService.login(email, password);
    setLoading(false);

    if (res.success) {
      setSuccessMsg('Authentication verified. Redirecting to Safety Intelligence Console...');
      setTimeout(() => {
        onNavigate('/dashboard');
      }, 500);
    } else {
      setErrorMsg(res.error || 'Authentication rejected. Verify credentials.');
    }
  };

  const selectPersona = (persona: DemoPersona) => {
    setEmail(persona.email);
    setPassword(persona.pass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold mx-auto shadow-lg shadow-amber-500/10">
            <Shield className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white font-display">
            SUCHAK
          </h1>
          <p className="text-xs text-amber-400 font-semibold tracking-widest uppercase">
            HSE Safety Intelligence & Early-Warning Platform
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Zero-Harm Incident Prevention • SIF Precursor Detection • PBKDF2 Encrypted Session Control
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-800/80 shadow-2xl backdrop-blur-sm text-slate-100">
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Enterprise Portal Authentication
                  </span>
                </div>
                <Badge variant="outline" size="sm" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-mono">
                  Phase 14 Hardened
                </Badge>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg flex items-start gap-2.5 text-xs text-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Authentication Error</span>
                    <span>{errorMsg}</span>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded-lg flex items-start gap-2.5 text-xs text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Session Established</span>
                    <span>{successMsg}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Enterprise Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@enterprise.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Security Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  type="submit"
                  disabled={loading}
                  className="w-full justify-center bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5"
                  icon={<ArrowRight className="w-4 h-4" />}
                  iconPosition="right"
                >
                  {loading ? 'Authenticating Credentials...' : 'Sign In with Secure Session'}
                </Button>
              </div>

              {/* Persona Quick Select */}
              <div className="pt-4 border-t border-slate-700/80">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Quick Select Certified Test Personas
                  </span>
                  <span className="text-[10px] text-slate-500">Includes Multi-Tenant Contractor</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEMO_PERSONAS.map((p) => {
                    const isSelected = email === p.email;
                    return (
                      <button
                        key={p.email}
                        type="button"
                        onClick={() => selectPersona(p)}
                        className={`text-left p-2.5 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-amber-400/80 bg-amber-500/15 text-white'
                            : 'border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{p.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              p.role === 'OrgAdmin'
                                ? 'bg-purple-500/20 text-purple-300'
                                : p.role === 'HSEOfficer'
                                ? 'bg-blue-500/20 text-blue-300'
                                : p.role === 'SafetyReviewer'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {p.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{p.org}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                          <Building2 className="w-3 h-3" />
                          <span>{p.tenantType}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Prototype Boundary Disclaimer */}
        <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl text-center space-y-1">
          <p className="text-[11px] font-semibold text-slate-300">
            SUCHAK Enterprise HSE Prototype Foundation • Oil India Limited Specification
          </p>
          <p className="text-[10px] text-slate-400">
            PBKDF2 SHA-512 Password Hashing • In-Memory Active Session Registry • Rate-Limit Brute Force Defense • Multi-Tenant Isolation
          </p>
        </div>
      </div>
    </div>
  );
};
