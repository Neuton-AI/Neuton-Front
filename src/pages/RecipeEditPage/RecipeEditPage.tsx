import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import { ErrorState, FullPageLoader, InlineNotice, Spinner } from '@/components/feedback';
import { IconCamera, IconChevronRight, IconClose, IconPlus, IconTrash } from '@/components/icons';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { Navigate } from 'react-router-dom';
import {
  type IngredientFormRow,
  useRecipeEditPage,
  type RecipeEditPageModel,
} from './RecipeEditPage.module';

const INGREDIENT_UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'pcs'];

export function RecipeEditPage() {
  return <RecipeEditView model={useRecipeEditPage()} />;
}

export function RecipeEditView({ model }: { model: RecipeEditPageModel }) {
  const {
    recipe,
    loading,
    error,
    retry,
    redirectTarget,
    recipeName,
    setRecipeName,
    prepTime,
    setPrepTime,
    yieldQty,
    setYieldQty,
    ingredientRows,
    addIngredientRow,
    updateIngredientRow,
    removeIngredientRow,
    linkingIngredientIds,
    allergenOptions,
    allergens,
    toggleAllergen,
    stepRows,
    addStep,
    updateStep,
    removeStep,
    currency,
    incomplete,
    save,
    reset,
    validationErrors,
    saveError,
    savePending,
    deleteDialogOpen,
    requestDelete,
    cancelDelete,
    confirmDelete,
    deleteError,
    deletePending,
    activePane,
    goToPane,
    swipeRef,
    handleSwipeScroll,
    paneRef,
    openScanner,
    close,
  } = model;

  if (loading) return <FullPageLoader label="Loading recipe" />;
  if (error) {
    return (
      <div className="shell p-5">
        <ErrorState message={error} onRetry={retry} />
      </div>
    );
  }
  if (!recipe) {
    return (
      <div className="shell p-5">
        <p className="text-body text-ink-muted">Recipe not found.</p>
      </div>
    );
  }
  if (redirectTarget) return <Navigate to={redirectTarget} replace />;

  const { costing } = recipe;

  return (
    <div className="shell">
      <header className="flex shrink-0 items-center gap-2 border-b border-hairline px-4 pb-2.5 pt-[max(var(--safe-top)+12px,12px)]">
        <button
          type="button"
          aria-label="Close editor"
          onClick={close}
          className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink"
        >
          <IconClose className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
        <h1 className="min-w-0 flex-1 text-center text-[17px] font-semibold leading-[25px] text-ink">
          Edit recipe
        </h1>
        <button
          type="button"
          onClick={reset}
          className="pressable shrink-0 text-body font-semibold text-brand-primary"
        >
          Reset
        </button>
      </header>

      <div className="flex shrink-0 items-center justify-center gap-2.5 px-5 pb-1 pt-3">
        <p className="text-eyebrow font-medium uppercase text-ink-muted">
          {activePane === 0 ? '1 of 2' : '2 of 2'}
        </p>
        <div className="flex gap-1.5">
          {[0, 1].map((index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to step ${index + 1}`}
              aria-current={activePane === index ? 'step' : undefined}
              onClick={() => goToPane(index)}
              className={`h-2 w-2 rounded-pill ${activePane === index ? 'bg-brand-primary' : 'bg-hairline'}`}
            />
          ))}
        </div>
      </div>

      <div
        ref={swipeRef}
        onScroll={handleSwipeScroll}
        aria-label="Recipe edit steps"
        className="no-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto"
      >
        <div
          ref={paneRef(0)}
          className="flex h-full w-full shrink-0 snap-start flex-col gap-4 overflow-y-auto px-5 pb-4 pt-3"
        >
          <div className="flex gap-2">
            <Button variant="outline" size="sm" radius="input" disabled title="Photo editing is not available yet">
              Change photo
            </Button>
            <Button variant="outline" size="sm" radius="input" disabled title="Photo editing is not available yet">
              Remove photo
            </Button>
          </div>

          <Field label="RECIPE NAME" htmlFor="recipe-name">
            <Input id="recipe-name" value={recipeName} onChange={(event) => setRecipeName(event.target.value)} />
          </Field>

          <div className="flex gap-3">
            <Field label="PREP TIME (MIN)" htmlFor="prep-time" className="min-w-0 flex-1">
              <Input
                id="prep-time"
                inputMode="numeric"
                value={prepTime}
                onChange={(event) => setPrepTime(event.target.value)}
              />
            </Field>
            <Field label="SERVES" htmlFor="yield-qty" className="min-w-0 flex-1">
              <Input
                id="yield-qty"
                inputMode="numeric"
                value={yieldQty}
                onChange={(event) => setYieldQty(event.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-2.5">
            {ingredientRows.map((row) => (
              <IngredientRow
                key={row.rowKey}
                row={row}
                linking={row.id != null && linkingIngredientIds.has(row.id)}
                onChange={(patch) => updateIngredientRow(row.rowKey, patch)}
                onRemove={() => removeIngredientRow(row.rowKey)}
                onScan={() => openScanner(row)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addIngredientRow}
            className="pressable flex h-11 w-full items-center justify-center gap-2 rounded-input border border-dashed border-hairline bg-transparent text-body font-medium text-ink-muted"
          >
            <IconPlus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            Add ingredient
          </button>

          <section aria-labelledby="unit-cost-heading" className="flex flex-col gap-1.5 rounded-card bg-surface-card px-3.5 py-3">
            <h2 id="unit-cost-heading" className="text-eyebrow font-medium uppercase text-ink-muted">
              Unit cost · Auto
            </h2>
            <div className="flex items-center justify-between text-label text-ink-muted">
              <span>Ingredients</span>
              <span className="font-medium text-ink">{formatMoney(costing.ingredientsCost, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-label text-ink-muted">
              <span>Labor</span>
              <span className="font-medium text-ink">{formatMoney(costing.laborCost, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-label text-ink-muted">
              <span>Total</span>
              <span className="font-medium text-ink">
                {costing.batchCost == null ? '—' : formatMoney(costing.batchCost, currency)}
              </span>
            </div>
            <p className="pt-0.5 text-body font-semibold text-ink">
              Unit cost:{' '}
              {costing.unitCost == null
                ? 'Incomplete'
                : `${formatMoney(costing.unitCost, currency)}${incomplete ? ' (partial)' : ''}`}
            </p>
          </section>
        </div>

        <div
          ref={paneRef(1)}
          className="flex h-full w-full shrink-0 snap-start flex-col gap-5 overflow-y-auto px-5 pb-4 pt-3"
        >
          <section aria-labelledby="allergens-heading" className="flex flex-col gap-3">
            <h2 id="allergens-heading" className="text-[18px] font-medium leading-[25px] text-ink">
              Allergens
            </h2>
            <div className="flex flex-wrap gap-2">
              {allergenOptions.map((allergen) => {
                const selected = allergens.includes(allergen);
                return (
                  <button
                    key={allergen}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleAllergen(allergen)}
                    className={`pressable rounded-pill px-3.5 py-2 text-label font-medium ${
                      selected
                        ? 'bg-brand-primary text-ink-on-primary'
                        : 'border border-hairline bg-surface-canvas text-ink-body'
                    }`}
                  >
                    {allergen}
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="steps-heading" className="flex flex-col gap-3">
            <h2 id="steps-heading" className="text-[18px] font-medium leading-[25px] text-ink">
              Preparation steps
            </h2>
            {stepRows.length === 0 ? (
              <p className="text-[14px] leading-[155%] text-ink-muted">No steps yet.</p>
            ) : (
              <ol className="flex flex-col gap-2.5">
                {stepRows.map((step, index) => (
                  <li key={step.rowKey} className="flex items-start gap-2.5">
                    <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-brand-primary text-label font-medium text-ink-on-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Textarea
                        rows={2}
                        aria-label={`Step ${index + 1}`}
                        value={step.instruction}
                        onChange={(event) => updateStep(step.rowKey, event.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove step ${index + 1}`}
                      onClick={() => removeStep(step.rowKey)}
                      className="pressable mt-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-input text-ink-muted-soft hover:text-ink"
                    >
                      <IconClose className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <button
              type="button"
              onClick={addStep}
              className="pressable flex h-11 w-full items-center justify-center gap-2 rounded-input border border-dashed border-hairline bg-transparent text-body font-medium text-ink-muted"
            >
              <IconPlus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              Add step
            </button>
          </section>
        </div>
      </div>

      <footer className="flex shrink-0 flex-col gap-2.5 border-t border-hairline px-5 pb-[max(var(--safe-bottom)+12px,12px)] pt-3">
        {validationErrors.length > 0 ? (
          <InlineNotice tone="error">
            <ul className="flex flex-col gap-1">
              {validationErrors.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </InlineNotice>
        ) : null}
        {saveError ? <InlineNotice tone="error">{saveError}</InlineNotice> : null}
        {deleteError ? <InlineNotice tone="error">{deleteError}</InlineNotice> : null}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Delete recipe"
            disabled={deletePending}
            onClick={requestDelete}
            className="pressable flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-input border border-semantic-error/40 bg-semantic-error/10 text-semantic-error disabled:cursor-not-allowed disabled:opacity-45"
          >
            <IconTrash className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <Button
            size="lg"
            radius="input"
            className="min-w-0 flex-1"
            loading={savePending}
            onClick={() => void save()}
          >
            Save changes
          </Button>
        </div>
      </footer>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete this recipe?"
        description="If it has sales history it will be deactivated instead of permanently removed."
        confirmLabel="Delete Recipe"
        onConfirm={() => void confirmDelete()}
        onCancel={cancelDelete}
      />
    </div>
  );
}

function IngredientRow({
  row,
  linking,
  onChange,
  onRemove,
  onScan,
}: {
  row: IngredientFormRow;
  linking: boolean;
  onChange: (patch: Partial<IngredientFormRow>) => void;
  onRemove: () => void;
  onScan: () => void;
}) {
  const linked = row.inventoryItemId != null || row.generalPriceId != null;
  const unitOptions = INGREDIENT_UNITS.includes(row.unit)
    ? INGREDIENT_UNITS
    : [...INGREDIENT_UNITS, row.unit];
  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Input
          dense
          value={row.rawName}
          onChange={(event) => onChange({ rawName: event.target.value })}
          placeholder="Name"
          aria-label="Ingredient name"
          className="pr-10"
        />
        <span className="pointer-events-none absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center">
          {linking ? (
            <span className="flex h-7 w-7 items-center justify-center">
              <Spinner className="h-4 w-4 text-brand-primary" />
              <span className="sr-only">Linking barcode</span>
            </span>
          ) : linked ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-input bg-surface-soft text-semantic-success">
              <svg
                className="h-4 w-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m3.5 8.5 3 3 6-7" />
              </svg>
              <span className="sr-only">Linked</span>
            </span>
          ) : (
            <button
              type="button"
              disabled={!row.id}
              title={row.id ? undefined : 'Save first'}
              aria-label={`Scan barcode for ${row.rawName || 'ingredient'}`}
              onClick={onScan}
              className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-input bg-surface-soft text-brand-primary-active disabled:opacity-45"
            >
              <IconCamera className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
        </span>
      </div>
      <div className="w-[60px] shrink-0">
        <Input
          dense
          inputMode="decimal"
          aria-label="Quantity"
          value={row.quantity}
          onChange={(event) => onChange({ quantity: event.target.value })}
        />
      </div>
      <div className="relative w-[58px] shrink-0">
        <Select
          dense
          aria-label="Unit"
          className="pr-7"
          value={row.unit}
          onChange={(event) => onChange({ unit: event.target.value })}
        >
          {unitOptions.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </Select>
        <IconChevronRight className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 rotate-90 text-ink-muted" />
      </div>
      <button
        type="button"
        aria-label={`Remove ${row.rawName || 'ingredient'}`}
        onClick={onRemove}
        className="pressable flex h-7 w-7 shrink-0 items-center justify-center rounded-input text-ink-muted-soft hover:text-ink"
      >
        <IconClose className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
