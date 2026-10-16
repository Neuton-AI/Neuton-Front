import { useState } from 'react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="shell bg-surface-canvas min-h-screen text-ink antialiased">
      {/* Top Nav */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-hairline bg-surface-canvas/95 px-6 backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Neuton home">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] bg-brand-primary">
            <span className="font-display text-[20px] font-medium leading-none text-white">N</span>
          </div>
          <span className="font-display text-[28px] tracking-[-0.3px] leading-none text-ink">
            Neuton
          </span>
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
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] text-ink hover:bg-surface-soft active:scale-[0.96]"
          >
            {menuOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M4 8h16M4 16h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Dropdown */}
      {menuOpen && (
        <div className="border-b border-hairline bg-surface-canvas px-6 py-4 animate-in fade-in">
          <nav className="flex flex-col gap-3 font-sans text-[15px]">
            <a
              href="#how-it-works"
              onClick={() => setMenuOpen(false)}
              className="py-1 text-ink-body hover:text-ink"
            >
              How it works
            </a>
            <a
              href="#features"
              onClick={() => setMenuOpen(false)}
              className="py-1 text-ink-body hover:text-ink"
            >
              Features
            </a>
            <a
              href="#pricing"
              onClick={() => setMenuOpen(false)}
              className="py-1 text-ink-body hover:text-ink"
            >
              Pricing
            </a>
            <div className="my-1 h-[1px] bg-hairline" />
            <Link
              to="/signin"
              onClick={() => setMenuOpen(false)}
              className="py-1 font-medium text-brand-primary-active hover:text-brand-primary"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              onClick={() => setMenuOpen(false)}
              className="flex h-11 items-center justify-center rounded-[8px] bg-brand-primary font-medium text-white transition hover:bg-brand-primary-active"
            >
              Create free account
            </Link>
          </nav>
        </div>
      )}

      {/* Hero Section */}
      <section className="flex flex-col gap-5 px-6 pt-9">
        <span className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-brand-primary-active">
          For small kitchens
        </span>
        <h1 className="font-display text-[56px] leading-[54px] tracking-[-0.03em] text-ink">
          Just upload. Neuton takes care of the numbers.
        </h1>
        <p className="font-sans text-[16px] leading-[25px] text-ink-body">
          Snap a receipt, drop in a recipe, log an order. Neuton turns them into unit costs, stock,
          and profit.
        </p>
        <div className="flex flex-col items-center gap-3 pt-1">
          <Link
            to="/signup"
            className="flex h-[52px] w-full items-center justify-center rounded-[8px] bg-brand-primary font-sans text-[15px] font-medium text-white transition hover:bg-brand-primary-active active:scale-[0.98]"
          >
            Start free
          </Link>
          <span className="font-sans text-[13px] leading-[18px] text-ink-muted">
            Free to start · No credit card
          </span>
        </div>
      </section>

      {/* Hero Visual: Receipt & Profit Cards */}
      <section className="flex flex-col gap-2.5 px-6 pb-14 pt-9" aria-label="Product preview">
        {/* Receipt Card */}
        <div className="flex flex-col gap-3 rounded-[16px] border border-hairline bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-sans text-[15px] font-medium leading-[20px] text-ink">
                Greenfield Market
              </span>
              <span className="font-sans text-[13px] leading-[18px] text-ink-muted">
                Sept 29 · Photo upload
              </span>
            </div>
            <div className="rounded-full bg-brand-teal px-2.5 py-1">
              <span className="font-sans text-[12px] font-medium leading-[16px] text-ink">
                Read
              </span>
            </div>
          </div>

          <div className="h-[1px] w-full bg-hairline" />

          <div className="flex items-center justify-between font-sans text-[14px] leading-[20px] text-ink-body">
            <span>Butter, salted · 2 kg</span>
            <span>$16.40</span>
          </div>
          <div className="flex items-center justify-between font-sans text-[14px] leading-[20px] text-ink-body">
            <span>Flour, pastry · 10 kg</span>
            <span>$14.20</span>
          </div>
          <div className="flex items-center justify-between font-sans text-[14px] leading-[20px] text-ink-body">
            <span>Vanilla beans · 12</span>
            <span>$21.50</span>
          </div>

          <div className="h-[1px] w-full bg-hairline" />

          <div className="flex items-baseline justify-between">
            <span className="font-sans text-[12px] font-medium tracking-[0.12em] text-ink-muted">
              TOTAL
            </span>
            <span className="font-display text-[26px] leading-[28px] text-ink">$52.10</span>
          </div>
        </div>

        {/* Profit Card */}
        <div className="flex flex-col gap-1.5 rounded-[16px] bg-surface-dark p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[12px] font-medium tracking-[0.12em] text-[#A09D96]">
              NET PROFIT
            </span>
            <div className="rounded-full bg-brand-teal px-2.5 py-1">
              <span className="font-sans text-[12px] font-medium leading-[16px] text-ink">
                +12.4%
              </span>
            </div>
          </div>
          <span className="font-display text-[40px] leading-[44px] text-surface-canvas">
            $3,482
          </span>
          <svg
            width="100%"
            height="56"
            viewBox="0 0 302 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full shrink-0"
            aria-hidden="true"
          >
            <path
              d="M0 48C30 46 50 34 80 38S130 46 160 30 220 14 250 22 285 8 302 6"
              fill="none"
              stroke="#E8A55A"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="flex flex-col gap-7 bg-surface-soft px-6 py-14">
        <div className="flex flex-col gap-3">
          <span className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-brand-primary-active">
            How it works
          </span>
          <h2 className="font-display text-[38px] leading-[40px] tracking-[-0.02em] text-ink">
            From receipt to real costs.
          </h2>
        </div>

        <div className="flex flex-col">
          {/* Step 1 */}
          <div className="flex gap-5 border-t border-hairline py-[22px]">
            <span className="w-7 flex-shrink-0 font-display text-[44px] leading-[40px] text-brand-primary">
              1
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="font-sans text-[18px] font-medium leading-[25px] text-ink">Upload</h3>
              <p className="font-sans text-[15px] leading-[23px] text-ink-body">
                A photo or PDF of a receipt, recipe, or order sheet.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-5 border-t border-hairline py-[22px]">
            <span className="w-7 flex-shrink-0 font-display text-[44px] leading-[40px] text-brand-primary">
              2
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="font-sans text-[18px] font-medium leading-[25px] text-ink">
                Neuton reads it
              </h3>
              <p className="font-sans text-[15px] leading-[23px] text-ink-body">
                Items, prices, and quantities are pulled out while you keep cooking.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-5 border-t border-hairline pt-[22px]">
            <span className="w-7 flex-shrink-0 font-display text-[44px] leading-[40px] text-brand-primary">
              3
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="font-sans text-[18px] font-medium leading-[25px] text-ink">
                See the numbers
              </h3>
              <p className="font-sans text-[15px] leading-[23px] text-ink-body">
                Unit costs, stock, order margins, and profit in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What you get / Features */}
      <section id="features" className="flex flex-col gap-7 px-6 py-14">
        <div className="flex flex-col gap-3">
          <span className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-brand-primary-active">
            What you get
          </span>
          <h2 className="font-display text-[38px] leading-[40px] tracking-[-0.02em] text-ink">
            Know what every recipe and order makes.
          </h2>
        </div>

        <div className="flex flex-col gap-2.5">
          {/* Card 1: Recipe costing */}
          <div className="flex flex-col gap-2 rounded-[12px] bg-surface-card p-6">
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
              Recipe costing
            </span>
            <h3 className="font-display text-[28px] leading-[32px] text-ink">
              True cost per recipe
            </h3>
            <p className="font-sans text-[15px] leading-[23px] text-ink-body">
              Ingredients, packaging, and prep time, updated as supplier prices change.
            </p>
          </div>

          {/* Card 2: Inventory */}
          <div className="flex flex-col gap-2 rounded-[12px] bg-surface-dark p-6 text-surface-canvas">
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-[#A09D96]">
              Inventory
            </span>
            <h3 className="font-display text-[28px] leading-[32px] text-ink-on-dark">
              Stock that updates itself
            </h3>
            <p className="font-sans text-[15px] leading-[23px] text-[#C9C6BE]">
              Each receipt updates quantities and average costs, and flags low stock.
            </p>
          </div>

          {/* Card 3: Orders */}
          <div className="flex flex-col gap-2 rounded-[12px] bg-brand-primary-active p-6 text-white">
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-[#F3DDD3]">
              Orders
            </span>
            <h3 className="font-display text-[28px] leading-[32px] text-white">
              Margin before you say yes
            </h3>
            <p className="font-sans text-[15px] leading-[23px] text-[#FBEEE8]">
              Add an address and Neuton adds the delivery fee, so you see your margin first.
            </p>
            <div className="pt-1.5 font-display text-[24px] leading-[30px] text-white">
              $5.00 + 12 km × $1.50 = $23.00
            </div>
          </div>

          {/* Card 4: Dashboard */}
          <div className="flex flex-col gap-2 rounded-[12px] bg-surface-card p-6">
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
              Dashboard
            </span>
            <h3 className="font-display text-[28px] leading-[32px] text-ink">
              Revenue, expenses, profit
            </h3>
            <p className="font-sans text-[15px] leading-[23px] text-ink-body">
              Trends and your top seller, on the first screen you open.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="flex flex-col gap-7 bg-surface-soft px-6 py-14">
        <div className="flex flex-col gap-3">
          <span className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-brand-primary-active">
            Pricing
          </span>
          <h2 className="font-display text-[38px] leading-[40px] tracking-[-0.02em] text-ink">
            Start free. Upgrade when you need more.
          </h2>
        </div>

        <div className="flex flex-col gap-2.5">
          {/* Free Tier */}
          <div className="flex flex-col gap-2.5 rounded-[12px] border border-hairline bg-surface-canvas px-6 py-[22px]">
            <div className="flex items-baseline justify-between">
              <span className="font-sans text-[18px] font-medium leading-[24px] text-ink">
                Free
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[36px] leading-[36px] text-ink">$0</span>
                <span className="font-sans text-[13px] leading-[18px] text-ink-muted">forever</span>
              </div>
            </div>
            <p className="font-sans text-[14px] leading-[21px] text-ink-body">
              Monthly upload limit. Unit costs, live inventory, and the dashboard.
            </p>
          </div>

          {/* Pro Tier (Popular) */}
          <div className="flex flex-col gap-2.5 rounded-[12px] bg-surface-dark px-6 py-[22px] text-surface-canvas">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-sans text-[18px] font-medium leading-[24px] text-ink-on-dark">
                  Pro
                </span>
                <span className="rounded-full bg-brand-primary px-2.5 py-[3px] font-sans text-[11px] font-medium tracking-[0.08em] text-white">
                  MOST POPULAR
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[36px] leading-[36px] text-ink-on-dark">
                  $19
                </span>
                <span className="font-sans text-[13px] leading-[18px] text-[#A09D96]">/month</span>
              </div>
            </div>
            <p className="font-sans text-[14px] leading-[21px] text-[#C9C6BE]">
              Unlimited uploads, distance-based delivery fees, and low-stock alerts.
            </p>
          </div>

          {/* Business Tier */}
          <div className="flex flex-col gap-2.5 rounded-[12px] border border-hairline bg-surface-canvas px-6 py-[22px]">
            <div className="flex items-baseline justify-between">
              <span className="font-sans text-[18px] font-medium leading-[24px] text-ink">
                Business
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[36px] leading-[36px] text-ink">$49</span>
                <span className="font-sans text-[13px] leading-[18px] text-ink-muted">/month</span>
              </div>
            </div>
            <p className="font-sans text-[14px] leading-[21px] text-ink-body">
              Everything in Pro, plus team access and priority support.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-14">
        <div className="flex flex-col gap-5 rounded-[12px] bg-brand-primary px-6 py-10 shadow-sm">
          <h2 className="font-display text-[40px] leading-[42px] tracking-[-0.02em] text-white">
            Upload your first receipt.
          </h2>
          <Link
            to="/signup"
            className="flex h-[52px] w-full items-center justify-center rounded-[8px] bg-surface-canvas font-sans text-[15px] font-medium text-ink transition hover:bg-white active:scale-[0.98]"
          >
            Create free account
          </Link>
          <p className="text-center font-sans text-[13px] leading-[18px] text-[#F3DDD3]">
            Free to start · No credit card
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col gap-6 bg-surface-dark px-6 py-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] bg-brand-primary">
            <span className="font-display text-[20px] font-medium leading-none text-white">N</span>
          </div>
          <span className="font-display text-[28px] leading-none text-ink-on-dark">Neuton</span>
        </div>

        <nav className="flex w-[240px] flex-wrap gap-x-7 gap-y-3 font-sans text-[14px] leading-[20px] text-[#C9C6BE]">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
          <Link to="/signin" className="hover:text-white transition-colors">
            Log in
          </Link>
          <a href="mailto:support@neuton.app" className="hover:text-white transition-colors">
            Contact
          </a>
          <a href="#privacy" className="hover:text-white transition-colors">
            Privacy
          </a>
          <a href="#terms" className="hover:text-white transition-colors">
            Terms
          </a>
        </nav>

        <div className="h-[1px] w-full bg-[#252320]" />

        <p className="font-sans text-[13px] leading-[18px] text-[#A09D96]">
          © 2026 Neuton. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
