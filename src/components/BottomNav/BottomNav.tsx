import type React from "react";
import { IconBag, IconBook, IconHome, IconPlus, IconUser } from "@/components/icons";
import type { MediaKind } from "@/features/uploads/types";
import { Link, NavLink } from "react-router-dom";

interface IBottomNav {
  captureKind?: MediaKind;
}

interface INavItem {
  to: string;
  label: string;
  Icon: typeof IconHome;
}

const NavItem: React.FC<INavItem> = ({ to, label, Icon }) => (
  <li>
    <NavLink
      to={to}
      className="flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary-active"
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-7 w-12 items-center justify-center rounded-pill ${
              isActive ? "bg-surface-card text-brand-primary-active" : "text-ink-muted"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span
            className={`text-xs font-medium min-[360px]:text-label ${isActive ? "text-ink" : "text-ink-muted"}`}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  </li>
);

const FooterSurface: React.FC = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0">
    <div className="absolute inset-x-0 bottom-0 top-[34px] bg-white" />
    <div className="flex h-[34px]">
      <div className="flex-1 border-t border-hairline bg-white" />
      <svg className="h-full w-[86px] shrink-0" viewBox="152 48 86 34">
        <path
          d="M152 48.5 H152.3 C171.2 48.5 163.8 81.6 195 81.6 C226.2 81.6 218.8 48.5 237.7 48.5 H238 V82 H152 Z"
          className="fill-white"
        />
        <path
          d="M152 48.5 H152.3 C171.2 48.5 163.8 81.6 195 81.6 C226.2 81.6 218.8 48.5 237.7 48.5 H238"
          className="fill-none stroke-hairline"
        />
      </svg>
      <div className="flex-1 border-t border-hairline bg-white" />
    </div>
  </div>
);

export const BottomNav: React.FC<IBottomNav> = ({ captureKind }) => {
  const captureTo = captureKind ? `/capture?kind=${captureKind}` : "/capture";

  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 h-[var(--bottom-nav-height)]">
      <FooterSurface />
      <ul className="relative mx-auto grid max-w-shell grid-cols-[repeat(2,minmax(0,1fr))_46px_repeat(2,minmax(0,1fr))] px-[max(16px,var(--safe-left),var(--safe-right))] pt-2.5">
        <NavItem to="/dashboard" label="Dashboard" Icon={IconHome} />
        <NavItem to="/catalog" label="Catalog" Icon={IconBook} />
        <li className="relative">
          <Link
            to={captureTo}
            aria-label="Scan or upload"
            className="pressable absolute -top-[28px] flex h-[46px] w-[46px] items-center justify-center rounded-full bg-brand-primary text-ink-on-primary shadow-[0_6px_16px_rgba(204,120,92,0.32)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary-active"
          >
            <IconPlus className="h-5 w-5" />
          </Link>
        </li>
        <NavItem to="/orders" label="Orders" Icon={IconBag} />
        <NavItem to="/profile" label="Profile" Icon={IconUser} />
      </ul>
    </nav>
  );
};
