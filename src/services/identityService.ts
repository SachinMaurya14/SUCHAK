/**
 * Client Identity & SSO Service
 * Phase 17 - Enterprise Identity, SSO/OIDC & Access Governance
 */
import { authService, AuthSessionData } from './authService.ts';

export interface IdentityProvider {
  id: string;
  organization_id: string;
  organization_name: string;
  provider_type: 'OIDC' | 'SAML' | 'LOCAL';
  display_name: string;
  issuer: string;
  client_id: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
  redirect_uri: string;
  scopes: string[];
  allowed_domains: string[];
  status: 'DRAFT' | 'CONFIGURED' | 'ACTIVE' | 'DISABLED';
  sso_policy: 'LOCAL_ONLY' | 'SSO_ONLY' | 'LOCAL_AND_SSO';
  enforce_pkce: boolean;
  allow_id_linking: boolean;
  has_secret_configured?: boolean;
  break_glass_user_id?: string;
  last_validated_at?: string | null;
  last_validation_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupRoleMapping {
  id: string;
  organization_id: string;
  provider_id: string;
  external_group: string;
  suchak_role: string;
  priority: number;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface IdentityLink {
  id: string;
  user_id: string;
  organization_id: string;
  provider_id: string;
  external_subject: string;
  external_email: string;
  external_username?: string;
  external_groups: string[];
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'PENDING';
  linked_at: string;
  last_authenticated_at: string | null;
  metadata?: {
    department?: string;
    job_title?: string;
    issuer?: string;
  };
}

export interface GovernanceUserItem {
  user_id: string;
  email: string;
  name: string;
  organization_id: string;
  organization_name: string;
  suchak_role: string;
  is_active: boolean;
  lifecycle_status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'PENDING';
  is_stale: boolean;
  days_since_last_login: number | null;
  last_login_at: string | null;
  has_external_link: boolean;
  provider_name?: string;
  external_subject?: string;
  external_groups: string[];
}

export interface AccessGovernanceSummary {
  timestamp: string;
  total_users: number;
  active_users: number;
  stale_users: number;
  suspended_users: number;
  sso_linked_users: number;
  local_only_users: number;
  privileged_admins_count: number;
  organizations_count: number;
  active_providers_count: number;
  users: GovernanceUserItem[];
}

export interface ComplianceControlItem {
  id: string;
  category:
    | 'AUTHENTICATION'
    | 'AUTHORIZATION'
    | 'ACCESS_REVIEW'
    | 'AUDIT'
    | 'DATA_MINIMIZATION'
    | 'SECURITY_LOGGING'
    | 'SECRET_MANAGEMENT'
    | 'INCIDENT_RESPONSE';
  control_code: string;
  name: string;
  description: string;
  status: 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED' | 'MANUAL_VERIFICATION';
  evidence: string;
  manual_action?: string;
}

export interface IdentityTelemetry {
  total_sso_attempts: number;
  successful_sso_logins: number;
  failed_sso_logins: number;
  active_identity_links: number;
  suspended_identity_links: number;
  active_providers: number;
  last_sso_login_at: string | null;
  recent_events: Array<{
    timestamp: string;
    event: string;
    actor_email?: string;
    provider_id?: string;
    outcome: string;
  }>;
}

class ClientIdentityService {
  private getHeaders(): HeadersInit {
    const token = authService.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Session-Token'] = token;
    }
    return headers;
  }

  // --- Public / Auth Endpoints ---

  public async getPublicProviders(): Promise<IdentityProvider[]> {
    try {
      const res = await fetch('/api/v1/auth/providers');
      if (!res.ok) throw new Error('Failed to load identity providers');
      const data = await res.json();
      return data.providers || [];
    } catch (err) {
      console.error('Error fetching public providers:', err);
      return [];
    }
  }

  public async discoverDomain(email: string): Promise<{
    discovered: boolean;
    provider?: IdentityProvider;
    organization?: { id: string; name: string };
    sso_policy?: string;
  }> {
    try {
      const res = await fetch('/api/v1/auth/discover-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return { discovered: false };
      return await res.json();
    } catch {
      return { discovered: false };
    }
  }

  public async startSso(providerId: string, redirectUri?: string): Promise<{
    authorizationUrl: string;
    state: string;
    nonce: string;
    code_challenge?: string;
    code_verifier?: string;
  }> {
    const res = await fetch('/api/v1/auth/sso/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: providerId, redirect_uri: redirectUri }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to initiate SSO request');
    }
    return data;
  }

  public async submitSsoCallback(params: {
    state: string;
    code?: string;
    id_token?: string;
  }): Promise<{ success: boolean; session?: AuthSessionData; error?: string; status?: number; account_status?: string }> {
    try {
      const res = await fetch('/api/v1/auth/sso/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error?.message || 'SSO authentication failed.',
          status: res.status,
          account_status: data.error?.account_status,
        };
      }

      const session: AuthSessionData = {
        token: data.token,
        user: {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          organization: data.user.organization_name,
          siteAccess: data.user.site_access,
          organization_id: data.user.organization_id,
          organization_name: data.user.organization_name,
          permissions: data.user.permissions || [],
        },
        expires_at: data.expires_at,
      };

      authService.saveSession(session);
      return { success: true, session };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during SSO callback' };
    }
  }

  public async enterpriseLogout(): Promise<void> {
    try {
      await fetch('/api/v1/auth/sso/logout', {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } catch (err) {
      console.warn('Enterprise logout warning:', err);
    }
    await authService.logout();
  }

  // --- Admin Governance Endpoints ---

  public async getAdminProviders(orgId?: string): Promise<IdentityProvider[]> {
    const url = orgId ? `/api/v1/admin/identity/providers?organization_id=${encodeURIComponent(orgId)}` : '/api/v1/admin/identity/providers';
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch providers');
    const data = await res.json();
    return data.providers || [];
  }

  public async createProvider(payload: Partial<IdentityProvider>): Promise<IdentityProvider> {
    const res = await fetch('/api/v1/admin/identity/providers', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to create provider');
    return data.provider;
  }

  public async updateProvider(id: string, payload: Partial<IdentityProvider>): Promise<IdentityProvider> {
    const res = await fetch(`/api/v1/admin/identity/providers/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update provider');
    return data.provider;
  }

  public async setProviderStatus(id: string, status: string): Promise<IdentityProvider> {
    const res = await fetch(`/api/v1/admin/identity/providers/${id}/status`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to change provider status');
    return data.provider;
  }

  public async validateProvider(id: string): Promise<{
    valid: boolean;
    diagnostics: Array<{ check: string; status: 'PASS' | 'WARN' | 'FAIL'; message: string }>;
    validated_at: string;
  }> {
    const res = await fetch(`/api/v1/admin/identity/providers/${id}/validate`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to run diagnostics');
    return data;
  }

  public async getGroupMappings(orgId?: string): Promise<GroupRoleMapping[]> {
    const url = orgId ? `/api/v1/admin/identity/mappings?organization_id=${encodeURIComponent(orgId)}` : '/api/v1/admin/identity/mappings';
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch group mappings');
    const data = await res.json();
    return data.mappings || [];
  }

  public async createGroupMapping(payload: Partial<GroupRoleMapping>): Promise<GroupRoleMapping> {
    const res = await fetch('/api/v1/admin/identity/mappings', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to create group mapping');
    return data.mapping;
  }

  public async deleteGroupMapping(id: string): Promise<void> {
    const res = await fetch(`/api/v1/admin/identity/mappings/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error?.message || 'Failed to delete group mapping');
    }
  }

  public async getIdentityLinks(orgId?: string): Promise<IdentityLink[]> {
    const url = orgId ? `/api/v1/admin/identity/links?organization_id=${encodeURIComponent(orgId)}` : '/api/v1/admin/identity/links';
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch identity links');
    const data = await res.json();
    return data.links || [];
  }

  public async setUserLifecycleStatus(userId: string, status: string, reason?: string): Promise<void> {
    const res = await fetch(`/api/v1/admin/identity/users/${userId}/status`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error?.message || 'Failed to update user status');
    }
  }

  public async unlinkIdentity(linkId: string): Promise<void> {
    const res = await fetch(`/api/v1/admin/identity/links/${linkId}/unlink`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error?.message || 'Failed to unlink identity');
    }
  }

  public async getGovernanceReport(orgId?: string): Promise<AccessGovernanceSummary> {
    const url = orgId ? `/api/v1/admin/identity/governance-report?organization_id=${encodeURIComponent(orgId)}` : '/api/v1/admin/identity/governance-report';
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch access governance report');
    return await res.json();
  }

  public async getComplianceMatrix(): Promise<ComplianceControlItem[]> {
    const res = await fetch('/api/v1/admin/identity/compliance-matrix', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch compliance control matrix');
    const data = await res.json();
    return data.controls || [];
  }

  public async getTelemetry(): Promise<IdentityTelemetry> {
    const res = await fetch('/api/v1/admin/identity/telemetry', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch identity telemetry');
    return await res.json();
  }

  public async simulateToken(params: {
    provider_id: string;
    subject: string;
    email: string;
    name?: string;
    groups?: string[];
    nonce?: string;
    expiresInSec?: number;
    customIssuer?: string;
    customAudience?: string;
    tamperSignature?: boolean;
  }): Promise<string> {
    const res = await fetch('/api/v1/admin/identity/simulate-token', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to generate token');
    return data.token;
  }

  public async runIdentitySuite(): Promise<any> {
    const res = await fetch('/api/v1/admin/identity/run-suite', {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to execute identity test suite');
    return data;
  }
}

export const clientIdentityService = new ClientIdentityService();
