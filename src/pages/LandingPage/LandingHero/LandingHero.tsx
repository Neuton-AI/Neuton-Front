import { Link } from 'react-router-dom';

export function LandingHero() {
  return (
    <section className="flex flex-col gap-5 px-6 pt-9">
      <span className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-brand-primary-active">For small kitchens</span>
      <h1 className="font-display text-[56px] leading-[54px] tracking-[-0.03em] text-ink">Just upload. Neuton takes care of the numbers.</h1>
      <p className="font-sans text-[16px] leading-[25px] text-ink-body">
        Snap a receipt, drop in a recipe, log an order. Neuton turns them into unit costs, stock, and profit.
      </p>
      <div className="flex flex-col items-center gap-3 pt-1">
        <Link to="/signup" className="flex h-[52px] w-full items-center justify-center rounded-[8px] bg-brand-primary font-sans text-[15px] font-medium text-white transition hover:bg-brand-primary-active active:scale-[0.98]">
          Start free
        </Link>
        <span className="font-sans text-[13px] leading-[18px] text-ink-muted">Free to start · No credit card</span>
      </div>
    </section>
  );
}

export function LandingCta() {
  return (
    <section className="px-4 py-14">
      <div className="flex flex-col gap-5 rounded-[12px] bg-brand-primary px-6 py-10 shadow-sm">
        <h2 className="font-display text-[40px] leading-[42px] tracking-[-0.02em] text-white">Upload your first receipt.</h2>
        <Link to="/signup" className="flex h-[52px] w-full items-center justify-center rounded-[8px] bg-surface-canvas font-sans text-[15px] font-medium text-ink transition hover:bg-white active:scale-[0.98]">
          Create free account
        </Link>
        <p className="text-center font-sans text-[13px] leading-[18px] text-[#F3DDD3]">Free to start · No credit card</p>
      </div>
    </section>
  );
}
