import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Mode = 'signin' | 'signup';

export function AuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const client = supabase;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setNotice(null);
  }, [mode]);

  if (!client) {
    return (
      <div className="shell px-6 py-10">
        <h1 className="font-display text-title text-ink">Configuration needed</h1>
        <p className="mt-2 text-body text-ink-muted">
          Add <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to your{' '}
          <code className="font-mono">.env</code> file, then restart the dev server.
        </p>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === 'signin') {
        const { error: signInError } = await client.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password,
          options: { data: { shopName } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice('Check your inbox to confirm your email, then sign in.');
          return;
        }
      }

      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/dashboard', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shell">
      <div className="flex flex-1 flex-col justify-center px-6 pb-10">
        <p className="eyebrow text-brand-primary">Neuton</p>
        <h1 className="mt-1 font-display text-title text-ink">
          {mode === 'signin' ? 'Welcome back' : 'Start cooking'}
        </h1>
        <p className="mt-2 text-body text-ink-muted">
          {mode === 'signin'
            ? 'Sign in to see today’s costs, margin and open orders.'
            : 'Track ingredient costs, price your menu and know your real profit.'}
        </p>

        <form onSubmit={submit} className="mt-7 flex flex-col gap-3.5">
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={setEmail}
          />

          <Field
            label="Password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={password}
            onChange={setPassword}
          />

          {mode === 'signup' ? (
            <Field
              label="Shop name"
              required
              placeholder="Sweet Atelier"
              value={shopName}
              onChange={setShopName}
            />
          ) : null}

          {error ? (
            <p role="alert" className="rounded-card bg-semantic-error/10 p-3 text-label font-medium text-ink">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="rounded-card bg-surface-cream-strong p-3 text-label font-medium text-ink">
              {notice}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="pressable mt-1 flex items-center justify-center rounded-pill bg-brand-primary py-3.5 text-body font-medium text-ink-on-primary disabled:opacity-60"
          >
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-body text-ink-muted">
          {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
          <Link
            to={mode === 'signin' ? '/signup' : '/signin'}
            className="font-medium text-brand-primary-active underline underline-offset-2"
          >
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ...input
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label font-medium text-ink">{label}</span>
      <input
        {...input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-card bg-surface-card px-4 py-3 text-body text-ink outline-none transition-shadow placeholder:text-ink-muted-soft focus:ring-2 focus:ring-brand-primary/40"
      />
    </label>
  );
}

