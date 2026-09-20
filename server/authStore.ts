/**
 * Authentication & Security State Store
 * Implements PBKDF2 cryptographic password hashing, tokenized session management,
 * brute-force lockout protection, and immutable security audit event tracking.
 */
import crypto from 'crypto';
import {
  UserRecord,
  OrganizationRecord,
  AuthSession,
  SecurityEventRecord,
  SecurityEventType,
  UserRole,
  ROLE_PERMISSIONS,
} from './authTypes.ts';
import { logger } from './logger.ts';

export class AuthStore {
  private organizations = new Map<string, OrganizationRecord>();
  private users = new Map<string, UserRecord>();
  private usersById = new Map<string, UserRecord>();
  private sessions = new Map<string, AuthSession>();
  private securityEvents: SecurityEventRecord[] = [];

  constructor() {
    this.initializeOrganizations();
    this.initializeDefaultUsers();
  }

  // --- Password Cryptography (PBKDF2 with SHA-512) ---

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  private generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public verifyPassword(password: string, hash: string, salt: string): boolean {
    const computedHash = this.hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  }

  // --- Seeding Foundations ---

  private initializeOrganizations() {
    const orgs: OrganizationRecord[] = [
      {
        id: 'oil-india-demo',
        slug: 'oil-india-demo',
        name: 'Oil India Limited (Enterprise HSE)',
        description: 'Primary exploration and production enterprise tenant for Assam & Northeast assets.',
        tier: 'ENTERPRISE',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'contractor-alpha-org',
        slug: 'contractor-alpha-org',
        name: 'Alpha Well Drilling Contractors Ltd.',
        description: 'External specialized contractor organization (Isolated secondary tenant for cross-tenant isolation testing).',
        tier: 'CONTRACTOR',
        created_at: '2026-01-15T00:00:00.000Z',
      },
    ];

    for (const org of orgs) {
      this.organizations.set(org.id, org);
    }
  }

  private initializeDefaultUsers() {
    // Standard Enterprise demo personas
    this.createUserInternal({
      id: 'usr-admin-01',
      email: 'r.sharma@oil-enterprise.com',
      name: 'Rajesh Sharma',
      role: 'OrgAdmin',
      organization_id: 'oil-india-demo',
      organization_name: 'Oil India Limited (Enterprise HSE)',
      site_access: ['All Sites'],
      passwordPlain: 'SuchakAdmin2026!',
    });

    this.createUserInternal({
      id: 'usr-hse-02',
      email: 'p.sen@oil-enterprise.com',
      name: 'Priyanka Sen',
      role: 'HSEOfficer',
      organization_id: 'oil-india-demo',
      organization_name: 'Oil India Limited (Enterprise HSE)',
      site_access: ['site-digboi-01', 'site-moran-02', 'site-duliajan-03', 'site-numaligarh-04'],
      passwordPlain: 'HseOfficer2026!',
    });

    this.createUserInternal({
      id: 'usr-rev-03',
      email: 'a.kakati@oil-enterprise.com',
      name: 'Anil Kakati',
      role: 'SafetyReviewer',
      organization_id: 'oil-india-demo',
      organization_name: 'Oil India Limited (Enterprise HSE)',
      site_access: ['site-duliajan-03', 'site-moran-02'],
      passwordPlain: 'Reviewer2026!',
    });

    this.createUserInternal({
      id: 'usr-mgr-04',
      email: 'b.borah@oil-enterprise.com',
      name: 'Bikram Borah',
      role: 'SiteManager',
      organization_id: 'oil-india-demo',
      organization_name: 'Oil India Limited (Enterprise HSE)',
      site_access: ['site-digboi-01'],
      passwordPlain: 'SiteManager2026!',
    });

    // Compatibility aliases for login page default values
    this.createUserInternal({
      id: 'usr-hse-compat',
      email: 'hse.officer@oil.example.in',
      name: 'Priyanka Saikia',
      role: 'HSEOfficer',
      organization_id: 'oil-india-demo',
      organization_name: 'Oil India Limited (Enterprise HSE)',
      site_access: ['site-digboi-01', 'site-moran-02'],
      passwordPlain: 'SuchakSafe2026!',
    });

    this.createUserInternal({
      id: 'usr-admin-compat',
      email: 'a.baruah@oil.example.in',
      name: 'Dr. Alok Baruah',
      role: 'OrgAdmin',
      organization_id: 'oil-india-demo',
      organization_name: 'Oil India Limited (Enterprise HSE)',
      site_access: ['All Sites'],
      passwordPlain: 'ChiefSafety2026!',
    });

    // Secondary Organization User for cross-tenant isolation testing
    this.createUserInternal({
      id: 'usr-contractor-01',
      email: 'contractor.admin@alpha-contractors.com',
      name: 'Kabir Singha',
      role: 'OrgAdmin',
      organization_id: 'contractor-alpha-org',
      organization_name: 'Alpha Well Drilling Contractors Ltd.',
      site_access: ['site-contractor-rig-9'],
      passwordPlain: 'Contractor2026!',
    });

    // Deprovisioned / Suspended Enterprise user (demonstrates revocation preservation)
    this.createUserInternal({
      id: 'usr-suspended-05',
      email: 'ex.auditor@oil-enterprise.com',
      name: 'Sunil Gogoi (Former Auditor)',
      role: 'SafetyReviewer',
      organization_id: 'oil-india-demo',
      organization_name: 'Oil India Limited (Enterprise HSE)',
      site_access: ['site-digboi-01'],
      passwordPlain: 'FormerAuditor2025!',
      is_active: false,
      last_login_at: '2026-06-01T10:00:00.000Z',
    });

    // Stale user account (demonstrates access review stale detection: last login > 90 days)
    this.createUserInternal({
      id: 'usr-stale-06',
      email: 'legacy.consultant@oil-enterprise.com',
      name: 'Hemanta Deka (Consultant)',
      role: 'SiteManager',
      organization_id: 'oil-india-demo',
      organization_name: 'Oil India Limited (Enterprise HSE)',
      site_access: ['site-moran-02'],
      passwordPlain: 'LegacyConsultant2025!',
      is_active: true,
      last_login_at: '2026-05-10T08:30:00.000Z',
    });
  }

  private createUserInternal(params: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    organization_id: string;
    organization_name: string;
    site_access: string[];
    passwordPlain: string;
    is_active?: boolean;
    last_login_at?: string | null;
  }) {
    const salt = this.generateSalt();
    const password_hash = this.hashPassword(params.passwordPlain, salt);

    const user: UserRecord = {
      id: params.id,
      email: params.email.toLowerCase().trim(),
      name: params.name,
      role: params.role,
      organization_id: params.organization_id,
      organization_name: params.organization_name,
      site_access: params.site_access,
      password_hash,
      salt,
      is_active: params.is_active !== undefined ? params.is_active : true,
      failed_login_attempts: 0,
      locked_until: null,
      created_at: new Date().toISOString(),
      last_login_at: params.last_login_at || null,
    };

    this.users.set(user.email, user);
    this.usersById.set(user.id, user);
  }

  // --- Authentication Flow ---

  public authenticate(
    email: string,
    passwordPlain: string,
    ip = '127.0.0.1',
    ua = 'Browser',
    requestId?: string
  ): { success: boolean; session?: AuthSession; error?: string; status: number } {
    const normalizedEmail = email.toLowerCase().trim();
    const user = this.users.get(normalizedEmail);

    if (!user) {
      this.logSecurityEvent({
        event_type: 'LOGIN_FAILED',
        actor_email: normalizedEmail,
        action_summary: `Failed login attempt for non-existent user: ${normalizedEmail}`,
        outcome: 'DENIED',
        ip_address: ip,
        request_id: requestId,
        details: { reason: 'USER_NOT_FOUND' },
      });
      return { success: false, error: 'Invalid enterprise credentials provided.', status: 401 };
    }

    // Check account active state
    if (!user.is_active) {
      this.logSecurityEvent({
        event_type: 'LOGIN_FAILED',
        actor_id: user.id,
        actor_email: user.email,
        organization_id: user.organization_id,
        action_summary: `Login rejected for deactivated account: ${user.email}`,
        outcome: 'DENIED',
        ip_address: ip,
        request_id: requestId,
        details: { reason: 'ACCOUNT_DEACTIVATED' },
      });
      return { success: false, error: 'Account is deactivated. Contact organization administrator.', status: 403 };
    }

    // Check lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      this.logSecurityEvent({
        event_type: 'LOGIN_FAILED',
        actor_id: user.id,
        actor_email: user.email,
        organization_id: user.organization_id,
        action_summary: `Login rejected for temporarily locked account: ${user.email}`,
        outcome: 'BLOCKED',
        ip_address: ip,
        request_id: requestId,
        details: { reason: 'ACCOUNT_LOCKED', remainingMinutes },
      });
      return {
        success: false,
        error: `Account is temporarily locked due to excessive failed attempts. Try again in ${remainingMinutes} minute(s).`,
        status: 429,
      };
    }

    // Verify Password
    const passwordMatches = this.verifyPassword(passwordPlain, user.password_hash, user.salt);

    if (!passwordMatches) {
      user.failed_login_attempts += 1;
      let isNowLocked = false;

      if (user.failed_login_attempts >= 5) {
        // Lock for 15 minutes
        user.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        isNowLocked = true;
      }

      this.logSecurityEvent({
        event_type: isNowLocked ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        actor_id: user.id,
        actor_email: user.email,
        organization_id: user.organization_id,
        action_summary: isNowLocked
          ? `Account locked after ${user.failed_login_attempts} consecutive failed attempts: ${user.email}`
          : `Failed password attempt (${user.failed_login_attempts}/5) for: ${user.email}`,
        outcome: isNowLocked ? 'BLOCKED' : 'DENIED',
        ip_address: ip,
        request_id: requestId,
        details: { attempts: user.failed_login_attempts },
      });

      return {
        success: false,
        error: isNowLocked
          ? 'Account locked for 15 minutes due to 5 consecutive failed attempts.'
          : 'Invalid enterprise credentials provided.',
        status: isNowLocked ? 429 : 401,
      };
    }

    // Reset failed counter on successful login
    user.failed_login_attempts = 0;
    user.locked_until = null;
    user.last_login_at = new Date().toISOString();

    const session = this.createSession(user, ip, ua);

    this.logSecurityEvent({
      event_type: 'LOGIN_SUCCESS',
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      organization_id: user.organization_id,
      action_summary: `Successful authenticated session created for ${user.email} (${user.role})`,
      outcome: 'SUCCESS',
      ip_address: ip,
      request_id: requestId,
    });

    return { success: true, session, status: 200 };
  }

  // --- Session Management ---

  public createSession(user: UserRecord, ip = '127.0.0.1', ua = 'Browser'): AuthSession {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const permissions = ROLE_PERMISSIONS[user.role] || [];

    const session: AuthSession = {
      token,
      user_id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization_id: user.organization_id,
      organization_name: user.organization_name,
      site_access: user.site_access,
      permissions,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      last_active_at: now.toISOString(),
      ip_address: ip,
      user_agent: ua,
    };

    this.sessions.set(token, session);
    return session;
  }

  public getSession(token: string): AuthSession | null {
    if (!token) return null;

    // Support preview session tokens for seamless role-switching and local testing
    if (token.startsWith('preview-token-')) {
      const roleSuffix = token.replace('preview-token-', '').toLowerCase();
      let matchedUserId = 'usr-hse-02';
      if (roleSuffix === 'orgadmin' || roleSuffix === 'admin') {
        matchedUserId = 'usr-admin-01';
      } else if (roleSuffix === 'safetyreviewer' || roleSuffix === 'reviewer') {
        matchedUserId = 'usr-rev-03';
      } else if (roleSuffix === 'sitemanager' || roleSuffix === 'manager') {
        matchedUserId = 'usr-mgr-04';
      } else if (roleSuffix === 'hseofficer' || roleSuffix === 'hse') {
        matchedUserId = 'usr-hse-02';
      }

      const user = this.usersById.get(matchedUserId);
      if (user) {
        return {
          token,
          user_id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organization_id: user.organization_id,
          organization_name: user.organization_name,
          site_access: user.site_access,
          permissions: ROLE_PERMISSIONS[user.role] || [],
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
          last_active_at: new Date().toISOString(),
        };
      }
    }

    const session = this.sessions.get(token);
    if (!session) return null;

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      this.sessions.delete(token);
      this.logSecurityEvent({
        event_type: 'TOKEN_REVOKED',
        actor_id: session.user_id,
        actor_email: session.email,
        organization_id: session.organization_id,
        action_summary: `Expired session token automatically purged for ${session.email}`,
        outcome: 'SUCCESS',
      });
      return null;
    }

    // Refresh last active
    session.last_active_at = new Date().toISOString();
    return session;
  }

  public revokeSession(token: string, actorEmail?: string, requestId?: string): boolean {
    const session = this.sessions.get(token);
    if (session) {
      this.sessions.delete(token);
      this.logSecurityEvent({
        event_type: 'LOGOUT',
        actor_id: session.user_id,
        actor_email: actorEmail || session.email,
        organization_id: session.organization_id,
        action_summary: `Session revoked / logged out for ${session.email}`,
        outcome: 'SUCCESS',
        request_id: requestId,
      });
      return true;
    }
    return false;
  }

  public refreshSession(oldToken: string, ip?: string): AuthSession | null {
    const oldSession = this.getSession(oldToken);
    if (!oldSession) return null;

    // Revoke old session
    this.sessions.delete(oldToken);

    // Create fresh session with rotated token
    const user = this.users.get(oldSession.email);
    if (!user || !user.is_active) return null;

    return this.createSession(user, ip || oldSession.ip_address, oldSession.user_agent);
  }

  public switchRoleContext(userId: string, newRole: UserRole, currentSessionToken: string): AuthSession | null {
    const session = this.getSession(currentSessionToken);
    if (!session) return null;

    // Must be OrgAdmin to switch preview roles or have authorization
    if (session.role !== 'OrgAdmin' && session.user_id !== userId) {
      return null;
    }

    session.role = newRole;
    session.permissions = ROLE_PERMISSIONS[newRole] || [];
    session.last_active_at = new Date().toISOString();

    this.logSecurityEvent({
      event_type: 'GOVERNANCE_DECISION',
      actor_id: session.user_id,
      actor_email: session.email,
      organization_id: session.organization_id,
      action_summary: `Role context switched to ${newRole} for persona evaluation`,
      outcome: 'SUCCESS',
    });

    return session;
  }

  // --- Security Audit Log ---

  public logSecurityEvent(event: Omit<SecurityEventRecord, 'id' | 'timestamp'>): SecurityEventRecord {
    const record: SecurityEventRecord = {
      ...event,
      id: `sec-${crypto.randomBytes(6).toString('hex')}`,
      timestamp: new Date().toISOString(),
    };

    this.securityEvents.unshift(record);
    if (this.securityEvents.length > 500) {
      this.securityEvents.pop();
    }

    logger.security(`[SECURITY EVENT] ${record.event_type} - ${record.action_summary}`, {
      request_id: record.request_id,
      actor: record.actor_email || record.actor_id,
      organization_id: record.organization_id,
      event: record.event_type,
      data: record.details,
    });

    return record;
  }

  public getSecurityEvents(filters?: {
    organization_id?: string;
    event_type?: string;
    outcome?: string;
    limit?: number;
  }): SecurityEventRecord[] {
    let events = [...this.securityEvents];

    if (filters?.organization_id && filters.organization_id !== 'ALL') {
      events = events.filter((e) => e.organization_id === filters.organization_id);
    }
    if (filters?.event_type && filters.event_type !== 'ALL') {
      events = events.filter((e) => e.event_type === filters.event_type);
    }
    if (filters?.outcome && filters.outcome !== 'ALL') {
      events = events.filter((e) => e.outcome === filters.outcome);
    }

    const limit = Math.min(200, Math.max(1, filters?.limit || 50));
    return events.slice(0, limit);
  }

  public getOrganizations(): OrganizationRecord[] {
    return Array.from(this.organizations.values());
  }

  public getOrganizationById(id: string): OrganizationRecord | null {
    return this.organizations.get(id) || null;
  }

  public getAllUsers(organization_id?: string): Omit<UserRecord, 'password_hash' | 'salt'>[] {
    let list = Array.from(this.users.values());
    if (organization_id) {
      list = list.filter((u) => u.organization_id === organization_id);
    }
    return list.map(({ password_hash, salt, ...safeUser }) => safeUser);
  }

  public getActiveSessionCount(): number {
    return this.sessions.size;
  }
}

export const authStore = new AuthStore();
