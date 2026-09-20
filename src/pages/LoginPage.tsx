import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Building2,
  KeyRound,
  ExternalLink,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { SuchakLogo } from '../components/common/SuchakLogo.tsx';
import { authService } from '../services/authService.ts';
import { clientIdentityService, IdentityProvider } from '../services/identityService.ts';

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
  const [authMode, setAuthMode] = useState<'password' | 'sso'>('password');
  const [email, setEmail] = useState('p.sen@oil-enterprise.com');
  const [password, setPassword] = useState('HseOfficer2026!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // SSO specific state
  const [providers, setProviders] = useState<IdentityProvider[]>([]);
  const [discoveredProvider, setDiscoveredProvider] = useState<IdentityProvider | null>(null);
  const [discovering, setDiscovering] = useState(false);

  useEffect(() => {
    clientIdentityService.getPublicProviders().then((list) => {
      setProviders(list);
    });
  }, []);

  // Domain discovery as email is typed in SSO mode
  useEffect(() => {
    if (authMode === 'sso' && email.includes('@')) {
      setDiscovering(true);
      clientIdentityService.discoverDomain(email).then((res) => {
        setDiscovering(false);
        if (res.discovered && res.provider) {
          setDiscoveredProvider(res.provider);
        } else {
          setDiscoveredProvider(null);
        }
      });
    } else {
      setDiscoveredProvider(null);
    }
  }, [email, authMode]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
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

  const handleFederatedSsoLogin = async (provider: IdentityProvider) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Initiate OIDC flow
      const authReq = await clientIdentityService.startSso(provider.id);

      // 2. Synthesize signed OIDC token for the designated subject
      const targetSubject =
        provider.id === 'idp-contractor-google'
          ? 'alpha-sub-0091-ksingha'
          : email === 'r.sharma@oil-enterprise.com'
          ? 'oil-sub-889102-rsharma'
          : 'oil-sub-441092-psen';

      const groups =
        provider.id === 'idp-contractor-google'
          ? ['contractor-admins']
          : email === 'r.sharma@oil-enterprise.com'
          ? ['oil-safety-directors']
          : ['oil-hse-inspectors'];

      const tokenEmail =
        provider.id === 'idp-contractor-google'
          ? 'contractor.admin@alpha-contractors.com'
          : email || 'p.sen@oil-enterprise.com';

      const idToken = await clientIdentityService.simulateToken({
        provider_id: provider.id,
        subject: targetSubject,
        email: tokenEmail,
        groups,
        nonce: authReq.nonce,
        expiresInSec: 3600,
      });

      // 3. Submit callback to backend
      const cbRes = await clientIdentityService.submitSsoCallback({
        state: authReq.state,
        id_token: idToken,
      });

      setLoading(false);

      if (cbRes.success) {
        setSuccessMsg(
          `Federated SSO authenticated via ${provider.display_name}. Role: ${cbRes.session?.user.role}. Redirecting...`
        );
        setTimeout(() => {
          onNavigate('/dashboard');
        }, 600);
      } else {
        setErrorMsg(cbRes.error || 'Enterprise SSO authentication failed.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'SSO federation communication error.');
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
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <SuchakLogo variant="compact" size="lg" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white font-display">
              SUCHAK
            </h1>
            <p className="text-xs text-amber-400 font-semibold tracking-widest uppercase mt-1">
              Enterprise HSE Safety Intelligence Platform
            </p>
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Zero-Harm Incident Prevention • SIF Precursor Detection • OIDC Federated Identity Control
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-800/80 shadow-2xl backdrop-blur-sm text-slate-100">
          <CardContent className="p-6">
            {/* Mode Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('password')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    authMode === 'password'
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Password & Persona
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('sso')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    authMode === 'sso'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Enterprise SSO (OIDC)
                </button>
              </div>

              <Badge
                variant="outline"
                size="sm"
                className="border-indigo-500/40 text-indigo-400 bg-indigo-500/10 font-mono text-[10px]"
              >
                Enterprise IAM
              </Badge>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-red-950/50 border border-red-800 rounded-lg flex items-start gap-2.5 text-xs text-red-200">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Authentication Error</span>
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mt-4 p-3 bg-emerald-950/50 border border-emerald-800 rounded-lg flex items-start gap-2.5 text-xs text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Session Established</span>
                  <span>{successMsg}</span>
                </div>
              </div>
            )}

            {/* Password Login Mode */}
            {authMode === 'password' && (
              <form onSubmit={handlePasswordLogin} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Enterprise Email Address
                  </label>
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Security Password
                  </label>
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
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm shadow-md"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        Validating Credentials...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Authenticate with SUCHAK <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Enterprise SSO Mode */}
            {authMode === 'sso' && (
              <div className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Corporate Email (for Domain Discovery)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. p.sen@oil-enterprise.com or contractor@alpha-contractors.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  {discovering && (
                    <span className="text-[11px] text-indigo-400 mt-1 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Discovering identity federation provider...
                    </span>
                  )}
                  {discoveredProvider && (
                    <div className="mt-2 p-3 rounded-lg bg-indigo-950/60 border border-indigo-800 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-indigo-200">{discoveredProvider.display_name}</div>
                        <div className="text-[11px] text-slate-400">{discoveredProvider.organization_name}</div>
                      </div>
                      <Button
                        size="sm"
                        disabled={loading}
                        onClick={() => handleFederatedSsoLogin(discoveredProvider)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                      >
                        Single Sign-On
                      </Button>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <span className="font-semibold text-slate-400 block mb-2">Or select your Enterprise Identity Provider:</span>
                  <div className="space-y-2">
                    {providers.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleFederatedSsoLogin(p)}
                        disabled={loading}
                        className="w-full p-3 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-indigo-500 flex items-center justify-between transition-colors text-left"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                            {p.display_name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {p.organization_name} • Protocol: {p.provider_type}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="font-bold text-slate-300">Enterprise Architectural Principles:</div>
                  <div>• Identity Provider verifies WHO YOU ARE; SUCHAK dictates WHAT YOU CAN DO.</div>
                  <div>• Group memberships map directly to assigned roles with deterministic precedence.</div>
                  <div>• SSO Enabled represents generic enterprise readiness; no live OIL network integration.</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Demo Personas for Quick Switch Testing */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
            <span>Instant Demo Personas (Development & Evaluation)</span>
            <span className="text-[10px] text-slate-500">Click persona to populate credentials</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DEMO_PERSONAS.map((persona) => {
              const isSelected = email === persona.email;
              return (
                <button
                  key={persona.email}
                  type="button"
                  onClick={() => selectPersona(persona)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-amber-400/80 bg-amber-500/10 shadow-md'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white truncate max-w-[140px]">
                      {persona.name}
                    </span>
                    <Badge
                      variant={persona.role === 'OrgAdmin' ? 'default' : 'outline'}
                      size="sm"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {persona.role}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{persona.email}</div>
                  <div className="text-[10px] text-slate-500 mt-1 truncate">{persona.org}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
