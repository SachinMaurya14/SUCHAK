import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './lib/theme.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { EvaluateReportPage } from './pages/EvaluateReportPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { ReportDetailPage } from './pages/ReportDetailPage.tsx';
import { ReviewQueuePage } from './pages/ReviewQueuePage.tsx';
import { PatternsPage } from './pages/PatternsPage.tsx';
import { AskSuchakPage } from './pages/AskSuchakPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';

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

    if (currentPath.startsWith('/patterns')) {
      return <PatternsPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/ask') {
      return <AskSuchakPage onNavigate={handleNavigate} />;
    }

    // Default fallback to Dashboard
    return <DashboardPage onNavigate={handleNavigate} />;
  };

  return (
    <ThemeProvider>
      {currentPath === '/login' ? (
        renderCurrentView()
      ) : (
        <AppLayout currentPath={currentPath} onNavigate={handleNavigate}>
          {renderCurrentView()}
        </AppLayout>
      )}
    </ThemeProvider>
  );
}
