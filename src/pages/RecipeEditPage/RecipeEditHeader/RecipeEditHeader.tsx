import { IconClose } from '@/components/icons';
import type { RecipeEditPageModel } from '../RecipeEditPage.module';

export function RecipeEditHeader({ model }: { model: RecipeEditPageModel }) {
  return (
    <header className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-1">
      <button
        type="button"
        aria-label="Close recipe editor"
        onClick={model.close}
        disabled={model.busy}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-surface-card"
      >
        <IconClose className="h-[18px] w-[18px]" />
      </button>
      <h1 className="flex-1 font-display text-card-value text-ink">Edit recipe</h1>
      {model.canManage ? (
        <button type="button" onClick={model.reset} disabled={model.busy} className="text-sm font-medium text-ink-muted">
          Reset
        </button>
      ) : null}
    </header>
  );
}

export function RecipeEditTabs({ model }: { model: RecipeEditPageModel }) {
  return (
    <div className="flex justify-center gap-2 px-4 pb-3" role="tablist" aria-label="Recipe editor sections">
      {['Ingredients', 'Preparation'].map((label, index) => (
        <button
          key={label}
          type="button"
          role="tab"
          aria-selected={model.page === index}
          aria-controls={`recipe-panel-${index}`}
          id={`recipe-tab-${index}`}
          tabIndex={model.page === index ? 0 : -1}
          onClick={(event) => model.selectPage(index, event.detail > 0)}
          onKeyDown={(event) => model.onTabKeyDown(event, index)}
          className={`rounded-pill px-3 py-1 text-label ${model.page === index ? 'bg-surface-dark text-ink-on-dark' : 'text-ink-muted'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
