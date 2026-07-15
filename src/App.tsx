
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSettingsStore } from './stores/settingsStore';
import { seedDemoData } from './data/demoSeed';
import { IS_DEMO } from './lib/demoMode';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { useAutoAdd } from './hooks/useAutoAdd';
import { useSyncManager } from './hooks/useSyncManager';
import WilliamPreview from './pages/WilliamPreview';
import WilliamDashboard from './pages/WilliamDashboard';
import WilliamPortfolio from './pages/WilliamPortfolio';
import WilliamFire from './pages/WilliamFire';
import WilliamSpending from './pages/WilliamSpending';
import WilliamRecurring from './pages/WilliamRecurring';
import WilliamTrends from './pages/WilliamTrends';
import WilliamTransactions from './pages/WilliamTransactions';
import WilliamAccount from './pages/WilliamAccount';
import AccountSection from './pages/WilliamAccount/AccountSection';
import WilliamSetup from './pages/WilliamSetup';
import { useWilliamTheme } from './components/william/useWilliamTheme';
import { GlassFilters } from './components/william/GlassFilters';

const NotFound = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-white mb-2">404</h1>
      <p className="text-white/50">Page not found</p>
    </div>
  </div>
);

// Inner component to use hooks after Router context is available
function AppInner() {
  const hasCompletedSetup = useSettingsStore((s) => s.hasCompletedSetup);

  // Seed placeholder data (no-op once setup is complete / stores are non-empty)
  // so the preview screens always render filled instead of empty states. Skipped
  // during the real setup flow so a genuine onboarding isn't polluted with demo data.
  //
  // Demo builds seed on every route instead, and mark setup complete: `/` then
  // opens on a filled dashboard, and /william/setup stays visitable without
  // stranding a visitor in an empty app if they walk through it.
  useEffect(() => {
    if (IS_DEMO) seedDemoData({ completeSetup: true });
    else if (!window.location.pathname.startsWith('/william/setup')) seedDemoData();
  }, []);

  // Auto-add recurring payments and installments on startup
  useAutoAdd();
  // Cloud sync (no-op when not signed in)
  useSyncManager();
  // Apply the William appearance preference (light/dark/auto) to <html>
  useWilliamTheme();

  return (
    <>
      <GlassFilters />
    <Routes>
      {/* William redesign — the app. */}
      <Route path="/william" element={<WilliamPreview />} />
      <Route path="/william/setup" element={<WilliamSetup />} />
      <Route path="/william/dashboard" element={<WilliamDashboard />} />
      <Route path="/william/portfolio" element={<WilliamPortfolio />} />
      <Route path="/william/fire" element={<WilliamFire />} />
      <Route path="/william/spending" element={<WilliamSpending />} />
      <Route path="/william/spending/recurring" element={<WilliamRecurring />} />
      <Route path="/william/spending/trends" element={<WilliamTrends />} />
      <Route path="/william/spending/transactions" element={<WilliamTransactions />} />
      <Route path="/william/account" element={<WilliamAccount />} />
      <Route path="/william/account/:slug" element={<AccountSection />} />

      {/* Root redirect — into the William app (setup or dashboard). */}
      <Route path="/" element={<Navigate to={hasCompletedSetup ? '/william/dashboard' : '/william/setup'} replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <AppInner />
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
