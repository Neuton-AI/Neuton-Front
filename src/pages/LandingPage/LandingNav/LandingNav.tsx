import { Link } from 'react-router-dom';

export function LandingNav({
  menuOpen,
  onToggle,
}: {
  menuOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-hairline bg-surface-canvas/95 px-6 backdrop-blur-sm">
      <Link to="/" className="flex items-center gap-2.5" aria-label="Neuton home">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] bg-brand-primary">
          <span className="font-display text-[20px] font-medium leading-none text-white">N</span>
        </div>
        <span className="font-display text-[28px] leading-none tracking-[-0.3px] text-ink">Neuton</span>
      </Link>
      <div className="flex items-center gap-3">
        <Link
          to="/signup"
          className="flex h-9 items-center justify-center rounded-[8px] bg-brand-primary px-4 font-sans text-[14px] font-medium text-white transition hover:bg-brand-primary-active active:scale-[0.98]"
        >
          Start free
        </Link>
        <button
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={onToggle}
          className="flex h-9 w-9 items-center justify-center rounded-[8px] text-ink hover:bg-surface-soft active:scale-[0.96]"
        >
          {menuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 8h16M4 16h16" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}

export function LandingMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="animate-in fade-in border-b border-hairline bg-surface-canvas px-6 py-4">
      <nav className="flex flex-col gap-3 font-sans text-[15px]">
        <a href="#how-it-works" onClick={onNavigate} className="py-1 text-ink-body hover:text-ink">How it works</a>
        <a href="#features" onClick={onNavigate} className="py-1 text-ink-body hover:text-ink">Features</a>
        <a href="#pricing" onClick={onNavigate} className="py-1 text-ink-body hover:text-ink">Pricing</a>
        <div className="my-1 h-[1px] bg-hairline" />
        <Link to="/signin" onClick={onNavigate} className="py-1 font-medium text-brand-primary-active hover:text-brand-primary">Sign in</Link>
        <Link to="/signup" onClick={onNavigate} className="flex h-11 items-center justify-center rounded-[8px] bg-brand-primary font-medium text-white transition hover:bg-brand-primary-active">
          Create free account
        </Link>
      </nav>
    </div>
  );
}
