import { Navigate, Route, Routes } from 'react-router-dom';
import { useAdminAuth } from '@/store/adminAuth';
import { Seo } from '@/lib/seo';
import AdminLoginPage from './auth/AdminLoginPage';
import { AdminShell } from './shell/AdminShell';
import OverviewPage from './overview/OverviewPage';
import BusinessesPage from './businesses/BusinessesPage';
import BusinessDetailPage from './businesses/BusinessDetailPage';
import PlansPage from './plans/PlansPage';
import RequestsPage from './requests/RequestsPage';
import PaymentsPage from './payments/PaymentsPage';
import SiteContentPage from './siteContent/SiteContentPage';
import AccountPage from './account/AccountPage';

function Guarded() {
  const authed = useAdminAuth((s) => !!s.accessToken);
  if (!authed) return <Navigate to="/admin/login" replace />;
  return <AdminShell />;
}

export default function AdminRoot() {
  return (
    <>
      <Seo title="CartHedge Admin" description="CartHedge platform console." path="/admin" noIndex />
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route element={<Guarded />}>
          <Route index element={<OverviewPage />} />
          <Route path="businesses" element={<BusinessesPage />} />
          <Route path="businesses/:id" element={<BusinessDetailPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="site" element={<SiteContentPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </>
  );
}
