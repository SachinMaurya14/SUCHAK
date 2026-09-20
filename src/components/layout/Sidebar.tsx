import React from 'react';
import {
  LayoutDashboard,
  FileSearch,
  FileText,
  CheckSquare,
  BookOpen,
  Sparkles,
  Share2,
  MapPin,
  Activity,
  BarChart3,
  Bell,
  ShieldAlert,
  History,
  UploadCloud,
  Download,
  Users,
  Building2,
  Network,
  ScrollText,
  Cpu,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { NavigationItem } from '../../types/index.ts';
import { Tooltip } from '../ui/Tooltip.tsx';

export const NAVIGATION_ITEMS: NavigationItem[] = [
  // PRIMARY
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', iconName: 'LayoutDashboard', section: 'PRIMARY' },
  { id: 'evaluate', label: 'Evaluate Report', path: '/evaluate', iconName: 'FileSearch', section: 'PRIMARY' },
  { id: 'reports', label: 'Reports', path: '/reports', iconName: 'FileText', badge: '142', section: 'PRIMARY' },
  { id: 'review', label: 'Review Queue', path: '/review', iconName: 'CheckSquare', badge: '8', section: 'PRIMARY' },

  // INTELLIGENCE
  { id: 'rules', label: 'Safety Rule Guide', path: '/rules', iconName: 'BookOpen', section: 'INTELLIGENCE' },
  { id: 'similarity', label: 'Vector Search', path: '/similarity', iconName: 'Sparkles', badge: 'Phase 7', section: 'INTELLIGENCE' },
  { id: 'ask', label: 'Ask SUCHAK', path: '/ask', iconName: 'Sparkles', badge: 'AI', section: 'INTELLIGENCE' },
  { id: 'patterns', label: 'Patterns', path: '/patterns', iconName: 'Share2', section: 'INTELLIGENCE' },
  { id: 'sites', label: 'Site Risk', path: '/sites', iconName: 'MapPin', section: 'INTELLIGENCE' },
  { id: 'activities', label: 'Activity Risk', path: '/activities', iconName: 'Activity', section: 'INTELLIGENCE' },
  { id: 'analytics', label: 'Analytics', path: '/analytics', iconName: 'BarChart3', section: 'INTELLIGENCE' },

  // HSE WORKFLOW
  { id: 'alerts', label: 'Alerts', path: '/alerts', iconName: 'Bell', badge: '3', section: 'HSE WORKFLOW' },
  { id: 'actions', label: 'Action Center', path: '/actions', iconName: 'ShieldAlert', badge: '5', section: 'HSE WORKFLOW' },
  { id: 'history', label: 'History', path: '/history', iconName: 'History', section: 'HSE WORKFLOW' },

  // DATA
  { id: 'bulk-upload', label: 'Bulk Upload', path: '/bulk-upload', iconName: 'UploadCloud', section: 'DATA' },
  { id: 'exports', label: 'Export / Reports', path: '/exports', iconName: 'Download', section: 'DATA' },

  // ADMIN
  { id: 'admin-users', label: 'Users & Roles', path: '/admin/users', iconName: 'Users', section: 'ADMIN', rolesAllowed: ['OrgAdmin'] },
  { id: 'admin-org', label: 'Organization', path: '/admin/organization', iconName: 'Building2', section: 'ADMIN', rolesAllowed: ['OrgAdmin'] },
  { id: 'admin-sites', label: 'Sites & Assets', path: '/admin/sites', iconName: 'Network', section: 'ADMIN', rolesAllowed: ['OrgAdmin', 'HSEOfficer'] },
  { id: 'admin-audit', label: 'Audit Logs', path: '/admin/audit', iconName: 'ScrollText', section: 'ADMIN', rolesAllowed: ['OrgAdmin'] },
  { id: 'admin-models', label: 'AI Eval & Governance', path: '/admin/models', iconName: 'Cpu', section: 'ADMIN', badge: 'GOV' },
  { id: 'admin-security', label: 'Security & Operations', path: '/admin/security', iconName: 'Shield', section: 'ADMIN', badge: 'SEC' },
  { id: 'settings', label: 'Settings', path: '/settings', iconName: 'Settings', section: 'ADMIN' },
];

const getNavIcon = (name: string, className = 'w-4 h-4') => {
  switch (name) {
    case 'LayoutDashboard': return <LayoutDashboard className={className} />;
    case 'FileSearch': return <FileSearch className={className} />;
    case 'FileText': return <FileText className={className} />;
    case 'CheckSquare': return <CheckSquare className={className} />;
    case 'BookOpen': return <BookOpen className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'Share2': return <Share2 className={className} />;
    case 'MapPin': return <MapPin className={className} />;
    case 'Activity': return <Activity className={className} />;
    case 'BarChart3': return <BarChart3 className={className} />;
    case 'Bell': return <Bell className={className} />;
    case 'ShieldAlert': return <ShieldAlert className={className} />;
    case 'History': return <History className={className} />;
    case 'UploadCloud': return <UploadCloud className={className} />;
    case 'Download': return <Download className={className} />;
    case 'Users': return <Users className={className} />;
    case 'Building2': return <Building2 className={className} />;
    case 'Network': return <Network className={className} />;
    case 'ScrollText': return <ScrollText className={className} />;
    case 'Cpu': return <Cpu className={className} />;
    case 'Settings': return <Settings className={className} />;
    default: return <FileText className={className} />;
  }
};

export interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  collapsed,
  onToggleCollapse,
  onCloseMobile,
}) => {
  const sections: Array<NavigationItem['section']> = [
    'PRIMARY',
    'INTELLIGENCE',
    'HSE WORKFLOW',
    'DATA',
    'ADMIN',
  ];

  const renderBadge = (item: NavigationItem, isActive: boolean) => {
    if (!item.badge) return null;

    // Actionable alerts / queues: soft-orange pill with dark orange text
    const isActionable = item.id === 'review' || item.id === 'alerts' || item.id === 'actions';

    if (item.badge === 'AI') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold ml-auto bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/80 shadow-2xs">
          AI
        </span>
      );
    }

    if (isActionable) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold ml-auto bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80 shadow-2xs">
          {item.badge}
        </span>
      );
    }

    // Standard counts: subtle grey pill with #4B5563 text
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold ml-auto bg-slate-100 text-[#4B5563] border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/80 shadow-2xs">
        {item.badge}
      </span>
    );
  };

  return (
    <aside
      className={`h-full flex flex-col bg-surface border-r border-border transition-all duration-200 ease-in-out select-none ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-surface">
        <div
          onClick={() => onNavigate('/dashboard')}
          className="flex items-center gap-2.5 cursor-pointer overflow-hidden group"
        >
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-xs shrink-0 transition-transform duration-200 group-hover:scale-105">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-base font-bold tracking-tight text-foreground font-display">
                SUCHAK
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground -mt-0.5">
                HSE Intelligence
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-all duration-200 ease-in-out cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((section) => {
          const items = NAVIGATION_ITEMS.filter((item) => item.section === section);
          if (items.length === 0) return null;

          return (
            <div key={section} className="space-y-1">
              {!collapsed && (
                <p className="px-2.5 mb-2 text-[10px] font-bold tracking-wider uppercase text-muted-foreground/80">
                  {section}
                </p>
              )}
              {items.map((item) => {
                const isActive = currentPath === item.path || (item.path !== '/dashboard' && currentPath.startsWith(item.path));
                const isActionable = item.id === 'review' || item.id === 'alerts' || item.id === 'actions';

                const content = (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate(item.path);
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ease-in-out cursor-pointer group relative ${
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-slate-100/90 dark:hover:bg-surface-muted'
                    }`}
                  >
                    <span
                      className={`shrink-0 transition-all duration-200 ease-in-out ${
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground group-hover:scale-105'
                      }`}
                    >
                      {getNavIcon(item.iconName)}
                    </span>
                    {!collapsed && (
                      <span className="truncate text-left flex-1">{item.label}</span>
                    )}
                    {!collapsed && renderBadge(item, isActive)}
                    {collapsed && item.badge && (
                      <span
                        className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                          isActionable ? 'bg-amber-500' : 'bg-primary'
                        }`}
                      />
                    )}
                  </button>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.id} content={item.label} position="right">
                      {content}
                    </Tooltip>
                  );
                }

                return <div key={item.id}>{content}</div>;
              })}
            </div>
          );
        })}
      </div>

      {/* Footer / Environmental Indicator */}
      <div className="p-3 border-t border-border bg-surface-muted/30">
        {!collapsed ? (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="font-medium text-foreground">SUCHAK Engine</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">v2.1 Enterprise</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" title="System Operational" />
          </div>
        )}
      </div>
    </aside>
  );
};
