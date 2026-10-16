import { FullPageLoader } from '@/components/feedback';
import { useAuth } from '@/features/auth/supabase';
import { AuthPage } from '@/pages/AuthPage/AuthPage';
import { LandingPage } from '@/pages/LandingPage/LandingPage';
import { Suspense, lazy, type ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

const CapturePage = lazy(() =>
  import('@/pages/CapturePage/CapturePage').then((m) => ({ default: m.CapturePage })),
);
const CatalogPage = lazy(() =>
  import('@/pages/CatalogPage/CatalogPage').then((m) => ({ default: m.CatalogPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const NewOrderPage = lazy(() =>
  import('@/pages/NewOrderPage/NewOrderPage').then((m) => ({ default: m.NewOrderPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const OrderDetailPage = lazy(() =>
  import('@/pages/OrderDetailPage/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })),
);
const OrdersPage = lazy(() =>
  import('@/pages/OrdersPage/OrdersPage').then((m) => ({ default: m.OrdersPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const ReceiptDetailPage = lazy(() =>
  import('@/pages/ReceiptDetailPage/ReceiptDetailPage').then((m) => ({
    default: m.ReceiptDetailPage,
  })),
);
const RecipeDetailPage = lazy(() =>
  import('@/pages/RecipeDetailPage/RecipeDetailPage').then((m) => ({
    default: m.RecipeDetailPage,
  })),
);

export function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/signin" element={<AuthPage mode="signin" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />

      <Route
        path="/*"
        element={
          <RequireAuth>
            <Suspense fallback={<FullPageLoader />}>
              <Routes>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="catalog" element={<CatalogPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="orders/new" element={<NewOrderPage />} />
                <Route path="orders/:id" element={<OrderDetailPage />} />
                <Route path="catalog/recipes/:id" element={<RecipeDetailPage />} />
                <Route path="catalog/receipts/:id" element={<ReceiptDetailPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="capture" element={<CapturePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

function RootRedirect() {
  const { session, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

function RequireAuth({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  return children;
}
