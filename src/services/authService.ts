/**
 * Auth Service Foundation
 * Architecture stub for Phase 2+ RBAC and authentication.
 */
import { UserProfile, UserRole } from '../types/index.ts';

// Phase 1 preview mock user profile
const DEMO_USERS: Record<UserRole, UserProfile> = {
  OrgAdmin: {
    id: 'usr-admin-01',
    name: 'Rajesh Sharma',
    email: 'r.sharma@oil-enterprise.com',
    role: 'OrgAdmin',
    organization: 'OIL Explorations Ltd.',
    siteAccess: ['All Sites'],
  },
  HSEOfficer: {
    id: 'usr-hse-02',
    name: 'Priyanka Sen',
    email: 'p.sen@oil-enterprise.com',
    role: 'HSEOfficer',
    organization: 'OIL Explorations Ltd.',
    siteAccess: ['Digboi Central', 'Duliajan Field', 'Numaligarh Ref'],
  },
  SafetyReviewer: {
    id: 'usr-rev-03',
    name: 'Anil Kakati',
    email: 'a.kakati@oil-enterprise.com',
    role: 'SafetyReviewer',
    organization: 'OIL Explorations Ltd.',
    siteAccess: ['Duliajan Field'],
  },
  SiteManager: {
    id: 'usr-mgr-04',
    name: 'Bikram Borah',
    email: 'b.borah@oil-enterprise.com',
    role: 'SiteManager',
    organization: 'OIL Explorations Ltd.',
    siteAccess: ['Digboi Central'],
  },
};

export const authService = {
  getCurrentRole(): UserRole {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('suchak_preview_role') as UserRole | null;
      if (stored && DEMO_USERS[stored]) return stored;
    }
    return 'HSEOfficer';
  },

  getCurrentUser(): UserProfile {
    const role = this.getCurrentRole();
    return DEMO_USERS[role];
  },

  switchPreviewRole(role: UserRole): UserProfile {
    if (typeof window !== 'undefined') {
      localStorage.setItem('suchak_preview_role', role);
    }
    return DEMO_USERS[role];
  },
};
