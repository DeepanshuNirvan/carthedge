import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Toaster } from './ui/Toaster';
import { ErrorBoundary } from './ErrorBoundary';
import { PageLoader } from './ui/PageLoader';

// each surface is its own lazy bundle — three.js never reaches app/store chunks
const MarketingHome = lazy(() => import('./marketing/pages/HomePage'));
const ContactPage = lazy(() => import('./marketing/pages/ContactPage'));
const AppRoot = lazy(() => import('./app/AppRoot'));
const AdminRoot = lazy(() => import('./admin/AdminRoot'));
const ResetPasswordPage = lazy(() => import('./app/auth/ResetPasswordPage'));
const StorePage = lazy(() => import('./store-front/storefront/StorePage'));
const ProductPage = lazy(() => import('./store-front/product/ProductPage'));
const LinkCheckoutPage = lazy(() => import('./store-front/checkout/LinkCheckoutPage'));
const TrackPage = lazy(() => import('./store-front/tracking/TrackPage'));
const CodConfirmPage = lazy(() => import('./store-front/tracking/CodConfirmPage'));
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
  // the forgot-password email links here, outside the /app guard
  { path: '/reset-password', element: wrap(<ResetPasswordPage />) },
  { path: '/app/*', element: wrap(<AppRoot />) },
  { path: '/admin/*', element: wrap(<AdminRoot />) },
  { path: '/s/:businessCode', element: wrap(<StorePage />) },
  { path: '/s/:businessCode/p/:productId', element: wrap(<ProductPage />) },
  { path: '/l/:businessCode/:token', element: wrap(<LinkCheckoutPage />) },
  { path: '/track', element: wrap(<TrackPage />) },
  { path: '/o/:orderCode', element: wrap(<TrackPage />) },
  { path: '/o/:orderCode/confirm', element: wrap(<CodConfirmPage />) },
  { path: '*', element: wrap(<NotFound />) },
]);
