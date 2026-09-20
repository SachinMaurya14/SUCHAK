/**
 * Authentication & RBAC Service for SUCHAK
 * Supports real backend session tokens, role-based authorization,
 * fast persona testing, and automatic header injection.
 */
import { UserProfile, UserRole } from '../types/index.ts';

export interface AuthSessionData {
  token: string;
  user: UserProfile & {
    organization_id: string;
    organization_name: string;
    permissions: string[];
  };
  expires_at: string;
}

type AuthListener = (session: AuthSessionData | null) => void;

const TOKEN_KEY = 'suchak_session_token';
const SESSION_DATA_KEY = 'suchak_session_data';
const PREVIEW_ROLE_KEY = 'suchak_preview_role';

// Demo personas for instant fallback/testing
const DEMO_USERS: Record<UserRole, UserProfile> = {
  OrgAdmin: {
    id: 'usr-admin-01',
    name: 'Rajesh Sharma',
    email: 'r.sharma@oil-enterprise.com',
    role: 'OrgAdmin',
    organization: 'Oil India Limited (Enterprise HSE)',
    siteAccess: ['All Sites'],
  },
  HSEOfficer: {
    id: 'usr-hse-02',
    name: 'Priyanka Sen',
    email: 'p.sen@oil-enterprise.com',
    role: 'HSEOfficer',
    organization: 'Oil India Limited (Enterprise HSE)',
    siteAccess: ['Digboi Central', 'Duliajan Field', 'Numaligarh Ref'],
  },
  SafetyReviewer: {
    id: 'usr-rev-03',
    name: 'Anil Kakati',
    email: 'a.kakati@oil-enterprise.com',
    role: 'SafetyReviewer',
    organization: 'Oil India Limited (Enterprise HSE)',
    siteAccess: ['Duliajan Field'],
  },
  SiteManager: {
    id: 'usr-mgr-04',
    name: 'Bikram Borah',
    email: 'b.borah@oil-enterprise.com',
    role: 'SiteManager',
    organization: 'Oil India Limited (Enterprise HSE)',
    siteAccess: ['Digboi Central'],
  },
};

class AuthService {
  private listeners = new Set<AuthListener>();

  constructor() {
    // Check if token exists in storage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        // Auto-seed a demo HSE session so preview starts smoothly
        this.seedInitialPreviewSession();
      }
    }
  }

  private seedInitialPreviewSession() {
    const role = (localStorage.getItem(PREVIEW_ROLE_KEY) as UserRole) || 'HSEOfficer';
    const demo = DEMO_USERS[role] || DEMO_USERS.HSEOfficer;
    const session: AuthSessionData = {
      token: 'preview-token-' + role.toLowerCase(),
      user: {
        ...demo,
        organization_id: 'oil-india-demo',
        organization_name: 'Oil India Limited (Enterprise HSE)',
        permissions: [
          'reports.view',
          'reports.create',
          'reports.edit',
          'reports.export',
          'analysis.run',
          'analysis.view',
          'review.view',
          'actions.view',
          'actions.create',
          'alerts.view',
          'alerts.manage',
          'analytics.view',
          'evaluation.view',
          'model.view',
          'security.view',
        ],
      },
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    };
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(session));
  }

  public getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  public getSession(): AuthSessionData | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(SESSION_DATA_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public getCurrentUser(): UserProfile {
    const session = this.getSession();
    if (session?.user) {
      return session.user;
    }
    const role = this.getCurrentRole();
    return DEMO_USERS[role] || DEMO_USERS.HSEOfficer;
  }

  public getCurrentRole(): UserRole {
    const session = this.getSession();
    if (session?.user?.role) {
      return session.user.role;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(PREVIEW_ROLE_KEY) as UserRole | null;
      if (stored && DEMO_USERS[stored]) return stored;
    }
    return 'HSEOfficer';
  }

  public getPermissions(): string[] {
    const session = this.getSession();
    return session?.user?.permissions || [];
  }

  public hasPermission(permission: string): boolean {
    const role = this.getCurrentRole();
    if (role === 'OrgAdmin') return true;
    const perms = this.getPermissions();
    return perms.includes(permission);
  }

  public async login(email: string, passwordPlain: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: passwordPlain }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error?.message || 'Login failed' };
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

      localStorage.setItem(TOKEN_KEY, session.token);
      localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(session));
      localStorage.setItem(PREVIEW_ROLE_KEY, session.user.role);

      this.notifyListeners(session);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  }

  public saveSession(session: AuthSessionData): void {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(session));
    localStorage.setItem(PREVIEW_ROLE_KEY, session.user.role);
    this.notifyListeners(session);
  }

  public async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.warn('Logout network error:', err);
      }
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_DATA_KEY);
    this.notifyListeners(null);
  }

  public async switchPreviewRole(role: UserRole): Promise<UserProfile> {
    localStorage.setItem(PREVIEW_ROLE_KEY, role);

    const emailMap: Record<UserRole, { email: string; pass: string }> = {
      OrgAdmin: { email: 'r.sharma@oil-enterprise.com', pass: 'SuchakAdmin2026!' },
      HSEOfficer: { email: 'p.sen@oil-enterprise.com', pass: 'HseOfficer2026!' },
      SafetyReviewer: { email: 'a.kakati@oil-enterprise.com', pass: 'Reviewer2026!' },
      SiteManager: { email: 'b.borah@oil-enterprise.com', pass: 'SiteManager2026!' },
    };

    const target = emailMap[role] || emailMap.HSEOfficer;
    await this.login(target.email, target.pass);
    return this.getCurrentUser();
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(session: AuthSessionData | null) {
    for (const listener of this.listeners) {
      try {
        listener(session);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    }
  }
}

export const authService = new AuthService();
