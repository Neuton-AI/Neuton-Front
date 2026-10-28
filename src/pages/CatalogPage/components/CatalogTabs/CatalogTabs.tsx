import type React from "react";
type Tab = "recipes" | "receipts" | "inventory";

const TABS: { key: Tab; label: string }[] = [
  { key: "recipes", label: "Recipes" },
  { key: "receipts", label: "Receipts" },
  { key: "inventory", label: "Inventory" },
];

interface ICatalogTabs {
  tab: Tab;
  onSelect: (tab: Tab) => void;
}

export const CatalogTabs: React.FC<ICatalogTabs> = ({ tab, onSelect }) => {
  return (
    <div className="no-scrollbar mt-4 overflow-x-auto px-4">
      <div
        role="tablist"
        aria-label="Catalog section"
        className="flex gap-1 rounded-card border border-hairline bg-surface-soft p-1"
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            type="button"
            onClick={() => onSelect(key)}
            className={`pressable flex shrink-0 items-center rounded-input px-3.5 py-2 text-label font-medium transition-colors duration-200 ${
              tab === key ? "bg-surface-card text-ink" : "text-ink-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
