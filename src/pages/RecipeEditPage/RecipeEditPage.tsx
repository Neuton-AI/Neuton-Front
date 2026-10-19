import { BarcodeScanner } from '@/components/BarcodeScanner/BarcodeScanner';
import { ErrorState, InlineNotice, Spinner } from '@/components/feedback';
import { IconCamera, IconClose, IconPlus, IconTrash } from '@/components/icons';
import { Button, Field, Input, Textarea } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { useRecipeEditPage, type RecipeEditPageModel } from './RecipeEditPage.module';

const ALLERGENS = ['Gluten', 'Eggs', 'Dairy', 'Tree nuts', 'Peanuts', 'Soy', 'Sesame', 'Fish'];
const addClassName =
  'flex h-10 w-full items-center justify-center gap-2 rounded-input border border-dashed border-ink-muted-soft text-sm font-medium text-brand-primary-active';

export function RecipeEditPage() {
  return <RecipeEditView model={useRecipeEditPage()} />;
}

export function RecipeEditView({ model }: { model: RecipeEditPageModel }) {
  const { draft, recipe, page, busy, canManage } = model;
  return (
    <main className="mx-auto flex h-[100dvh] max-w-shell flex-col bg-surface-canvas pt-[max(var(--safe-top),16px)]">
      <header className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-1">
        <button
          type="button"
          aria-label="Close recipe editor"
          onClick={model.close}
          disabled={busy}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-surface-card"
        >
          <IconClose className="h-[18px] w-[18px]" />
        </button>
        <h1 className="flex-1 font-display text-card-value text-ink">Edit recipe</h1>
        {canManage ? (
          <button
            type="button"
            onClick={model.reset}
            disabled={busy}
            className="text-sm font-medium text-ink-muted"
          >
            Reset
          </button>
        ) : null}
      </header>
      {model.loading ? (
        <div
          role="status"
          aria-label="Loading recipe"
          className="flex flex-1 items-center justify-center"
        >
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
        <>
          <div
            className="flex justify-center gap-2 px-4 pb-3"
            role="tablist"
            aria-label="Recipe editor sections"
          >
            {['Ingredients', 'Preparation'].map((label, index) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={page === index}
                aria-controls={`recipe-panel-${index}`}
                id={`recipe-tab-${index}`}
                tabIndex={page === index ? 0 : -1}
                onClick={(event) => model.selectPage(index, event.detail > 0)}
                onKeyDown={(event) => model.onTabKeyDown(event, index)}
                className={`rounded-pill px-3 py-1 text-label ${page === index ? 'bg-surface-dark text-ink-on-dark' : 'text-ink-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              void model.save();
            }}
            noValidate
          >
            <fieldset disabled={busy} className="min-h-0 min-w-0 flex-1">
              <div
                ref={model.carouselRef}
                onScroll={model.onCarouselScroll}
                className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth motion-reduce:scroll-auto"
              >
                <div
                  role="tabpanel"
                  id="recipe-panel-0"
                  aria-labelledby="recipe-tab-0"
                  aria-hidden={page !== 0}
                  className="h-full w-full min-w-0 shrink-0 snap-start overflow-y-auto overscroll-y-contain px-4 pb-5"
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-card bg-surface-cream-strong">
                        {draft.imageUrl ? (
                          <img
                            src={draft.imageUrl}
                            alt="Recipe"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <IconCamera className="h-7 w-7 text-ink-muted-soft" />
                        )}
                      </div>
                      <div className="flex flex-col items-start gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          radius="input"
                          onClick={() => model.setEditingPhoto(!model.editingPhoto)}
                        >
                          <IconCamera className="h-4 w-4" />
                          Change photo
                        </Button>
                        <button
                          type="button"
                          onClick={() => model.changeField('imageUrl', '')}
                          className="pl-0.5 text-label font-medium text-ink-muted"
                        >
                          Remove photo
                        </button>
                      </div>
                    </div>
                    {model.editingPhoto ? (
                      <Field label="Photo URL" htmlFor="recipe-image">
                        <Input
                          id="recipe-image"
                          type="url"
                          value={draft.imageUrl}
                          onChange={(event) => model.changeField('imageUrl', event.target.value)}
                          placeholder="https://…"
                        />
                      </Field>
                    ) : null}
                    <Field label="RECIPE NAME" htmlFor="recipe-name">
                      <Input
                        id="recipe-name"
                        required
                        maxLength={160}
                        value={draft.name}
                        onChange={(event) => model.changeField('name', event.target.value)}
                      />
                    </Field>
                    <div className="flex gap-3">
                      <Field
                        label="PREP TIME · MIN"
                        htmlFor="recipe-prep"
                        className="min-w-0 flex-1"
                      >
                        <Input
                          id="recipe-prep"
                          type="number"
                          min={0}
                          max={10000}
                          step={1}
                          value={draft.prepTimeMinutes}
                          onChange={(event) =>
                            model.changeField('prepTimeMinutes', event.target.value)
                          }
                        />
                      </Field>
                      <Field label="SERVES" htmlFor="recipe-yield" className="min-w-0 flex-1">
                        <Input
                          id="recipe-yield"
                          type="number"
                          min={0}
                          max={100000}
                          step="any"
                          value={draft.yieldQuantity}
                          onChange={(event) =>
                            model.changeField('yieldQuantity', event.target.value)
                          }
                        />
                      </Field>
                    </div>
                    <section className="flex flex-col gap-2.5" aria-labelledby="edit-ingredients">
                      <h2 id="edit-ingredients" className="text-[18px] font-medium leading-6">
                        Ingredients
                      </h2>
                      {draft.ingredients.map((ingredient, index) => (
                        <div key={ingredient.key} className="flex items-center gap-2">
                          <div
                            className={`relative flex min-w-0 flex-1 items-center rounded-input border ${model.isLinked(ingredient) ? 'border-hairline' : 'border-brand-primary'}`}
                          >
                            <Input
                              id={`ingredient-${ingredient.key}`}
                              aria-label={`Ingredient ${index + 1} name`}
                              value={ingredient.rawName}
                              maxLength={160}
                              className={`border-0 ${model.isLinked(ingredient) ? '' : 'pr-12'}`}
                              onChange={(event) =>
                                model.changeIngredient(
                                  ingredient.key,
                                  'rawName',
                                  event.target.value,
                                )
                              }
                            />
                            {!model.isLinked(ingredient) ? (
                              <button
                                type="button"
                                aria-label={`Scan barcode for ingredient ${index + 1}`}
                                onClick={() => model.openScanner(ingredient.key)}
                                className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-md bg-surface-soft text-brand-primary-active"
                              >
                                <svg
                                  className="h-[22px] w-[22px]"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M20.5 15V8.5a2 2 0 0 0-2-2H16L14.5 4h-5L8 6.5H5.5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2H11"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <circle
                                    cx="12"
                                    cy="12.5"
                                    r="3"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                  />
                                  <circle cx="18" cy="18" r="5.5" fill="currentColor" />
                                  <path
                                    d="M17 16.2h-1.2a1.8 1.8 0 0 0 0 3.6H17M19 16.2h1.2a1.8 1.8 0 0 1 0 3.6H19M16.8 18h2.4"
                                    stroke="white"
                                    strokeWidth="1.3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            ) : null}
                          </div>
                          <div className="w-[60px] shrink-0">
                            <Input
                              aria-label={`Ingredient ${index + 1} amount`}
                              type="number"
                              min={0}
                              step="any"
                              value={ingredient.quantity}
                              className="px-1 text-center"
                              onChange={(event) =>
                                model.changeIngredient(
                                  ingredient.key,
                                  'quantity',
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="w-[58px] shrink-0">
                            <Input
                              aria-label={`Ingredient ${index + 1} unit`}
                              value={ingredient.rawSrcUnit}
                              maxLength={24}
                              className="px-1 text-center"
                              onChange={(event) =>
                                model.changeIngredient(
                                  ingredient.key,
                                  'rawSrcUnit',
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ingredient ${index + 1}`}
                            onClick={() => model.removeIngredient(ingredient.key)}
                            className="flex h-11 w-7 shrink-0 items-center justify-center text-ink-muted"
                          >
                            <IconClose className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={model.addIngredient} className={addClassName}>
                        <IconPlus className="h-4 w-4" />
                        Add ingredient
                      </button>
                    </section>
                    <p className="text-label text-ink-muted">
                      Recipe costs are recalculated when you save changes.
                    </p>
                  </div>
                </div>
                <div
                  role="tabpanel"
                  id="recipe-panel-1"
                  aria-labelledby="recipe-tab-1"
                  aria-hidden={page !== 1}
                  className="h-full w-full min-w-0 shrink-0 snap-start overflow-y-auto overscroll-y-contain px-4 pb-5"
                >
                  <div className="flex flex-col gap-5">
                    <section className="flex flex-col gap-2.5" aria-labelledby="edit-allergens">
                      <div className="flex items-baseline justify-between">
                        <h2 id="edit-allergens" className="text-[18px] font-medium">
                          Allergens
                        </h2>
                        <span className="text-label text-ink-muted">Tap to toggle</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[...new Set([...ALLERGENS, ...draft.allergens])].map((allergen) => (
                          <button
                            type="button"
                            key={allergen}
                            aria-pressed={draft.allergens.includes(allergen)}
                            onClick={() => model.toggleAllergen(allergen)}
                            className={`h-[34px] rounded-pill px-3.5 text-sm font-medium ${draft.allergens.includes(allergen) ? 'bg-surface-dark text-ink-on-dark' : 'bg-surface-card text-ink-body'}`}
                          >
                            {draft.allergens.includes(allergen) ? '✓ ' : ''}
                            {allergen}
                          </button>
                        ))}
                      </div>
                    </section>
                    <Field label="LABOR · AUTO" htmlFor="recipe-labor">
                      <Input
                        id="recipe-labor"
                        readOnly
                        value={
                          model.laborCost == null
                            ? 'Unavailable'
                            : formatMoney(model.laborCost, model.currency)
                        }
                        className="bg-surface-soft text-ink-muted"
                      />
                    </Field>
                    <section className="flex flex-col gap-2.5" aria-labelledby="edit-preparation">
                      <h2 id="edit-preparation" className="text-[18px] font-medium">
                        Preparation
                      </h2>
                      {draft.steps.map((instruction, index) => (
                        <div key={index} className="flex items-start gap-2.5">
                          <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-brand-primary text-label text-ink-on-primary">
                            {index + 1}
                          </span>
                          <Textarea
                            aria-label={`Preparation step ${index + 1}`}
                            rows={2}
                            maxLength={20000}
                            value={instruction}
                            onChange={(event) => model.changeStep(index, event.target.value)}
                            className="min-w-0 flex-1 text-sm"
                          />
                          <button
                            type="button"
                            aria-label={`Remove step ${index + 1}`}
                            onClick={() =>
                              model.changeField(
                                'steps',
                                draft.steps.filter((_, i) => i !== index),
                              )
                            }
                            className="flex h-11 w-5 shrink-0 items-center justify-center text-ink-muted"
                          >
                            <IconClose className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => model.changeField('steps', [...draft.steps, ''])}
                        className={addClassName}
                      >
                        <IconPlus className="h-4 w-4" />
                        Add step
                      </button>
                    </section>
                  </div>
                </div>
              </div>
            </fieldset>
            <footer className="flex shrink-0 gap-3 border-t border-hairline px-4 pb-[max(var(--safe-bottom),20px)] pt-3">
              <Button
                variant="outline"
                radius="input"
                aria-label="Delete recipe"
                disabled={busy}
                onClick={() => void model.remove()}
                className="h-12 w-12 shrink-0 p-0 text-semantic-error"
              >
                <IconTrash className="h-5 w-5" />
              </Button>
              <Button
                type="submit"
                radius="input"
                disabled={busy}
                loading={model.saving}
                className="h-12 flex-1 text-sm"
              >
                Save changes
              </Button>
            </footer>
          </form>
        </>
      ) : null}
      {!model.loading && !recipe && !model.error ? (
        <p className="px-4 text-ink-muted">Recipe not found.</p>
      ) : null}
      {model.scanKey ? (
        <BarcodeScanner
          onDetected={(barcode) => void model.linkBarcode(barcode)}
          onClose={model.closeScanner}
          busy={model.scanBusy}
          error={model.scanError}
        />
      ) : null}
    </main>
  );
}
