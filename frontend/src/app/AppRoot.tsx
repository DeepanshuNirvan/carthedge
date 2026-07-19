import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { Seo } from '@/lib/seo';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';
import { AppShell } from './shell/AppShell';
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

function Guarded() {
  const authed = useAuth((s) => !!s.refreshToken);
  if (!authed) return <Navigate to="/app/login" replace />;
  return <AppShell />;
}

export default function AppRoot() {
  return (
    <>
      <Seo title="CartHedge Seller" description="CartHedge seller workspace." path="/app" noIndex />
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<Guarded />}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="links" element={<LinksPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="ai" element={<AiDeskPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="broadcasts" element={<BroadcastsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>
      </Routes>
    </>
  );
}
