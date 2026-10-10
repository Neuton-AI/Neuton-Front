import { BottomNav } from '../components/BottomNav';
import { IconSearch } from '../components/icons';
import { ButtonLink } from '../components/ui';

/**
 * Shown for any route the router cannot match. Previously these fell through to
 * a silent redirect to the dashboard, which hid broken deep links (receipt,
 * recipe and order ids) and left the user unaware they had hit a dead URL.
 */
export function NotFoundPage() {
  return (
    <div className="shell">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-32 pt-[max(var(--safe-top)+44px,44px)] text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-pill bg-surface-cream-strong text-ink-muted">
          <IconSearch className="h-7 w-7" />
        </span>

        <p className="font-display text-[56px] leading-none text-ink">404</p>

        <h1 className="font-display text-[26px] leading-tight text-ink">Page not found</h1>

        <p className="max-w-[32ch] text-body text-ink-muted">
          The page you are looking for doesn&rsquo;t exist or has been moved. Check the link, or
          head back to your dashboard.
        </p>

        <ButtonLink to="/dashboard" size="md" className="mt-1">
          Back to Dashboard
        </ButtonLink>
      </div>

      <BottomNav />
    </div>
  );
}
