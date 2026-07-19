import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { Toaster } from './ui/Toaster';
import { ErrorBoundary } from './ErrorBoundary';
import { PageLoader } from './ui/PageLoader';

// each surface is its own lazy bundle — three.js never reaches app/store chunks
const MarketingHome = lazy(() => import('./marketing/pages/HomePage'));
const ContactPage = lazy(() => import('./marketing/pages/ContactPage'));
const AppRoot = lazy(() => import('./app/AppRoot'));
const AdminRoot = lazy(() => import('./admin/AdminRoot'));
const StoreRoot = lazy(() => import('./store-front/StoreRoot'));
const NotFound = lazy(() => import('./NotFound'));

const wrap = (node: ReactNode) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>{node}</Suspense>
    <Toaster />
  </ErrorBoundary>
);

export const router = createBrowserRouter([
  { path: '/', element: wrap(<MarketingHome />) },
  { path: '/contact', element: wrap(<ContactPage />) },
  { path: '/app/*', element: wrap(<AppRoot />) },
  { path: '/admin/*', element: wrap(<AdminRoot />) },
  { path: '/s/:businessCode/*', element: wrap(<StoreRoot />) },
  { path: '/l/:businessCode/:token', element: wrap(<StoreRoot />) },
  { path: '/track', element: wrap(<StoreRoot />) },
  { path: '/o/:orderCode/*', element: wrap(<StoreRoot />) },
  { path: '*', element: wrap(<NotFound />) },
]);

export { Outlet };
