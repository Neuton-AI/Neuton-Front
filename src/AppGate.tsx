import { FullPageLoader } from '@/components/feedback';
import { LandingPage } from '@/pages/LandingPage/LandingPage';
import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useRequireAuth, useRootRedirect } from './AppGate.module';

export function RootRedirect() {
  const { session, loading } = useRootRedirect();
  if (loading) return <FullPageLoader />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

export function RequireAuth({ children }: { children: ReactElement }) {
  const { session, loading, from } = useRequireAuth();
  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/signin" replace state={{ from }} />;
  return children;
}
