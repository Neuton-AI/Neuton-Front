import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { apiFetch, type ShopMembership } from './api';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * In development the Vite env may be absent; a client is still created so the
 * app renders and shows its own configuration error rather than crashing on a
 * blank page.
 */
export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const isSupabaseConfigured = Boolean(supabase);

type MembershipState = {
  memberships: ShopMembership[];
  activeShopId: string | null;
  loading: boolean;
  error: string | null;
  setActiveShopId: (shopId: string) => void;
  reload: () => Promise<void>;
};

const ACTIVE_SHOP_KEY = 'neuton.activeShopId';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  return { session, loading, user: session?.user ?? null, token: session?.access_token ?? null };
}

export function useShopMemberships(userId: string | undefined): MembershipState {
  const [memberships, setMemberships] = useState<ShopMembership[]>([]);
  const [activeShopId, setActiveShopIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !supabase) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Read directly through RLS: the user's own memberships are all it returns.
      const { data, error: queryError } = await supabase
        .from('shop_members')
        .select('shop_id, role, shops(*)')
        .order('created_at', { ascending: true });

      if (queryError) throw queryError;

      const rows = (data ?? []).map((row) => ({
        shopId: row.shop_id as string,
        role: row.role as ShopMembership['role'],
        shops: row.shops as unknown as ShopMembership['shops'],
      }));

      setMemberships(rows);

      const stored = localStorage.getItem(ACTIVE_SHOP_KEY);
      const stillValid = stored && rows.some((row) => row.shopId === stored);
      setActiveShopIdState(stillValid ? stored : (rows[0]?.shopId ?? null));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your shops');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setActiveShopId = useCallback((shopId: string) => {
    localStorage.setItem(ACTIVE_SHOP_KEY, shopId);
    setActiveShopIdState(shopId);
  }, []);

  return { memberships, activeShopId, loading, error, setActiveShopId, reload: load };
}

export function useAuthedApi(token: string | null | undefined, shopId: string | null) {
  return useCallback(
    <T,>(path: string, init?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown }) =>
      apiFetch<T>(path, {
        ...init,
        token,
        shopId,
      }),
    [token, shopId],
  );
}

export function useCurrentShop(memberships: ShopMembership[], activeShopId: string | null) {
  return useMemo(
    () => memberships.find((row) => row.shopId === activeShopId)?.shops ?? null,
    [memberships, activeShopId],
  );
}