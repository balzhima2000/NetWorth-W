
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSettingsStore } from './stores/settingsStore';
import { AppShell } from './components/layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { useAutoAdd } from './hooks/useAutoAdd';
import { useSyncManager } from './hooks/useSyncManager';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Spending from './pages/Spending';
import Fire from './pages/Fire';
import Settings from './pages/Settings';
import WilliamPreview from './pages/WilliamPreview';
import WilliamDashboard from './pages/WilliamDashboard';
import WilliamPortfolio from './pages/WilliamPortfolio';
import WilliamFire from './pages/WilliamFire';
import WilliamSpending from './pages/WilliamSpending';
import WilliamRecurring from './pages/WilliamRecurring';
import WilliamAccount from './pages/WilliamAccount';
import AccountSection from './pages/WilliamAccount/AccountSection';
import { useWilliamTheme } from './components/william/useWilliamTheme';

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

  // Auto-add recurring payments and installments on startup
  useAutoAdd();
  // Cloud sync (no-op when not signed in)
  useSyncManager();
  // Apply the William appearance preference (light/dark/auto) to <html>
  useWilliamTheme();

  return (
    <Routes>
      {/* Setup route */}
      <Route path="/setup" element={<Setup />} />

      {/* William redesign — standalone routes */}
      <Route path="/william" element={<WilliamPreview />} />
      <Route path="/william/dashboard" element={<WilliamDashboard />} />
      <Route path="/william/portfolio" element={<WilliamPortfolio />} />
      <Route path="/william/fire" element={<WilliamFire />} />
      <Route path="/william/spending" element={<WilliamSpending />} />
      <Route path="/william/spending/recurring" element={<WilliamRecurring />} />
      <Route path="/william/account" element={<WilliamAccount />} />
      <Route path="/william/account/:slug" element={<AccountSection />} />

      {/* Main app routes */}
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/spending" element={<Spending />} />
<Route path="/fire" element={<Fire />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to={hasCompletedSetup ? '/dashboard' : '/setup'} replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
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
