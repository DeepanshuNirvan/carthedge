import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { activeSupport, useSupport } from '@/store/support';
import type { SupportSession } from '@/api/types';
import { Seo } from '@/lib/seo';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';
import { AppShell } from './shell/AppShell';
import { FeatureGate } from './shell/FeatureGate';
import DashboardPage from './dashboard/DashboardPage';
import OrdersPage from './orders/OrdersPage';
import ProductsPage from './products/ProductsPage';
import LinksPage from './links/LinksPage';
import CustomersPage from './customers/CustomersPage';
import AiDeskPage from './aiDesk/AiDeskPage';
import InsightsPage from './insights/InsightsPage';
import BroadcastsPage from './broadcasts/BroadcastsPage';
import InvoicesPage from './invoices/InvoicesPage';
import AnalyticsPage from './analytics/AnalyticsPage';
import SettingsPage from './settings/SettingsPage';
import BillingPage from './billing/BillingPage';
import PrintSlips from './print/PrintSlips';

// An admin's "view as seller" opens /app#support=<session>: take it into this
// tab's support store and drop it from the address bar before anything renders.
(function takeSupportSession() {
  const m = window.location.hash.match(/^#support=(.+)$/);
  if (!m) return;
  try {
    const bin = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    useSupport.getState().start(JSON.parse(json) as SupportSession);
  } catch {
    // a mangled link just opens the normal app
  }
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
})();

function RequireAuth({ children }: { children: ReactNode }) {
  const authed = useAuth((s) => !!s.refreshToken);
  useSupport((s) => s.session); // re-render when a support view starts or ends
  if (!authed && !activeSupport()) return <Navigate to="/app/login" replace />;
  return <>{children}</>;
}

export default function AppRoot() {
  return (
    <>
      <Seo title="CartHedge Seller" description="CartHedge seller workspace." path="/app" noIndex />
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route
          path="print/slips"
          element={
            <RequireAuth>
              <PrintSlips />
            </RequireAuth>
          }
        />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="links" element={<LinksPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route
            path="ai"
            element={
              <FeatureGate capability="ai">
                <AiDeskPage />
              </FeatureGate>
            }
          />
          <Route path="insights" element={<InsightsPage />} />
          <Route
            path="broadcasts"
            element={
              <FeatureGate capability="broadcasts">
                <BroadcastsPage />
              </FeatureGate>
            }
          />
          <Route
            path="invoices"
            element={
              <FeatureGate capability="invoices">
                <InvoicesPage />
              </FeatureGate>
            }
          />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>
      </Routes>
    </>
  );
}
