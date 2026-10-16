import { FormFields } from '@/components/FormFields/FormFields';
import { Button } from '@/components/ui';
import { Link } from 'react-router-dom';
import { useAuthPage } from './AuthPage.module';
type Mode = 'signin' | 'signup';

export function AuthPage({ mode }: { mode: Mode }) {
  const {
    fields,
    formValues,
    handleFieldChange,
    isConfigured,
    busy,
    error,
    notice,
    setSegment,
    submit,
    isSignIn,
  } = useAuthPage({ mode });
  if (!isConfigured) {
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
  return (
    <div className="shell">
      <div className="flex flex-1 flex-col justify-center px-6 pb-10">
        <div className="flex items-center justify-center mb-6">
          <div
            className="flex items-center justify-center rounded-full bg-brand-primary"
            style={{ width: '40px', height: '40px' }}
          >
            <span className="font-display text-[28px] leading-none text-ink-on-primary">
              Neuton
            </span>
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

        <div
          className="mt-6 flex h-[40px] rounded-[10px] bg-surface-soft"
          role="tablist"
          aria-label="Authentication mode"
        >
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
          <FormFields fields={fields} values={formValues} onChange={handleFieldChange} />
          {error ? (
            <p
              role="alert"
              className="rounded-card bg-semantic-error/10 p-3 text-label font-medium text-ink"
            >
              {error}
            </p>
          ) : null}
          {notice ? (
            <p
              role="status"
              className="rounded-card bg-surface-cream-strong p-3 text-label font-medium text-ink"
            >
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
            variant="outline"
            size="lg"
            radius="card"
            block
            className="h-[54px] flex-1 text-[16px] font-bold text-ink"
          >
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            radius="card"
            block
            className="h-[54px] flex-1 text-[16px] font-bold text-ink"
          >
            Apple
          </Button>
        </div>
      </div>
    </div>
  );
}
