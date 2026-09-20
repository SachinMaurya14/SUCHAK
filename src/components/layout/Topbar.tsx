import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Laptop,
  Check,
  User,
  Activity,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Home,
} from 'lucide-react';
import { useTheme } from '../../lib/theme.tsx';
import { authService } from '../../services/authService.ts';
import { healthService } from '../../services/healthService.ts';
import { UserRole } from '../../types/index.ts';
import { IconButton } from '../ui/IconButton.tsx';
import { Badge } from '../ui/Badge.tsx';

export interface TopbarProps {
  currentPath: string;
  onOpenMobileMenu: () => void;
  onNavigate: (path: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentPath,
  onOpenMobileMenu,
  onNavigate,
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'unreachable'>('checking');
  
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const themeMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Check health check status from backend
  useEffect(() => {
    let isMounted = true;
    healthService
      .checkRootHealth()
      .then((res) => {
        if (isMounted && res.status === 'ok') setHealthStatus('healthy');
      })
      .catch(() => {
        if (isMounted) setHealthStatus('unreachable');
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleChange = (role: UserRole) => {
    const updated = authService.switchPreviewRole(role);
    setCurrentUser(updated);
    setShowUserMenu(false);
  };

  const getBreadcrumbs = (path: string): { label: string; path?: string }[] => {
    const crumbs: { label: string; path?: string }[] = [
      { label: 'Home', path: '/dashboard' },
    ];

    if (path === '/' || path === '/dashboard') {
      crumbs.push({ label: 'Dashboard' });
    } else if (path.startsWith('/evaluate')) {
      crumbs.push({ label: 'Evaluate Report' });
    } else if (path.startsWith('/reports/')) {
      crumbs.push({ label: 'Reports', path: '/reports' });
      crumbs.push({ label: path.split('/reports/')[1] || 'Report Details' });
    } else if (path.startsWith('/reports')) {
      crumbs.push({ label: 'Reports' });
    } else if (path.startsWith('/review')) {
      crumbs.push({ label: 'Review Queue' });
    } else if (path.startsWith('/rules/')) {
      crumbs.push({ label: 'Safety Rules', path: '/rules' });
      crumbs.push({ label: 'Rule Details' });
    } else if (path.startsWith('/rules')) {
      crumbs.push({ label: 'Safety Rules' });
    } else if (path.startsWith('/ask')) {
      crumbs.push({ label: 'Ask SUCHAK' });
    } else if (path.startsWith('/patterns')) {
      crumbs.push({ label: 'Patterns' });
    } else if (path.startsWith('/sites')) {
      crumbs.push({ label: 'Site Risk' });
    } else if (path.startsWith('/activities')) {
      crumbs.push({ label: 'Activity Risk' });
    } else if (path.startsWith('/analytics')) {
      crumbs.push({ label: 'Analytics' });
    } else if (path.startsWith('/alerts')) {
      crumbs.push({ label: 'Alerts' });
    } else if (path.startsWith('/actions')) {
      crumbs.push({ label: 'Action Center' });
    } else if (path.startsWith('/history')) {
      crumbs.push({ label: 'History' });
    } else if (path.startsWith('/bulk-upload')) {
      crumbs.push({ label: 'Bulk Upload' });
    } else if (path.startsWith('/exports')) {
      crumbs.push({ label: 'Exports' });
    } else if (path.startsWith('/admin/users')) {
      crumbs.push({ label: 'Admin', path: '/admin/users' });
      crumbs.push({ label: 'Users & Roles' });
    } else if (path.startsWith('/admin/organization')) {
      crumbs.push({ label: 'Admin', path: '/admin/organization' });
      crumbs.push({ label: 'Organization' });
    } else if (path.startsWith('/admin/sites')) {
      crumbs.push({ label: 'Admin', path: '/admin/sites' });
      crumbs.push({ label: 'Sites & Assets' });
    } else if (path.startsWith('/admin/audit')) {
      crumbs.push({ label: 'Admin', path: '/admin/audit' });
      crumbs.push({ label: 'Audit Logs' });
    } else if (path.startsWith('/admin/models')) {
      crumbs.push({ label: 'Admin', path: '/admin/models' });
      crumbs.push({ label: 'Model Registry' });
    } else if (path.startsWith('/settings')) {
      crumbs.push({ label: 'Settings' });
    } else {
      crumbs.push({ label: 'Portal' });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs(currentPath);

  return (
    <header className="h-16 border-b border-border bg-surface px-4 md:px-6 flex items-center justify-between gap-3 shrink-0 transition-colors">
      {/* Left: Mobile hamburger & Clean Breadcrumb Trail */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-surface-muted transition-all duration-200 ease-in-out cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Streamlined Breadcrumb Trail */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-muted-foreground shrink-0" />
                )}
                {crumb.path && !isLast ? (
                  <button
                    type="button"
                    onClick={() => onNavigate(crumb.path!)}
                    className="text-muted-foreground hover:text-foreground hover:underline transition-all duration-200 ease-in-out cursor-pointer font-medium"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-foreground font-semibold tracking-tight">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-border ml-2 text-[11px] text-muted-foreground">
            <span>{currentUser.organization}</span>
            <span>•</span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {currentUser.role}
            </span>
          </div>
        </nav>
      </div>

      {/* Center: Search Trigger (Desktop & Mobile) */}
      <div className="flex-1 max-w-md mx-2 hidden sm:block">
        <button
          type="button"
          onClick={() => setShowSearchModal(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-border bg-surface-muted/40 text-xs text-muted-foreground hover:border-primary/40 hover:bg-surface-muted transition-all duration-200 ease-in-out cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span>Search reports, IOGP rules, precursor signals...</span>
          </span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 rounded border border-border bg-surface text-[10px] font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Actions, Health, Theme, User */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Backend Health Badge */}
        <div
          title={`Backend status: ${healthStatus} (GET /health)`}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border border-border bg-surface-muted/40"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              healthStatus === 'healthy'
                ? 'bg-success animate-pulse'
                : healthStatus === 'checking'
                ? 'bg-warning animate-spin'
                : 'bg-danger'
            }`}
          />
          <span className="text-muted-foreground font-medium">
            API: {healthStatus === 'healthy' ? 'Active' : healthStatus}
          </span>
        </div>

        {/* Notifications Popover Trigger */}
        <div className="relative" ref={notifMenuRef}>
          <IconButton
            aria-label="Open notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative transition-all duration-200 ease-in-out"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger ring-2 ring-surface" />
          </IconButton>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-surface shadow-[0px_10px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] z-50 p-4 animate-card-enter">
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <h4 className="text-xs font-bold text-foreground">Safety Alerts & Notifications</h4>
                <Badge variant="danger" size="sm">3 Active</Badge>
              </div>
              <div className="py-2 space-y-2 text-xs divide-y divide-border-subtle">
                <div className="pt-2">
                  <p className="font-semibold text-foreground">Line of Fire Precursor Detected</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Repeated pressurized line failure reports at Digboi Rig #4.
                  </p>
                  <span className="text-[10px] text-primary mt-1 inline-block font-medium">10m ago</span>
                </div>
                <div className="pt-2">
                  <p className="font-semibold text-foreground">Pending SIF Review Required</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Near-miss confined space entry without gas test logged.
                  </p>
                  <span className="text-[10px] text-primary mt-1 inline-block font-medium">1h ago</span>
                </div>
              </div>
              <div className="pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    onNavigate('/alerts');
                  }}
                  className="w-full text-center text-xs font-medium text-primary hover:underline transition-all duration-200 ease-in-out cursor-pointer py-1"
                >
                  View all alerts & workflow items
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme Switcher Menu */}
        <div className="relative" ref={themeMenuRef}>
          <IconButton
            aria-label="Toggle visual theme"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            title={`Current theme: ${theme} (${resolvedTheme})`}
            className="transition-all duration-200 ease-in-out"
          >
            {resolvedTheme === 'dark' ? (
              <Moon className="w-4 h-4 text-primary" />
            ) : (
              <Sun className="w-4 h-4 text-warning" />
            )}
          </IconButton>

          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-surface shadow-[0px_10px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] z-50 py-1.5 animate-card-enter">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-muted-foreground">
                Select Theme
              </div>
              <button
                type="button"
                onClick={() => {
                  setTheme('light');
                  setShowThemeMenu(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-surface-muted cursor-pointer transition-all duration-200 ease-in-out ${
                  theme === 'light' ? 'font-semibold text-primary' : 'text-foreground'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-warning" />
                  <span>Light Mode (Default)</span>
                </span>
                {theme === 'light' && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTheme('dark');
                  setShowThemeMenu(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-surface-muted cursor-pointer transition-all duration-200 ease-in-out ${
                  theme === 'dark' ? 'font-semibold text-primary' : 'text-foreground'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-primary" />
                  <span>Dark Mode</span>
                </span>
                {theme === 'dark' && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTheme('system');
                  setShowThemeMenu(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-surface-muted cursor-pointer transition-all duration-200 ease-in-out ${
                  theme === 'system' ? 'font-semibold text-primary' : 'text-foreground'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Laptop className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>System Preference</span>
                </span>
                {theme === 'system' && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            </div>
          )}
        </div>

        {/* User Profile / RBAC Role Switcher */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg border border-border hover:bg-slate-100 dark:hover:bg-surface-muted transition-all duration-200 ease-in-out cursor-pointer"
          >
            <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden lg:flex flex-col text-left leading-tight">
              <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-muted-foreground">{currentUser.role}</span>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-surface shadow-[0px_10px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] z-50 p-2 animate-card-enter">
              <div className="p-2 border-b border-border-subtle">
                <p className="text-xs font-bold text-foreground">{currentUser.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{currentUser.email}</p>
                <Badge variant="primary" size="sm" className="mt-1.5">
                  {currentUser.role}
                </Badge>
              </div>

              {/* RBAC Role Switcher Preview for Phase 1 verification */}
              <div className="py-2">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground">
                  Switch Preview Role (RBAC)
                </div>
                {(['OrgAdmin', 'HSEOfficer', 'SafetyReviewer', 'SiteManager'] as UserRole[]).map(
                  (role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleChange(role)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left hover:bg-surface-muted transition-all duration-200 ease-in-out cursor-pointer ${
                        currentUser.role === role ? 'font-semibold text-primary bg-primary/10' : 'text-foreground'
                      }`}
                    >
                      <span>{role}</span>
                      {currentUser.role === role && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  )
                )}
              </div>

              <div className="pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate('/settings');
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-foreground hover:bg-surface-muted rounded-md transition-all duration-200 ease-in-out cursor-pointer"
                >
                  Account Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate('/login');
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-danger hover:bg-danger/10 rounded-md transition-all duration-200 ease-in-out cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Search Modal Shell */}
      {showSearchModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-border bg-surface shadow-2xl p-4 overflow-hidden animate-card-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                placeholder="Search SUCHAK safety database..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-foreground text-sm focus:outline-none placeholder:text-muted-foreground"
              />
              <kbd
                onClick={() => setShowSearchModal(false)}
                className="text-xs px-2 py-0.5 border border-border rounded text-muted-foreground cursor-pointer hover:bg-surface-muted transition-all duration-200 ease-in-out"
              >
                ESC
              </kbd>
            </div>
            <div className="py-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-2">Suggested Quick Navigations:</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchModal(false);
                    onNavigate('/evaluate');
                  }}
                  className="px-2.5 py-1 rounded-md border border-border bg-surface-muted hover:border-primary text-foreground transition-all duration-200 ease-in-out cursor-pointer"
                >
                  ⚡ Evaluate New Safety Report
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchModal(false);
                    onNavigate('/rules');
                  }}
                  className="px-2.5 py-1 rounded-md border border-border bg-surface-muted hover:border-primary text-foreground transition-all duration-200 ease-in-out cursor-pointer"
                >
                  📖 IOGP Life-Saving Rules
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchModal(false);
                    onNavigate('/patterns');
                  }}
                  className="px-2.5 py-1 rounded-md border border-border bg-surface-muted hover:border-primary text-foreground transition-all duration-200 ease-in-out cursor-pointer"
                >
                  🔍 Precursor Patterns
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

