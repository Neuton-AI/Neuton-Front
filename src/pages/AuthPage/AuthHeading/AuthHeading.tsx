export function AuthHeading({ isSignIn }: { isSignIn: boolean }) {
  return (
    <>
      <div className="mb-6 flex items-center justify-center">
        <div className="flex items-center justify-center rounded-full bg-brand-primary" style={{ width: '40px', height: '40px' }}>
          <span className="font-display text-[28px] leading-none text-ink-on-primary">Neuton</span>
        </div>
      </div>
      <h1 className="text-center font-display text-[48px] leading-[1.2] tracking-tight text-ink">
        {isSignIn ? 'Welcome back' : 'Create your account'}
      </h1>
      <p className="mt-2 text-center text-body text-ink-muted">
        {isSignIn
          ? 'Sign in to manage costs, margins and orders.'
          : 'Track costs, price your menu and know your real profit.'}
      </p>
    </>
  );
}

export function AuthModeTabs({
  isSignIn,
  onSelect,
}: {
  isSignIn: boolean;
  onSelect: (mode: 'signin' | 'signup') => void;
}) {
  return (
    <div className="mt-6 flex h-[40px] rounded-[10px] bg-surface-soft" role="tablist" aria-label="Authentication mode">
      <button
        type="button"
        role="tab"
        aria-selected={isSignIn}
        onClick={() => onSelect('signin')}
        className={`flex flex-1 items-center justify-center rounded-[8px] text-label font-medium transition-colors ${
          isSignIn ? 'bg-surface-card text-ink' : 'text-ink-muted hover:text-ink'
        }`}
      >
        Sign In
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={!isSignIn}
        onClick={() => onSelect('signup')}
        className={`flex flex-1 items-center justify-center rounded-[8px] text-label font-medium transition-colors ${
          !isSignIn ? 'bg-surface-card text-ink' : 'text-ink-muted hover:text-ink'
        }`}
      >
        Create Account
      </button>
    </div>
  );
}
