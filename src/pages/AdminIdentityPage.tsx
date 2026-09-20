import React, { useState, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  Users,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  FileText,
  Layers,
  ExternalLink,
  Lock,
  Unlock,
  Settings,
  Clock,
  ArrowRight,
  Search,
  Download,
  Trash2,
  Plus,
  Activity,
  Check,
  ChevronRight,
  AlertCircle,
  Cpu,
  UserCheck,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Input } from '../components/ui/Input.tsx';
import {
  clientIdentityService,
  IdentityProvider,
  GroupRoleMapping,
  IdentityLink,
  AccessGovernanceSummary,
  ComplianceControlItem,
  IdentityTelemetry,
} from '../services/identityService.ts';

export const AdminIdentityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'providers' | 'mappings' | 'links' | 'governance' | 'compliance' | 'simulator'
  >('providers');

  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<IdentityProvider[]>([]);
  const [mappings, setMappings] = useState<GroupRoleMapping[]>([]);
  const [links, setLinks] = useState<IdentityLink[]>([]);
  const [governance, setGovernance] = useState<AccessGovernanceSummary | null>(null);
  const [complianceMatrix, setComplianceMatrix] = useState<ComplianceControlItem[]>([]);
  const [telemetry, setTelemetry] = useState<IdentityTelemetry | null>(null);

  // Diagnostic modal state
  const [selectedProvider, setSelectedProvider] = useState<IdentityProvider | null>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<any | null>(null);
  const [validatingProvider, setValidatingProvider] = useState(false);

  // Add Provider modal
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [newProvider, setNewProvider] = useState({
    display_name: '',
    organization_id: 'oil-india-demo',
    organization_name: 'Oil India Limited (Enterprise HSE)',
    provider_type: 'OIDC' as 'OIDC' | 'SAML' | 'LOCAL',
    issuer: 'https://login.microsoftonline.com/oil-tenant-id/v2.0',
    client_id: '',
    client_secret_ref: 'vault:sec-ref-custom-01',
    authorization_endpoint: 'https://login.microsoftonline.com/oil-tenant-id/oauth2/v2.0/authorize',
    token_endpoint: 'https://login.microsoftonline.com/oil-tenant-id/oauth2/v2.0/token',
    jwks_uri: 'https://login.microsoftonline.com/oil-tenant-id/discovery/v2.0/keys',
    redirect_uri: '/api/v1/auth/sso/callback',
    scopes: 'openid, profile, email, groups',
    allowed_domains: 'oil-enterprise.com',
    status: 'CONFIGURED' as 'CONFIGURED' | 'ACTIVE' | 'DISABLED',
    sso_policy: 'LOCAL_AND_SSO' as 'LOCAL_ONLY' | 'SSO_ONLY' | 'LOCAL_AND_SSO',
    enforce_pkce: true,
    allow_id_linking: true,
  });

  // Add Mapping modal
  const [showAddMappingModal, setShowAddMappingModal] = useState(false);
  const [newMapping, setNewMapping] = useState({
    organization_id: 'oil-india-demo',
    provider_id: 'idp-oil-entra',
    external_group: '',
    suchak_role: 'HSEOfficer',
    priority: 10,
    description: '',
  });

  // Precedence tester state
  const [testGroupsInput, setTestGroupsInput] = useState('oil-hse-inspectors, oil-safety-supervisors');
  const [precedenceResult, setPrecedenceResult] = useState<string | null>(null);

  // Verification suite state
  const [suiteRunning, setSuiteRunning] = useState(false);
  const [suiteSummary, setSuiteSummary] = useState<any | null>(null);

  // Live Token Sandbox
  const [simulatorSubject, setSimulatorSubject] = useState('oil-sub-441092-psen');
  const [simulatorEmail, setSimulatorEmail] = useState('p.sen@oil-enterprise.com');
  const [simulatorGroups, setSimulatorGroups] = useState('oil-hse-inspectors');
  const [simulatorTamperSig, setSimulatorTamperSig] = useState(false);
  const [simulatorExpired, setSimulatorExpired] = useState(false);
  const [simulatorResult, setSimulatorResult] = useState<any | null>(null);
  const [simulatorLoading, setSimulatorLoading] = useState(false);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [provList, mapList, linkList, govReport, compMatrix, telem] = await Promise.all([
        clientIdentityService.getAdminProviders(),
        clientIdentityService.getGroupMappings(),
        clientIdentityService.getIdentityLinks(),
        clientIdentityService.getGovernanceReport(),
        clientIdentityService.getComplianceMatrix(),
        clientIdentityService.getTelemetry(),
      ]);

      setProviders(provList);
      setMappings(mapList);
      setLinks(linkList);
      setGovernance(govReport);
      setComplianceMatrix(compMatrix);
      setTelemetry(telem);
    } catch (err: any) {
      console.error('Error loading identity data:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to load identity configurations.' });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateProvider = async (provider: IdentityProvider) => {
    setSelectedProvider(provider);
    setValidatingProvider(true);
    try {
      const diag = await clientIdentityService.validateProvider(provider.id);
      setDiagnosticResults(diag);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Validation request failed' });
    } finally {
      setValidatingProvider(false);
    }
  };

  const handleToggleProviderStatus = async (provider: IdentityProvider) => {
    const nextStatus = provider.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await clientIdentityService.setProviderStatus(provider.id, nextStatus);
      setStatusMessage({
        type: 'success',
        text: `Provider ${provider.display_name} transition to status: ${nextStatus}`,
      });
      loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Status transition rejected.' });
    }
  };

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await clientIdentityService.createProvider({
        ...newProvider,
        scopes: newProvider.scopes.split(',').map((s) => s.trim()),
        allowed_domains: newProvider.allowed_domains.split(',').map((s) => s.trim()),
      });
      setShowAddProviderModal(false);
      setStatusMessage({ type: 'success', text: `Identity Provider ${newProvider.display_name} created successfully.` });
      loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to register provider.' });
    }
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await clientIdentityService.createGroupMapping({
        organization_id: newMapping.organization_id,
        provider_id: newMapping.provider_id,
        external_group: newMapping.external_group.trim(),
        suchak_role: newMapping.suchak_role,
        priority: Number(newMapping.priority),
        description: newMapping.description,
      });
      setShowAddMappingModal(false);
      setStatusMessage({ type: 'success', text: `Group mapping for ${newMapping.external_group} established.` });
      loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create group mapping.' });
    }
  };

  const handleDeleteMapping = async (id: string, group: string) => {
    if (!confirm(`Are you sure you want to remove mapping for group "${group}"?`)) return;
    try {
      await clientIdentityService.deleteGroupMapping(id);
      setStatusMessage({ type: 'success', text: `Group mapping removed.` });
      loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to delete mapping.' });
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string, email: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await clientIdentityService.setUserLifecycleStatus(userId, nextStatus, 'Manual admin governance toggle');
      setStatusMessage({
        type: 'success',
        text: `Account ${email} lifecycle updated to ${nextStatus}. Active sessions purged.`,
      });
      loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update user status.' });
    }
  };

  const handleUnlinkIdentity = async (linkId: string, subject: string) => {
    if (!confirm(`Unlink external subject "${subject}"? Local SUCHAK account and past report history will be preserved.`))
      return;
    try {
      await clientIdentityService.unlinkIdentity(linkId);
      setStatusMessage({
        type: 'success',
        text: `External identity link ${subject} unlinked successfully. History preserved.`,
      });
      loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to unlink identity.' });
    }
  };

  const handleTestPrecedence = () => {
    const groups = testGroupsInput.split(',').map((g) => g.trim());
    const matched = mappings
      .filter((m) => groups.includes(m.external_group))
      .sort((a, b) => b.priority - a.priority);

    if (matched.length > 0) {
      setPrecedenceResult(
        `Resolved Role: ${matched[0].suchak_role} (Won by highest priority rule: "${matched[0].external_group}" at Priority ${matched[0].priority})`
      );
    } else {
      setPrecedenceResult('Resolved Role: Fallback Least Privilege (No mapped groups matched)');
    }
  };

  const handleRunSuite = async () => {
    setSuiteRunning(true);
    setSuiteSummary(null);
    try {
      const res = await clientIdentityService.runIdentitySuite();
      setSuiteSummary(res);
      setStatusMessage({
        type: 'success',
        text: `Identity Validation Suite executed: ${res.passed_tests}/${res.total_tests} vectors passed (${res.total_duration_ms}ms).`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Verification suite execution failed.' });
    } finally {
      setSuiteRunning(false);
    }
  };

  const handleSimulateToken = async () => {
    setSimulatorLoading(true);
    setSimulatorResult(null);
    try {
      const activeProvider = providers.find((p) => p.id === 'idp-oil-entra') || providers[0];
      const startRes = await clientIdentityService.startSso(activeProvider.id);

      const groups = simulatorGroups.split(',').map((g) => g.trim()).filter(Boolean);
      const idToken = await clientIdentityService.simulateToken({
        provider_id: activeProvider.id,
        subject: simulatorSubject,
        email: simulatorEmail,
        groups,
        nonce: startRes.nonce,
        expiresInSec: simulatorExpired ? -300 : 3600,
        tamperSignature: simulatorTamperSig,
      });

      const cbRes = await clientIdentityService.submitSsoCallback({
        state: startRes.state,
        id_token: idToken,
      });

      setSimulatorResult({
        start: startRes,
        token: idToken,
        callback: cbRes,
      });
    } catch (err: any) {
      setSimulatorResult({
        error: err.message || 'Simulation encountered an unexpected error.',
      });
    } finally {
      setSimulatorLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Enterprise Identity & Access Governance
            </h1>
            <Badge variant="outline" className="text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
              Phase 17
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enterprise federation, OIDC/SAML directory mapping, deterministic RBAC governance, and fail-closed security.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleRunSuite}
            disabled={suiteRunning}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Play className={`w-4 h-4 ${suiteRunning ? 'animate-spin' : ''}`} />
            Run 25-Vector Suite
          </Button>
        </div>
      </div>

      {/* Architectural Separation Callout Banner */}
      <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-sky-50/70 dark:from-indigo-950/30 dark:via-slate-900/30 dark:to-sky-950/30 space-y-2">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Zero-Trust Architecture: Identity Provider ≠ SUCHAK Authorization
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300 mt-2">
              <div className="p-2 rounded bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Authenticated ≠ Authorized:</span> External OIDC/SAML providers identify WHO the user is. SUCHAK authorization dictates WHAT the user may perform.
              </div>
              <div className="p-2 rounded bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Group Claim ≠ Admin:</span> External directory memberships require explicit, prioritized tenant mapping tables. Unknown groups default to least privilege.
              </div>
              <div className="p-2 rounded bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Fail-Closed & Generic:</span> SSO enabled represents a generic enterprise foundation. No live OIL network integration. If identity is ambiguous, access is strictly denied.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Message Notification */}
      {statusMessage && (
        <div
          className={`p-3 rounded-lg border flex items-center justify-between text-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-semibold underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Telemetry Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium">Active IdPs</span>
              <Building2 className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {telemetry?.active_providers ?? providers.filter((p) => p.status === 'ACTIVE').length}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Federated Providers</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium">Linked Users</span>
              <UserCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {telemetry?.active_identity_links ?? links.filter((l) => l.status === 'ACTIVE').length}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Active Subjects</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium">Group Mappings</span>
              <Layers className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {mappings.length}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">RBAC Rules</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium">Stale Accounts</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {governance?.stale_users ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">&gt; 90d Inactivity</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium">Suspended</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {telemetry?.suspended_identity_links ?? links.filter((l) => l.status === 'SUSPENDED').length}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Revoked Sessions</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium">SSO Successes</span>
              <CheckCircle2 className="w-4 h-4 text-teal-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {telemetry?.successful_sso_logins ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Logins Processed</span>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {[
            { id: 'providers', label: 'Identity Providers', icon: Building2, count: providers.length },
            { id: 'mappings', label: 'Group-to-Role Mappings', icon: Layers, count: mappings.length },
            { id: 'links', label: 'Identity Links & Lifecycle', icon: Users, count: links.length },
            { id: 'governance', label: 'Access Governance & Stale Accounts', icon: Clock, count: governance?.stale_users },
            { id: 'compliance', label: 'Compliance Control Matrix', icon: Shield, count: complianceMatrix.length },
            { id: 'simulator', label: 'Validation & Token Sandbox', icon: Cpu, badge: '25 Tests' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1.5 py-0.5 px-2 rounded-full text-xs font-semibold ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="ml-1.5 py-0.5 px-1.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab 1: Identity Providers */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Federated Identity Providers (IdP Registry)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-tenant OIDC and SAML identity configurations. Client secrets are stored as isolated vault references and strictly masked.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddProviderModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Register Identity Provider
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {providers.map((p) => {
              const isActive = p.status === 'ACTIVE';
              return (
                <Card key={p.id} className="overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base text-slate-900 dark:text-white">
                          {p.display_name}
                        </span>
                        <Badge
                          variant={isActive ? 'default' : 'outline'}
                          className={
                            isActive
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'text-slate-500 dark:text-slate-400'
                          }
                        >
                          {p.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {p.provider_type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          Policy: {p.sso_policy}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">Organization Tenant:</span>{' '}
                          {p.organization_name} <code className="text-[11px] px-1 bg-slate-100 dark:bg-slate-800 rounded">({p.organization_id})</code>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">Issuer URI:</span>{' '}
                          <code className="text-[11px] break-all">{p.issuer}</code>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">Client ID:</span>{' '}
                          <code className="text-[11px]">{p.client_id}</code>
                          <span className="ml-3 font-semibold text-slate-700 dark:text-slate-200">Vault Secret:</span>{' '}
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                            [ENCRYPTED VAULT REF CONFIGURED]
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">Allowed Domains:</span>
                          {p.allowed_domains.map((d) => (
                            <span
                              key={d}
                              className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800"
                            >
                              @{d}
                            </span>
                          ))}
                          <span className="ml-2 font-semibold text-slate-700 dark:text-slate-200">PKCE:</span>{' '}
                          <span>{p.enforce_pkce ? 'Enforced (S256)' : 'Disabled'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleValidateProvider(p)}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <Activity className="w-3.5 h-3.5 text-sky-600" />
                        Run Diagnostics
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleProviderStatus(p)}
                        className={`flex items-center gap-1.5 text-xs ${
                          isActive ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'
                        }`}
                      >
                        {isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        {isActive ? 'Disable Provider' : 'Activate Provider'}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Diagnostic Modal Drawer */}
          {selectedProvider && (
            <div className="p-5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                    Configuration Diagnostics: {selectedProvider.display_name}
                  </h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProvider(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>

              {validatingProvider && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 py-4">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                  Evaluating endpoints, JWKS reachability, and group-to-role coverage...
                </div>
              )}

              {diagnosticResults && !validatingProvider && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-sky-200/60 dark:border-sky-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Diagnostic Execution Status:{' '}
                      <span className={diagnosticResults.valid ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        {diagnosticResults.valid ? 'ALL VERIFICATIONS PASSED' : 'ATTENTION REQUIRED'}
                      </span>
                    </span>
                    <span className="text-slate-500">Timestamp: {new Date(diagnosticResults.validated_at).toLocaleTimeString()}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {diagnosticResults.diagnostics.map((d: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 flex items-start gap-2.5 text-xs"
                      >
                        {d.status === 'PASS' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                        {d.status === 'WARN' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                        {d.status === 'FAIL' && <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{d.check}:</span>{' '}
                          <span className="text-slate-600 dark:text-slate-300">{d.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Group-to-Role Mappings */}
      {activeTab === 'mappings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Enterprise Directory Group-to-Role Mappings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Maps external enterprise groups into SUCHAK RBAC roles. Explicit numerical priority solves conflicts deterministically.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddMappingModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Add Group Mapping
            </Button>
          </div>

          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Priority</th>
                    <th className="py-3 px-4 font-semibold">External Directory Group</th>
                    <th className="py-3 px-4 font-semibold">Assigned SUCHAK Role</th>
                    <th className="py-3 px-4 font-semibold">Tenant Organization</th>
                    <th className="py-3 px-4 font-semibold">Description / Scope</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {mappings.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {m.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-indigo-600 dark:text-indigo-400">
                        <code>{m.external_group}</code>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            m.suchak_role === 'OrgAdmin'
                              ? 'default'
                              : m.suchak_role === 'HSEOfficer'
                              ? 'outline'
                              : 'secondary'
                          }
                          className="font-medium"
                        >
                          {m.suchak_role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {m.organization_id}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                        {m.description || 'Enterprise role mapping policy.'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteMapping(m.id, m.external_group)}
                          className="text-rose-600 hover:text-rose-700 dark:text-rose-400 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Delete Mapping"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Interactive Precedence Conflict Tester */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Role Precedence Conflict Simulation
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              When an enterprise user belongs to multiple corporate groups, deterministic priority ordering dictates which SUCHAK role is granted.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Input
                value={testGroupsInput}
                onChange={(e) => setTestGroupsInput(e.target.value)}
                placeholder="Comma separated groups (e.g. oil-hse-inspectors, oil-safety-directors)"
                className="text-xs font-mono"
              />
              <Button size="sm" onClick={handleTestPrecedence} className="shrink-0 text-xs">
                Test Conflict Resolution
              </Button>
            </div>
            {precedenceResult && (
              <div className="p-2.5 rounded bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                {precedenceResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Identity Links & Lifecycle */}
      {activeTab === 'links' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Enterprise Linked Accounts & Deprovisioning
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Maintains external subject mappings. Deprovisioned or suspended enterprise accounts preserve safety reports, reviews, and CAPA actions for compliance auditing.
              </p>
            </div>
          </div>

          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-3 px-4 font-semibold">User / Email</th>
                    <th className="py-3 px-4 font-semibold">External Subject ID</th>
                    <th className="py-3 px-4 font-semibold">Account Status</th>
                    <th className="py-3 px-4 font-semibold">Mapped Groups</th>
                    <th className="py-3 px-4 font-semibold">Last SSO Authenticated</th>
                    <th className="py-3 px-4 font-semibold text-right">Lifecycle Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {links.map((l) => {
                    const isSuspended = l.status === 'SUSPENDED' || l.status === 'DISABLED';
                    return (
                      <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{l.external_email}</div>
                          <div className="text-[11px] text-slate-500">{l.metadata?.department || 'Operations'}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {l.external_subject}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={isSuspended ? 'danger' : 'default'}
                            className={
                              isSuspended
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }
                          >
                            {l.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {l.external_groups.map((g) => (
                              <span
                                key={g}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {l.last_authenticated_at ? new Date(l.last_authenticated_at).toLocaleString() : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleToggleUserStatus(l.user_id, l.status, l.external_email)}
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              isSuspended
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {isSuspended ? 'Reactivate' : 'Suspend'}
                          </button>

                          <button
                            onClick={() => handleUnlinkIdentity(l.id, l.external_subject)}
                            className="px-2 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                            title="Unlink Identity (Preserves user & reports)"
                          >
                            Unlink
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 4: Access Governance & Stale Accounts */}
      {activeTab === 'governance' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Quarterly Access Governance & Stale Account Review
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detects dormant accounts inactive for over 90 days, audits privileged administrator counts, and generates compliance export packages.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const jsonStr = JSON.stringify(governance, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `suchak-access-governance-report-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}
              className="flex items-center gap-2 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export Audit Package (JSON)
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Enterprise Users</span>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {governance?.total_users ?? 0}
              </div>
              <span className="text-[11px] text-slate-400">Across all provisioned tenants</span>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
              <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">Stale Inactive Accounts</span>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {governance?.stale_users ?? 0}
              </div>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">&gt; 90 days without login</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Privileged OrgAdmin Roles</span>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {governance?.privileged_admins_count ?? 0}
              </div>
              <span className="text-[11px] text-slate-400">High-privilege access holders</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">SSO vs Local Only</span>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {governance?.sso_linked_users ?? 0} / {governance?.local_only_users ?? 0}
              </div>
              <span className="text-[11px] text-slate-400">Federated identity coverage</span>
            </div>
          </div>

          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-3 px-4 font-semibold">User</th>
                    <th className="py-3 px-4 font-semibold">SUCHAK Role</th>
                    <th className="py-3 px-4 font-semibold">Tenant</th>
                    <th className="py-3 px-4 font-semibold">Last Login</th>
                    <th className="py-3 px-4 font-semibold">Days Inactive</th>
                    <th className="py-3 px-4 font-semibold">Governance Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {governance?.users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={u.suchak_role === 'OrgAdmin' ? 'default' : 'outline'}>
                          {u.suchak_role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{u.organization_name}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {u.days_since_last_login !== null ? `${u.days_since_last_login} days` : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        {u.is_stale ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            STALE (&gt;90d)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {u.is_stale && u.lifecycle_status === 'ACTIVE' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleUserStatus(u.user_id, 'ACTIVE', u.email)}
                            className="text-xs text-amber-600 hover:text-amber-700 h-7"
                          >
                            Suspend Dormant
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 5: Compliance Control Foundation */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Enterprise Compliance Control Foundation
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Objective mapping of security controls across 8 foundational domains. Zero fabricated claims — explicit distinction between automated controls and manual operational verification.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {complianceMatrix.map((ctl) => {
              const isImplemented = ctl.status === 'IMPLEMENTED';
              const isManual = ctl.status === 'MANUAL_VERIFICATION';

              return (
                <Card key={ctl.id} className="p-4 border border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1.5 max-w-3xl">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {ctl.control_code}
                        </span>
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{ctl.name}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/80">
                          {ctl.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{ctl.description}</p>
                      <div className="text-xs bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded border border-slate-200/60 dark:border-slate-800 space-y-1">
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-200">System Evidence:</span>{' '}
                          <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">{ctl.evidence}</span>
                        </div>
                        {ctl.manual_action && (
                          <div className="text-amber-700 dark:text-amber-400">
                            <span className="font-bold">Required Operational Action:</span> {ctl.manual_action}
                          </div>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant={isImplemented ? 'default' : isManual ? 'secondary' : 'outline'}
                      className={`shrink-0 text-xs ${
                        isImplemented
                          ? 'bg-emerald-600 text-white'
                          : isManual
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : ''
                      }`}
                    >
                      {ctl.status}
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 6: Validation & Token Sandbox */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          {/* Automated 25-Vector Suite Section */}
          <div className="p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Automated 25-Vector Identity & RBAC Verification Suite
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Tests RS256 cryptography, issuer/audience validation, tampering rejection, CSRF state, cross-tenant isolation, and fail-closed posture.
                </p>
              </div>

              <Button
                onClick={handleRunSuite}
                disabled={suiteRunning}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0 flex items-center gap-2"
              >
                <Play className={`w-3.5 h-3.5 ${suiteRunning ? 'animate-spin' : ''}`} />
                {suiteRunning ? 'Executing 25 Vectors...' : 'Execute Suite'}
              </Button>
            </div>

            {suiteSummary && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Results: {suiteSummary.passed_tests}/{suiteSummary.total_tests} Vectors Passed ({suiteSummary.total_duration_ms}ms)
                  </span>
                  <Badge
                    variant={suiteSummary.all_passed ? 'default' : 'danger'}
                    className={suiteSummary.all_passed ? 'bg-emerald-600 text-white' : ''}
                  >
                    {suiteSummary.all_passed ? 'SUITE PASSED (25/25)' : 'FAILURES DETECTED'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {suiteSummary.results.map((r: any) => (
                    <div
                      key={r.id}
                      className={`p-2.5 rounded border text-xs flex items-start gap-2 ${
                        r.passed
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-200'
                          : 'bg-rose-50/50 border-rose-200 text-rose-950 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-200'
                      }`}
                    >
                      {r.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">
                          {r.id}: {r.name}
                        </div>
                        <div className="text-[11px] opacity-80">{r.description}</div>
                        {r.error && <div className="text-[11px] font-mono text-rose-700 mt-1 font-semibold">{r.error}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Live OIDC Token Simulator */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                Live OIDC Ingress Simulator
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Craft and test synthetic OIDC tokens in real time. Simulate signature tampering, token expiration, and custom enterprise claims to observe live security verification.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Subject ID</label>
                <Input
                  value={simulatorSubject}
                  onChange={(e) => setSimulatorSubject(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email Claim</label>
                <Input
                  value={simulatorEmail}
                  onChange={(e) => setSimulatorEmail(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Enterprise Groups Claim</label>
                <Input
                  value={simulatorGroups}
                  onChange={(e) => setSimulatorGroups(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={simulatorTamperSig}
                  onChange={(e) => setSimulatorTamperSig(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-semibold text-rose-600">Tamper with RS256 Signature (Simulate Attack)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={simulatorExpired}
                  onChange={(e) => setSimulatorExpired(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-semibold text-amber-600">Simulate Expired Token (exp &lt; now)</span>
              </label>

              <Button
                size="sm"
                onClick={handleSimulateToken}
                disabled={simulatorLoading}
                className="ml-auto text-xs flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                {simulatorLoading ? 'Executing Simulation...' : 'Generate & Test SSO Ingress'}
              </Button>
            </div>

            {simulatorResult && (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700 font-sans font-bold">
                  <span>Server Ingress Outcome:</span>
                  <Badge
                    variant={simulatorResult.callback?.success ? 'default' : 'danger'}
                    className={simulatorResult.callback?.success ? 'bg-emerald-600 text-white' : ''}
                  >
                    {simulatorResult.callback?.success ? 'LOGIN SUCCEEDED' : 'ACCESS DENIED'}
                  </Badge>
                </div>

                {simulatorResult.callback?.error && (
                  <div className="text-rose-600 dark:text-rose-400 font-sans font-semibold">
                    Rejection Reason: {simulatorResult.callback.error}
                  </div>
                )}

                {simulatorResult.callback?.session && (
                  <div className="text-emerald-600 dark:text-emerald-400 font-sans">
                    Session Established for: {simulatorResult.callback.session.user.email} (Assigned Role: {simulatorResult.callback.session.user.role})
                  </div>
                )}

                {simulatorResult.token && (
                  <div className="pt-1">
                    <span className="text-slate-500 font-sans">Synthesized Token Payload Sample:</span>
                    <div className="p-2 rounded bg-slate-900 text-emerald-300 break-all text-[11px] mt-1 overflow-x-auto">
                      {simulatorResult.token}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Provider Modal */}
      {showAddProviderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Register Federated Identity Provider
            </h3>
            <form onSubmit={handleCreateProvider} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Display Name</label>
                <Input
                  required
                  value={newProvider.display_name}
                  onChange={(e) => setNewProvider({ ...newProvider, display_name: e.target.value })}
                  placeholder="e.g. Oil India Enterprise Entra ID"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Tenant Organization ID</label>
                <Input
                  required
                  value={newProvider.organization_id}
                  onChange={(e) => setNewProvider({ ...newProvider, organization_id: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Issuer URI</label>
                <Input
                  required
                  value={newProvider.issuer}
                  onChange={(e) => setNewProvider({ ...newProvider, issuer: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Client ID</label>
                  <Input
                    required
                    value={newProvider.client_id}
                    onChange={(e) => setNewProvider({ ...newProvider, client_id: e.target.value })}
                    placeholder="suchak-enterprise-app"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Vault Secret Reference</label>
                  <Input
                    required
                    value={newProvider.client_secret_ref}
                    onChange={(e) => setNewProvider({ ...newProvider, client_secret_ref: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Allowed Email Domains</label>
                  <Input
                    required
                    value={newProvider.allowed_domains}
                    onChange={(e) => setNewProvider({ ...newProvider, allowed_domains: e.target.value })}
                    placeholder="oil-enterprise.com"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">SSO Policy</label>
                  <select
                    value={newProvider.sso_policy}
                    onChange={(e) => setNewProvider({ ...newProvider, sso_policy: e.target.value as any })}
                    className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 text-xs"
                  >
                    <option value="LOCAL_AND_SSO">LOCAL_AND_SSO</option>
                    <option value="SSO_ONLY">SSO_ONLY</option>
                    <option value="LOCAL_ONLY">LOCAL_ONLY</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="enforce_pkce"
                  checked={newProvider.enforce_pkce}
                  onChange={(e) => setNewProvider({ ...newProvider, enforce_pkce: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="enforce_pkce" className="font-semibold">
                  Enforce PKCE (RFC 7636 S256 Challenge)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddProviderModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Save Provider
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Mapping Modal */}
      {showAddMappingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Create Enterprise Group-to-Role Mapping
            </h3>
            <form onSubmit={handleCreateMapping} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">External Directory Group</label>
                <Input
                  required
                  value={newMapping.external_group}
                  onChange={(e) => setNewMapping({ ...newMapping, external_group: e.target.value })}
                  placeholder="e.g. oil-field-safety-leads"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">SUCHAK Role</label>
                <select
                  value={newMapping.suchak_role}
                  onChange={(e) => setNewMapping({ ...newMapping, suchak_role: e.target.value })}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 text-xs"
                >
                  <option value="HSEOfficer">HSEOfficer</option>
                  <option value="SafetyReviewer">SafetyReviewer</option>
                  <option value="SiteManager">SiteManager</option>
                  <option value="OrgAdmin">OrgAdmin</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Priority (Higher Precedence = Wins Conflict)</label>
                <Input
                  type="number"
                  required
                  value={newMapping.priority}
                  onChange={(e) => setNewMapping({ ...newMapping, priority: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Description</label>
                <Input
                  value={newMapping.description}
                  onChange={(e) => setNewMapping({ ...newMapping, description: e.target.value })}
                  placeholder="e.g. Field inspectors authorized for incident review"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddMappingModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Save Mapping
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
