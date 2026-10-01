import { NavLink } from 'react-router-dom';
import { IconBag, IconBook, IconHome, IconUser } from './icons';

const ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconHome },
  { to: '/catalog', label: 'Catalog', Icon: IconBook },
  { to: '/orders', label: 'Orders', Icon: IconBag },
  { to: '/profile', label: 'Profile', Icon: IconUser },
] as const;

/**
 * Fixed bottom navigation. The active item gets the soft pill behind the icon,
 * matching the OpenPencil dashboard frame.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface-canvas"
      style={{ paddingBottom: 'max(var(--safe-bottom), 12px)' }}
    >
      <ul className="mx-auto flex max-w-shell items-start justify-between px-5 pt-2.5">
        {ITEMS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink to={to} className="flex flex-col items-center gap-1 py-0.5">
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-pill transition-colors duration-200 ${
                      isActive ? 'bg-surface-card text-brand-primary-active' : 'text-ink-muted'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span
                    className={`text-label font-medium ${isActive ? 'text-ink' : 'text-ink-muted'}`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}