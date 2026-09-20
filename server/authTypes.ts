/**
 * Authentication, Authorization, RBAC & Security Types for SUCHAK
 */

export type UserRole = 'OrgAdmin' | 'HSEOfficer' | 'SafetyReviewer' | 'SiteManager';

export type Permission =
  | 'reports.view'
  | 'reports.create'
  | 'reports.edit'
  | 'reports.export'
  | 'analysis.run'
  | 'analysis.view'
  | 'review.view'
  | 'review.assign'
  | 'review.manage'
  | 'actions.view'
  | 'actions.create'
  | 'actions.assign'
  | 'actions.verify'
  | 'actions.close'
  | 'alerts.view'
  | 'alerts.manage'
  | 'analytics.view'
  | 'analytics.export'
  | 'evaluation.view'
  | 'evaluation.run'
  | 'evaluation.export'
  | 'evaluation.approve'
  | 'model.view'
  | 'model.manage'
  | 'admin.users'
  | 'admin.roles'
  | 'admin.organization'
  | 'admin.settings'
  | 'audit.view'
  | 'security.view'
  | 'operations.manage';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization_id: string;
  organization_name: string;
  site_access: string[];
  password_hash: string;
  salt: string;
  is_active: boolean;
  failed_login_attempts: number;
  locked_until?: string | null;
  created_at: string;
  last_login_at?: string | null;
}

export interface OrganizationRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  tier: 'ENTERPRISE' | 'CONTRACTOR' | 'PILOT';
  created_at: string;
}

export interface AuthSession {
  token: string;
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  organization_id: string;
  organization_name: string;
  site_access: string[];
  permissions: Permission[];
  created_at: string;
  expires_at: string;
  last_active_at: string;
  ip_address?: string;
  user_agent?: string;
}

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'ACCOUNT_LOCKED'
  | 'PERMISSION_DENIED'
  | 'CROSS_SCOPE_ACCESS_BLOCKED'
  | 'TOKEN_REVOKED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SUSPICIOUS_REQUEST'
  | 'EXPORT_EXECUTED'
  | 'MODEL_REGISTRY_MUTATION'
  | 'GOVERNANCE_DECISION'
  | 'SECRET_CONFIG_VALIDATION';

export interface SecurityEventRecord {
  id: string;
  event_type: SecurityEventType;
  actor_id?: string;
  actor_email?: string;
  actor_role?: string;
  organization_id?: string;
  target_resource?: string;
  action_summary: string;
  request_id?: string;
  ip_address?: string;
  outcome: 'SUCCESS' | 'DENIED' | 'BLOCKED' | 'WARNING';
  details?: Record<string, any>;
  timestamp: string;
}

/**
 * Standard RBAC mapping of Role to Permissions
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OrgAdmin: [
    'reports.view',
    'reports.create',
    'reports.edit',
    'reports.export',
    'analysis.run',
    'analysis.view',
    'review.view',
    'review.assign',
    'review.manage',
    'actions.view',
    'actions.create',
    'actions.assign',
    'actions.verify',
    'actions.close',
    'alerts.view',
    'alerts.manage',
    'analytics.view',
    'analytics.export',
    'evaluation.view',
    'evaluation.run',
    'evaluation.export',
    'evaluation.approve',
    'model.view',
    'model.manage',
    'admin.users',
    'admin.roles',
    'admin.organization',
    'admin.settings',
    'audit.view',
    'security.view',
    'operations.manage',
  ],
  HSEOfficer: [
    'reports.view',
    'reports.create',
    'reports.edit',
    'reports.export',
    'analysis.run',
    'analysis.view',
    'review.view',
    'review.assign',
    'review.manage',
    'actions.view',
    'actions.create',
    'actions.assign',
    'actions.verify',
    'actions.close',
    'alerts.view',
    'alerts.manage',
    'analytics.view',
    'analytics.export',
    'evaluation.view',
    'evaluation.run',
    'evaluation.export',
    'model.view',
    'audit.view',
    'security.view',
  ],
  SafetyReviewer: [
    'reports.view',
    'analysis.view',
    'review.view',
    'review.manage',
    'actions.view',
    'actions.create',
    'actions.assign',
    'alerts.view',
    'analytics.view',
    'evaluation.view',
    'audit.view',
  ],
  SiteManager: [
    'reports.view',
    'reports.create',
    'analysis.view',
    'review.view',
    'actions.view',
    'actions.verify',
    'actions.close',
    'alerts.view',
    'analytics.view',
  ],
};
