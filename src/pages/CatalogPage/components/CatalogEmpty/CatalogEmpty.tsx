import type { CatalogPageModel } from "../../CatalogPage.module";

type Tab = CatalogPageModel["tab"];

const EMPTY_STATES: Record<Tab, { title: string; body: string; icon: string }> = {
  recipes: {
    title: "No recipes yet",
    body: "Scan a handwritten recipe or upload a photo, and it will appear in your kitchen with costs worked out.",
    icon: "M24 14a8 8 0 0 0-8-8H4v30h14a6 6 0 0 1 6 6 6 6 0 0 1 6-6h14V6H32a8 8 0 0 0-8 8v28",
  },
  receipts: {
    title: "No receipts yet",
    body: "Snap a supermarket receipt and every line item and expense is extracted for you.",
    icon: "M8 4v40l4-2 4 2 4-2 4 2 4-2 4 2 4-2 4 2V4l-4 2-4-2-4 2-4-2-4 2-4-2-4 2Z M32 16H20a4 4 0 0 0 0 8h8a4 4 0 0 1 0 8H16 M24 13v22",
  },
  inventory: {
    title: "Your pantry is empty",
    body: "Stock levels fill in automatically as you add receipts, and low-stock alerts appear here.",
    icon: "M15 8.54l18 10.3 M42 16a4 4 0 0 0-2-3.46l-14-8a4 4 0 0 0-4 0l-14 8A4 4 0 0 0 6 16v16a4 4 0 0 0 2 3.46l14 8a4 4 0 0 0 4 0l14-8A4 4 0 0 0 42 32Z M6.6 14 24 24l17.4-10 M24 24v20",
  },
};

export function CatalogEmpty({ tab }: { tab: Tab }) {
  const { title, body, icon } = EMPTY_STATES[tab];

  return (
    <div
      role="status"
      className="mt-3 flex flex-1 flex-col items-center justify-center gap-3 px-4 py-6 text-center"
    >
      <svg
        aria-hidden="true"
        className="mb-5 h-12 w-12 shrink-0 text-ink-muted"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={icon} />
      </svg>
      <h2 className="font-display text-card-value tracking-normal text-ink">{title}</h2>
      <p className="max-w-[270px] text-sm leading-[18px] text-ink-muted">{body}</p>
      <p className="text-[13px] font-medium leading-4 text-ink-muted">
        Tap + to scan or upload
      </p>
    </div>
  );
}
