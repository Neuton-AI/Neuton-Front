import { BarcodeScanner } from '@/components/BarcodeScanner/BarcodeScanner';
import { ErrorState, InlineNotice, Spinner } from '@/components/feedback';
import { IngredientsPanel } from './IngredientsPanel/IngredientsPanel';
import { PreparationPanel } from './PreparationPanel/PreparationPanel';
import { RecipeEditFooter } from './RecipeEditFooter/RecipeEditFooter';
import { RecipeEditHeader, RecipeEditTabs } from './RecipeEditHeader/RecipeEditHeader';
import { useRecipeEditPage, type RecipeEditPageModel } from './RecipeEditPage.module';

export function RecipeEditPage() {
  return <RecipeEditView model={useRecipeEditPage()} />;
}

export function RecipeEditView({ model }: { model: RecipeEditPageModel }) {
  const { draft, recipe, busy, canManage } = model;
  return (
    <main className="mx-auto flex h-[100dvh] max-w-shell flex-col bg-surface-canvas pt-[max(var(--safe-top),16px)]">
      <RecipeEditHeader model={model} />
      {model.loading ? (
        <div role="status" aria-label="Loading recipe" className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : null}
      {model.error ? (
        <div className="px-4 pb-3">
          <ErrorState message={model.error} onRetry={!draft ? model.retry : undefined} />
        </div>
      ) : null}
      {!model.loading && !canManage ? (
        <div className="px-4">
          <InlineNotice>Only shop owners and admins can edit recipes.</InlineNotice>
        </div>
      ) : null}
      {!model.loading && draft && recipe && canManage ? (
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void model.save();
          }}
          noValidate
        >
          <RecipeEditTabs model={model} />
          <fieldset disabled={busy} className="min-h-0 min-w-0 flex-1">
            <div
              ref={model.carouselRef}
              onScroll={model.onCarouselScroll}
              className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth motion-reduce:scroll-auto"
            >
              <IngredientsPanel model={model} />
              <PreparationPanel model={model} />
            </div>
          </fieldset>
          <RecipeEditFooter model={model} />
        </form>
      ) : null}
      {!model.loading && !recipe && !model.error ? <p className="px-4 text-ink-muted">Recipe not found.</p> : null}
      {model.scanKey ? (
        <BarcodeScanner
          onDetected={(barcode) => void model.linkBarcode(barcode)}
          onClose={model.closeScanner}
          busy={model.scanBusy}
          error={model.scanError}
          ingredient={model.scanIngredient}
          currency={model.scanCurrency}
          onManualSave={(details) => void model.linkManualProduct(details)}
          onModeChange={model.clearScanError}
        />
      ) : null}
    </main>
  );
}
