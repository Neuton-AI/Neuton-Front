const CARDS = [
  { eyebrow: 'Recipe costing', title: 'True cost per recipe', body: 'Ingredients, packaging, and prep time, updated as supplier prices change.', tone: 'card' },
  { eyebrow: 'Inventory', title: 'Stock that updates itself', body: 'Each receipt updates quantities and average costs, and flags low stock.', tone: 'dark' },
  { eyebrow: 'Orders', title: 'Margin before you say yes', body: 'Add an address and Neuton adds the delivery fee, so you see your margin first.', tone: 'brand', example: '$5.00 + 12 km × $1.50 = $23.00' },
  { eyebrow: 'Dashboard', title: 'Revenue, expenses, profit', body: 'Trends and your top seller, on the first screen you open.', tone: 'card' },
] as const;

const toneClass = {
  card: 'bg-surface-card',
  dark: 'bg-surface-dark text-surface-canvas',
  brand: 'bg-brand-primary-active p-6 text-white',
};

export function LandingFeatures() {
  return (
    <section id="features" className="flex flex-col gap-7 px-6 py-14">
      <div className="flex flex-col gap-3">
        <span className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-brand-primary-active">What you get</span>
        <h2 className="font-display text-[38px] leading-[40px] tracking-[-0.02em] text-ink">Know what every recipe and order makes.</h2>
      </div>
      <div className="flex flex-col gap-2.5">
        {CARDS.map((card) => (
          <article key={card.title} className={`flex flex-col gap-2 rounded-[12px] p-6 ${toneClass[card.tone]}`}>
            <span className={`font-sans text-[11px] font-medium uppercase tracking-[0.12em] ${card.tone === 'card' ? 'text-ink-muted' : card.tone === 'dark' ? 'text-[#A09D96]' : 'text-[#F3DDD3]'}`}>{card.eyebrow}</span>
            <h3 className={`font-display text-[28px] leading-[32px] ${card.tone === 'dark' ? 'text-ink-on-dark' : card.tone === 'brand' ? 'text-white' : 'text-ink'}`}>{card.title}</h3>
            <p className={`font-sans text-[15px] leading-[23px] ${card.tone === 'dark' ? 'text-[#C9C6BE]' : card.tone === 'brand' ? 'text-[#FBEEE8]' : 'text-ink-body'}`}>{card.body}</p>
            {'example' in card ? <div className="pt-1.5 font-display text-[24px] leading-[30px] text-white">{card.example}</div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
