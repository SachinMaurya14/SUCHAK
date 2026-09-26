import React from 'react';
import {
  LayoutDashboard,
  FileSearch,
  FileText,
  CheckSquare,
  Sparkles,
  Share2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NavigationItem } from '../../types/index.ts';
import { Tooltip } from '../ui/Tooltip.tsx';
import { SuchakLogo } from '../common/SuchakLogo.tsx';

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', iconName: 'LayoutDashboard', section: 'PRIMARY' },
  { id: 'evaluate', label: 'Evaluate Report', path: '/evaluate', iconName: 'FileSearch', section: 'PRIMARY' },
  { id: 'reports', label: 'Reports', path: '/reports', iconName: 'FileText', badge: '142', section: 'PRIMARY' },
  { id: 'review', label: 'Review Queue', path: '/review', iconName: 'CheckSquare', badge: '14', section: 'PRIMARY' },
  { id: 'patterns', label: 'Patterns', path: '/patterns', iconName: 'Share2', section: 'PRIMARY' },
  { id: 'ask', label: 'Ask SUCHAK', path: '/ask', iconName: 'Sparkles', badge: 'AI', section: 'PRIMARY' },
];

const getNavIcon = (name: string, className = 'w-4 h-4') => {
  switch (name) {
    case 'LayoutDashboard': return <LayoutDashboard className={className} />;
    case 'FileSearch': return <FileSearch className={className} />;
    case 'FileText': return <FileText className={className} />;
    case 'CheckSquare': return <CheckSquare className={className} />;
    case 'Share2': return <Share2 className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
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
  const renderBadge = (item: NavigationItem, isActive: boolean) => {
    if (!item.badge) return null;

    if (item.badge === 'AI') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold ml-auto bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
          AI
        </span>
      );
    }

    if (item.id === 'review') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold ml-auto bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80 shadow-2xs">
          {item.badge}
        </span>
      );
    }

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
      <div
        className={`flex items-center border-b border-border bg-surface transition-all duration-200 ${
          collapsed
            ? 'h-[88px] flex-col justify-center gap-1.5 px-2 py-2'
            : 'h-[88px] justify-between px-4 py-2'
        }`}
      >
        <div
          onClick={() => onNavigate('/dashboard')}
          className="flex items-center cursor-pointer overflow-hidden group py-1"
          title="SUCHAK HSE Safety Platform"
        >
          <SuchakLogo
            variant={collapsed ? 'compact' : 'full'}
            size="md"
          />
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-all duration-200 ease-in-out cursor-pointer ${
            collapsed ? 'hidden' : 'hidden md:flex'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {collapsed && (
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="hidden md:flex p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-all duration-150 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {!collapsed && (
          <div className="px-2.5 mb-2.5">
            <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground/80">
              HSE SAFETY INTELLIGENCE
            </p>
          </div>
        )}
        {NAVIGATION_ITEMS.map((item) => {
          const isActive =
            currentPath === item.path ||
            (item.path !== '/dashboard' && currentPath.startsWith(item.path));
          const isActionable = item.id === 'review';

          const content = (
            <button
              type="button"
              onClick={() => {
                onNavigate(item.path);
                onCloseMobile?.();
              }}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ease-in-out cursor-pointer group relative ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-slate-100/90 dark:hover:bg-surface-muted'
              }`}
            >
              <span
                className={`shrink-0 transition-all duration-200 ease-in-out ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-foreground group-hover:scale-105'
                }`}
              >
                {getNavIcon(item.iconName)}
              </span>
              {!collapsed && (
                <span className="truncate text-left flex-1 font-medium">{item.label}</span>
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

      {/* Footer / Status Indicator */}
      <div className="p-3 border-t border-border bg-surface-muted/30">
        {!collapsed ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-success shrink-0" />
            <span className="text-[11px] font-medium text-muted-foreground">System Active</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span
              className="w-2 h-2 rounded-full bg-success"
              title="System Active"
            />
          </div>
        )}
      </div>
    </aside>
  );
};
