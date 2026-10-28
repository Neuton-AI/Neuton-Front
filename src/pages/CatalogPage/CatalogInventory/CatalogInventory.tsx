import { EmptyState } from '@/components/feedback';
import { IconBox } from '@/components/icons';
import { formatQuantity } from '@/lib/format';
import type { CatalogPageModel } from '../CatalogPage.module';
import { CatalogCaptureLink } from '../RecipeCard/RecipeCard';

type Item = CatalogPageModel['inventory'][number];

export function InventoryTile({ item }: { item: Item }) {
  return (
    <div className="flex aspect-square flex-col gap-2 rounded-card bg-surface-card p-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-input bg-surface-canvas">
        <IconBox className="h-[19px] w-[19px] text-ink-muted-soft" />
      </div>
      <div className="h-[18px] shrink-0" aria-hidden="true" />
      <p className="truncate text-label font-medium text-ink-muted">{item.name}</p>
      <p className="truncate text-[22px] font-medium leading-[1.3] text-ink">
        {formatQuantity(item.baseUnitAmount, item.baseUnit)}
      </p>
    </div>
  );
}

export function CatalogInventory({ model }: { model: CatalogPageModel }) {
  if (model.errors.inventory) return null;
  if (model.inventory.length === 0) {
    return (
      <EmptyState
        icon={<IconBox className="h-9 w-9" />}
        title="Inventory is empty"
        body="Upload a supplier receipt and Neuton will create stock items and roll their weighted average cost."
        action={<CatalogCaptureLink to="/capture?kind=receipt" label="Upload a receipt" />}
      />
    );
  }
  return (
    <>
      {model.inventory.map((item) => (
        <InventoryTile key={item.id} item={item} />
      ))}
    </>
  );
}
