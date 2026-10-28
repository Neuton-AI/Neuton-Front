import { EmptyState } from '@/components/feedback';
import { IconReceipt } from '@/components/icons';
import type { CatalogPageModel } from '../CatalogPage.module';
import { ReceiptRow } from '../ReceiptRow/ReceiptRow';
import { CatalogCaptureLink } from '../RecipeCard/RecipeCard';

export function CatalogReceipts({ model }: { model: CatalogPageModel }) {
  if (model.errors.receipts) return null;
  if (model.receipts.length === 0) {
    return (
      <EmptyState
        icon={<IconReceipt className="h-9 w-9" />}
        title="No receipts yet"
        body="Upload a shopping receipt and Neuton reads the line items, then updates your stock and costs automatically."
        action={<CatalogCaptureLink to="/capture?kind=receipt" label="Upload a receipt" />}
      />
    );
  }
  return (
    <>
      {model.receipts.map((receipt) => (
        <ReceiptRow key={receipt.id} receipt={receipt} currency={model.currency} />
      ))}
    </>
  );
}
