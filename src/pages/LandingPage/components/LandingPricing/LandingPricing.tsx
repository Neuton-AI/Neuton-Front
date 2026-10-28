import type React from "react";
import { Link } from "react-router-dom";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    body: "Monthly upload limit. Unit costs, live inventory, and the dashboard.",
    popular: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    body: "Unlimited uploads, distance-based delivery fees, and low-stock alerts.",
    popular: true,
  },
  {
    name: "Business",
    price: "$49",
    period: "/month",
    body: "Everything in Pro, plus team access and priority support.",
    popular: false,
  },
];

export const LandingPricing: React.FC = () => {
  return (
    <section
      id="pricing"
      className="flex flex-col gap-7 bg-surface-soft px-6 py-14"
    >
      <div className="flex flex-col gap-3">
        <span className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-brand-primary-active">
          Pricing
        </span>
        <h2 className="font-display text-[38px] leading-[40px] tracking-[-0.02em] text-ink">
          Start free. Upgrade when you need more.
        </h2>
      </div>
      <div className="flex flex-col gap-2.5">
        {TIERS.map((tier) => (
          <article
            key={tier.name}
            className={`flex flex-col gap-2.5 rounded-[12px] px-6 py-[22px] ${tier.popular ? "bg-surface-dark text-surface-canvas" : "border border-hairline bg-surface-canvas"}`}
          >
            <div
              className={`flex ${tier.popular ? "items-center" : "items-baseline"} justify-between`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`font-sans text-[18px] font-medium leading-[24px] ${tier.popular ? "text-ink-on-dark" : "text-ink"}`}
                >
                  {tier.name}
                </span>
                {tier.popular ? (
                  <span className="rounded-full bg-brand-primary px-2.5 py-[3px] font-sans text-[11px] font-medium tracking-[0.08em] text-white">
                    MOST POPULAR
                  </span>
                ) : null}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`font-display text-[36px] leading-[36px] ${tier.popular ? "text-ink-on-dark" : "text-ink"}`}
                >
                  {tier.price}
                </span>
                <span
                  className={`font-sans text-[13px] leading-[18px] ${tier.popular ? "text-[#A09D96]" : "text-ink-muted"}`}
                >
                  {tier.period}
                </span>
              </div>
            </div>
            <p
              className={`font-sans text-[14px] leading-[21px] ${tier.popular ? "text-[#C9C6BE]" : "text-ink-body"}`}
            >
              {tier.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export const LandingFooter: React.FC = () => {
  return (
    <footer className="flex flex-col gap-6 bg-surface-dark px-6 py-10">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] bg-brand-primary">
          <span className="font-display text-[20px] font-medium leading-none text-white">
            N
          </span>
        </div>
        <span className="font-display text-[28px] leading-none text-ink-on-dark">
          Neuton
        </span>
      </div>
      <nav className="flex w-[240px] flex-wrap gap-x-7 gap-y-3 font-sans text-[14px] leading-[20px] text-[#C9C6BE]">
        <a href="#features" className="transition-colors hover:text-white">
          Features
        </a>
        <a href="#pricing" className="transition-colors hover:text-white">
          Pricing
        </a>
        <Link to="/signin" className="transition-colors hover:text-white">
          Log in
        </Link>
        <a
          href="mailto:support@neuton.app"
          className="transition-colors hover:text-white"
        >
          Contact
        </a>
        <a href="#privacy" className="transition-colors hover:text-white">
          Privacy
        </a>
        <a href="#terms" className="transition-colors hover:text-white">
          Terms
        </a>
      </nav>
      <div className="h-[1px] w-full bg-[#252320]" />
      <p className="font-sans text-[13px] leading-[18px] text-[#A09D96]">
        © 2026 Neuton. All rights reserved.
      </p>
    </footer>
  );
};
