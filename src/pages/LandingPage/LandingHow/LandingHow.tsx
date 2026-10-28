const STEPS = [
  ['1', 'Upload', 'A photo or PDF of a receipt, recipe, or order sheet.'],
  ['2', 'Neuton reads it', 'Items, prices, and quantities are pulled out while you keep cooking.'],
  ['3', 'See the numbers', 'Unit costs, stock, order margins, and profit in one place.'],
];

export function LandingHow() {
  return (
    <section id="how-it-works" className="flex flex-col gap-7 bg-surface-soft px-6 py-14">
      <div className="flex flex-col gap-3">
        <span className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-brand-primary-active">How it works</span>
        <h2 className="font-display text-[38px] leading-[40px] tracking-[-0.02em] text-ink">From receipt to real costs.</h2>
      </div>
      <div className="flex flex-col">
        {STEPS.map(([number, title, body], index) => (
          <div key={number} className={`flex gap-5 border-t border-hairline ${index === STEPS.length - 1 ? 'pt-[22px]' : 'py-[22px]'}`}>
            <span className="w-7 flex-shrink-0 font-display text-[44px] leading-[40px] text-brand-primary">{number}</span>
            <div className="flex flex-col gap-1">
              <h3 className="font-sans text-[18px] font-medium leading-[25px] text-ink">{title}</h3>
              <p className="font-sans text-[15px] leading-[23px] text-ink-body">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
