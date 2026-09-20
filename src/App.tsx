import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './lib/theme.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { EvaluateReportPage } from './pages/EvaluateReportPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { ReportDetailPage } from './pages/ReportDetailPage.tsx';
import { ReviewQueuePage } from './pages/ReviewQueuePage.tsx';
import { SafetyRulesPage } from './pages/SafetyRulesPage.tsx';
import { RuleDetailPage } from './pages/RuleDetailPage.tsx';
import { AskSuchakPage } from './pages/AskSuchakPage.tsx';
import { SemanticSearchPage } from './pages/SemanticSearchPage.tsx';
import { PatternsPage } from './pages/PatternsPage.tsx';
import { SiteRiskPage } from './pages/SiteRiskPage.tsx';
import { ActivityRiskPage } from './pages/ActivityRiskPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { AlertsPage } from './pages/AlertsPage.tsx';
import { ActionCenterPage } from './pages/ActionCenterPage.tsx';
import { HistoryPage } from './pages/HistoryPage.tsx';
import { BulkUploadPage } from './pages/BulkUploadPage.tsx';
import { ExportsPage } from './pages/ExportsPage.tsx';
import { AdminUsersPage } from './pages/AdminUsersPage.tsx';
import { AdminOrgPage } from './pages/AdminOrgPage.tsx';
import { AdminSitesPage } from './pages/AdminSitesPage.tsx';
import { AdminAuditPage } from './pages/AdminAuditPage.tsx';
import { AdminModelsPage } from './pages/AdminModelsPage.tsx';
import { AdminSecurityPage } from './pages/AdminSecurityPage.tsx';
import { AdminDeploymentsPage } from './pages/AdminDeploymentsPage.tsx';
import { AdminSrePage } from './pages/AdminSrePage.tsx';
import { AdminIdentityPage } from './pages/AdminIdentityPage.tsx';
import { AdminEnterpriseReleasePage } from './pages/AdminEnterpriseReleasePage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname || '/dashboard';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderCurrentView = () => {
    if (currentPath === '/login') {
      return <LoginPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/' || currentPath === '/dashboard') {
      return <DashboardPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/evaluate') {
      return <EvaluateReportPage onNavigate={handleNavigate} />;
    }

    if (currentPath.startsWith('/reports/')) {
      const reportId = currentPath.split('/reports/')[1] || 'REP-2026-0891';
      return <ReportDetailPage reportId={reportId} onNavigate={handleNavigate} />;
    }

    if (currentPath === '/reports') {
      return <ReportsPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/review') {
      return <ReviewQueuePage onNavigate={handleNavigate} />;
    }

    if (currentPath.startsWith('/rules/')) {
      const ruleId = currentPath.split('/rules/')[1] || 'line-of-fire';
      return <RuleDetailPage ruleId={ruleId} onNavigate={handleNavigate} />;
    }

    if (currentPath === '/rules') {
      return <SafetyRulesPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/similarity') {
      return <SemanticSearchPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/ask') {
      return <AskSuchakPage onNavigate={handleNavigate} />;
    }

    if (currentPath.startsWith('/patterns')) {
      return <PatternsPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/sites') {
      return <SiteRiskPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/activities') {
      return <ActivityRiskPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/analytics' || currentPath === '/executive') {
      return <AnalyticsPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/alerts') {
      return <AlertsPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/actions') {
      return (
        <ActionCenterPage
          onNavigate={handleNavigate}
          onNavigateToReport={(reportId) => handleNavigate(`/reports/${reportId}`)}
          onNavigateToPattern={(patternId) => handleNavigate('/patterns')}
        />
      );
    }

    if (currentPath === '/history') {
      return <HistoryPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/bulk-upload') {
      return <BulkUploadPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/exports') {
      return <ExportsPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/admin/users') {
      return <AdminUsersPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/admin/organization') {
      return <AdminOrgPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/admin/sites') {
      return <AdminSitesPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/admin/audit') {
      return <AdminAuditPage onNavigate={handleNavigate} />;
    }

    if (
      currentPath === '/admin/models' ||
      currentPath === '/governance' ||
      currentPath === '/evaluation' ||
      currentPath === '/ai-evaluation'
    ) {
      return <AdminModelsPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/admin/security' || currentPath === '/admin/operations') {
      return <AdminSecurityPage />;
    }

    if (
      currentPath === '/admin/deployments' ||
      currentPath === '/admin/cloud' ||
      currentPath === '/deployments' ||
      currentPath === '/cloud'
    ) {
      return <AdminDeploymentsPage />;
    }

    if (
      currentPath === '/admin/sre' ||
      currentPath === '/admin/observability' ||
      currentPath === '/sre' ||
      currentPath === '/observability'
    ) {
      return <AdminSrePage />;
    }

    if (
      currentPath === '/admin/identity' ||
      currentPath === '/admin/sso' ||
      currentPath === '/identity' ||
      currentPath === '/sso'
    ) {
      return <AdminIdentityPage />;
    }

    if (
      currentPath === '/admin/release' ||
      currentPath === '/admin/enterprise-release' ||
      currentPath === '/admin/control-center' ||
      currentPath === '/release'
    ) {
      return <AdminEnterpriseReleasePage />;
    }

    if (currentPath === '/settings') {
      return <SettingsPage onNavigate={handleNavigate} />;
    }

    return <NotFoundPage onNavigate={handleNavigate} />;
  };

  if (currentPath === '/login') {
    return (
      <ThemeProvider defaultTheme="light">
        <LoginPage onNavigate={handleNavigate} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="light">
      <AppLayout currentPath={currentPath} onNavigate={handleNavigate}>
        {renderCurrentView()}
      </AppLayout>
    </ThemeProvider>
  );
}
