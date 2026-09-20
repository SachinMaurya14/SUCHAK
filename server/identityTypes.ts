/**
 * Enterprise Identity, SSO/OIDC, Directory Integration & Access Governance Types
 * Phase 17 - SUCHAK Platform
 */
import { UserRole } from './authTypes.ts';

export type IdentityProviderType = 'OIDC' | 'SAML' | 'LOCAL';

export type IdpStatus = 'DRAFT' | 'CONFIGURED' | 'ACTIVE' | 'DISABLED';

export type SsoPolicy = 'LOCAL_ONLY' | 'SSO_ONLY' | 'LOCAL_AND_SSO';

export type AccountLifecycleStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'PENDING';

export interface IdentityProviderConfig {
  id: string;
  organization_id: string;
  organization_name: string;
  provider_type: IdentityProviderType;
  display_name: string;
  issuer: string;
  client_id: string;
  client_secret_ref: string; // Stored as reference ID (e.g. vault:sec-idp-01), never raw secret
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
  redirect_uri: string;
  scopes: string[];
  allowed_domains: string[];
  status: IdpStatus;
  sso_policy: SsoPolicy;
  enforce_pkce: boolean;
  allow_id_linking: boolean;
  break_glass_user_id?: string;
  last_validated_at?: string | null;
  last_validation_error?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type SafeIdentityProviderConfig = Omit<IdentityProviderConfig, 'client_secret_ref'> & {
  has_secret_configured: boolean;
};

export interface ExternalIdentityLink {
  id: string;
  user_id: string;
  organization_id: string;
  provider_id: string;
  external_subject: string;
  external_email: string;
  external_username?: string;
  external_groups: string[];
  status: AccountLifecycleStatus;
  linked_at: string;
  last_authenticated_at: string | null;
  metadata?: {
    issuer?: string;
    department?: string;
    job_title?: string;
    upn?: string;
  };
}

export interface GroupRoleMapping {
  id: string;
  organization_id: string;
  provider_id: string;
  external_group: string;
  suchak_role: UserRole;
  priority: number; // Higher number = higher precedence during role conflict resolution
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface OidcAuthRequestState {
  state: string;
  nonce: string;
  code_verifier?: string;
  code_challenge?: string;
  provider_id: string;
  organization_id: string;
  redirect_uri: string;
  created_at: number;
  expires_at: number;
}

export interface OidcTokenPayload {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  nbf?: number;
  iat: number;
  nonce?: string;
  email?: string;
  name?: string;
  groups?: string[];
  department?: string;
  job_title?: string;
  [key: string]: any;
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

export interface AccessGovernanceUserItem {
  user_id: string;
  email: string;
  name: string;
  organization_id: string;
  organization_name: string;
  suchak_role: UserRole;
  is_active: boolean;
  lifecycle_status: AccountLifecycleStatus;
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
  stale_users: number; // Inactive > 90 days
  suspended_users: number;
  sso_linked_users: number;
  local_only_users: number;
  privileged_admins_count: number;
  organizations_count: number;
  active_providers_count: number;
  users: AccessGovernanceUserItem[];
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
