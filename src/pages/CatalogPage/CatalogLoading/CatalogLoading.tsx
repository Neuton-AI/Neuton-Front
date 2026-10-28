function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse bg-surface-canvas ${className}`} />;
}

export function CatalogLoading({ tab }: { tab: 'recipes' | 'receipts' | 'inventory' }) {
  if (tab === 'inventory') {
    return (
      <div className="grid grid-cols-2 gap-x-5 gap-y-3" aria-hidden="true">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex aspect-square flex-col gap-2 rounded-card bg-surface-card p-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-input bg-surface-canvas" />
            <div className="h-[18px] shrink-0" />
            <Pulse className="h-3 w-[80px] max-w-full rounded-[6px]" />
            <Pulse className="h-7 w-[60px] max-w-full rounded-[6px]" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="pressable flex flex-col gap-2 rounded-card bg-surface-card p-4">
          <div className="flex items-start justify-between gap-3">
            <Pulse className={tab === 'recipes' ? 'h-14 w-[200px] max-w-[50%] rounded-card' : 'h-6 w-[180px] max-w-[50%] rounded-card'} />
            <Pulse className={tab === 'recipes' ? 'h-6 w-20 shrink-0 rounded-pill' : 'h-5 w-16 shrink-0 rounded-pill'} />
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <Pulse className={tab === 'recipes' ? 'h-3 w-[120px] max-w-[40%] rounded-[6px]' : 'h-3 w-[100px] max-w-[40%] rounded-[6px]'} />
            <Pulse className={tab === 'recipes' ? 'h-3 w-[80px] max-w-[30%] rounded-[6px]' : 'h-[18px] w-14 shrink-0 rounded-[6px]'} />
          </div>
        </div>
      ))}
    </div>
  );
}
