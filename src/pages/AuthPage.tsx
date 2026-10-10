import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button, Input } from '../components/ui';
import { IconGoogle, IconApple } from '../components/icons';

type Mode = 'signin' | 'signup';

export function AuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const client = supabase;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [segment, setSegment] = useState<Mode>(mode);

  useEffect(() => {
    setError(null);
    setNotice(null);
    setSegment(mode);
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
      if (segment === 'signin') {
        const { error: signInError } = await client.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password,
          options: { data: { fullName } },
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

  const isSignIn = segment === 'signin';

  return (
    <div className="shell">
      <div className="flex flex-1 flex-col justify-center px-6 pb-10">
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center justify-center rounded-full bg-brand-primary" style={{ width: '40px', height: '40px' }}>
            <span className="font-display text-[28px] leading-none text-ink-on-primary">Neuton</span>
          </div>
        </div>

        <h1 className="font-display text-[48px] leading-[1.2] tracking-tight text-ink text-center">
          {isSignIn ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-2 text-body text-ink-muted text-center">
          {isSignIn
            ? 'Sign in to manage costs, margins and orders.'
            : 'Track costs, price your menu and know your real profit.'}
        </p>

        <div className="mt-6 flex h-[40px] rounded-[10px] bg-surface-soft" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={isSignIn}
            onClick={() => setSegment('signin')}
            className={`flex-1 flex items-center justify-center rounded-[8px] text-label font-medium transition-colors ${
              isSignIn ? 'bg-surface-card text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isSignIn}
            onClick={() => setSegment('signup')}
            className={`flex-1 flex items-center justify-center rounded-[8px] text-label font-medium transition-colors ${
              !isSignIn ? 'bg-surface-card text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          {isSignIn ? null : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-label font-medium text-ink-muted">
                Full name
              </label>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-label font-medium text-ink-muted">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-label font-medium text-ink-muted">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </div>

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

          <Button
            type="submit"
            variant="primary"
            size="lg"
            radius="input"
            block
            loading={busy}
            className="h-12"
          >
            {busy ? 'Working…' : isSignIn ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        {isSignIn && (
          <p className="mt-3 text-right">
            <Link
              to="/forgot-password"
              className="text-label font-medium text-brand-primary-active underline underline-offset-2 hover:text-brand-primary"
            >
              Forgot password?
            </Link>
          </p>
        )}

        <div className="mt-6 flex items-center gap-3 text-label text-ink-muted">
          <div className="flex-1 h-[1px] bg-hairline" />
          <span>or continue with</span>
          <div className="flex-1 h-[1px] bg-hairline" />
        </div>

        <div className="mt-4 flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            radius="input"
            block
            className="h-12 flex-1 flex items-center justify-center gap-2 bg-surface-canvas text-ink border border-hairline hover:bg-surface-soft"
          >
            <IconGoogle className="h-5 w-5" strokeWidth={0} />
            <span className="text-body font-medium">Google</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            radius="input"
            block
            className="h-12 flex-1 flex items-center justify-center gap-2 bg-surface-canvas text-ink border border-hairline hover:bg-surface-soft"
          >
            <IconApple className="h-5 w-5" strokeWidth={0} />
            <span className="text-body font-medium">Apple</span>
          </Button>
        </div>
      </div>
    </div>
  );
}