import { BottomNav } from '@/components/BottomNav/BottomNav';

export function DashboardEmpty({ onSetUp }: { onSetUp: () => void }) {
  return (
    <div className="shell">
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="font-display text-title text-ink">No shop yet</h1>
        <p className="max-w-[34ch] text-body text-ink-muted">
          Create a shop to start tracking ingredient costs, menu pricing and real profit.
        </p>
        <button
          type="button"
          onClick={onSetUp}
          className="pressable mt-2 rounded-pill bg-brand-primary px-5 py-3 text-label font-medium text-ink-on-primary"
        >
          Set up a shop
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
