import type React from "react";
const LINES = [
  ["Butter, salted · 2 kg", "$16.40"],
  ["Flour, pastry · 10 kg", "$14.20"],
  ["Vanilla beans · 12", "$21.50"],
];

export const LandingPreview: React.FC = () => {
  return (
    <section
      className="flex flex-col gap-2.5 px-6 pb-14 pt-9"
      aria-label="Product preview"
    >
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
        {LINES.map(([name, price]) => (
          <div
            key={name}
            className="flex items-center justify-between font-sans text-[14px] leading-[20px] text-ink-body"
          >
            <span>{name}</span>
            <span>{price}</span>
          </div>
        ))}
        <div className="h-[1px] w-full bg-hairline" />
        <div className="flex items-baseline justify-between">
          <span className="font-sans text-[12px] font-medium tracking-[0.12em] text-ink-muted">
            TOTAL
          </span>
          <span className="font-display text-[26px] leading-[28px] text-ink">
            $52.10
          </span>
        </div>
      </div>
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
  );
};
