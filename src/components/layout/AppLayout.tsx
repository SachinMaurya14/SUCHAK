import React, { useState } from 'react';
import { Sidebar } from './Sidebar.tsx';
import { Topbar } from './Topbar.tsx';
import { Drawer } from '../ui/Drawer.tsx';

export interface AppLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPath,
  onNavigate,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      <div className="flex-1 flex w-full overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex shrink-0">
          <Sidebar
            currentPath={currentPath}
            onNavigate={onNavigate}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
          />
        </div>

        {/* Mobile Navigation Drawer */}
        <Drawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          title="SUCHAK Navigation"
          position="left"
          width="w-72"
        >
          <div className="h-full -m-4">
            <Sidebar
              currentPath={currentPath}
              onNavigate={onNavigate}
              collapsed={false}
              onToggleCollapse={() => {}}
              onCloseMobile={() => setMobileMenuOpen(false)}
            />
          </div>
        </Drawer>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar
            currentPath={currentPath}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onNavigate={onNavigate}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
