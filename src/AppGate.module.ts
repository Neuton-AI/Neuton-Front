import { useAuth } from '@/features/auth/supabase';
import { useLocation } from 'react-router-dom';

export function useRootRedirect() {
  const { session, loading } = useAuth();
  return { session, loading };
}

export function useRequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();
  return { session, loading, from: location.pathname };
}
