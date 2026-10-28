import { VerificationStatusIcon } from '@/components/VerificationStatus';
import { IconEdit, IconTrash } from '@/components/icons';
import { InlineNotice } from '@/components/feedback';
import type { RecipeDetailPageModel } from '../RecipeDetailPage.module';

const actionClassName =
  'inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-card text-body font-semibold';

export function RecipeCostWarning({ exiting }: { exiting: boolean }) {
  return (
    <div
      id="recipe-cost-warning"
      role="note"
      data-exiting={exiting}
      className="recipe-cost-warning pointer-events-none absolute bottom-[calc(100%+0px)] right-0 flex w-[calc(50%-6px)] flex-col items-end"
    >
      <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-input bg-[#A63B3B] py-2 pl-2.5 pr-3 text-label font-semibold text-white">
        <VerificationStatusIcon verified={false} className="h-4 w-4 shrink-0" />
        Danger: Incomplete cost
      </span>
      <svg className="h-1.5 w-3 self-center text-[#A63B3B]" viewBox="0 0 12 6" fill="currentColor" aria-hidden="true">
        <path d="M0 0H12L6 6Z" />
      </svg>
    </div>
  );
}

export function RecipeDetailActions({ model }: { model: RecipeDetailPageModel }) {
  const recipe = model.recipe;
  if (!recipe || !model.canVerify) return null;
  const isUnverified = recipe.status === 'unverified';
  const isReviewedState = isUnverified || recipe.status === 'verified';
  return (
    <div className="relative flex shrink-0 flex-col gap-3 border-t border-hairline px-5 pt-3">
      {model.verifyError ? <InlineNotice tone="error">{model.verifyError}</InlineNotice> : null}
      {model.deleteError ? <InlineNotice tone="error">{model.deleteError}</InlineNotice> : null}
      <div className="relative flex items-center gap-3">
        {model.showCostWarning ? <RecipeCostWarning exiting={model.costWarningExiting} /> : null}
        {isReviewedState ? (
          <button type="button" onClick={() => model.edit()} className={`${actionClassName} border border-hairline bg-surface-canvas text-ink`}>
            <IconEdit className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
            Edit Recipe
          </button>
        ) : null}
        {isUnverified ? (
          <button
            type="button"
            disabled={model.verifyPending || model.deletePending}
            aria-busy={model.verifyPending}
            aria-describedby={`recipe-review-description${model.showCostWarning ? ' recipe-cost-warning' : ''}`}
            onClick={() => void model.verify()}
            className={`${actionClassName} pressable bg-brand-teal text-ink disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <VerificationStatusIcon verified className="h-[18px] w-[18px] shrink-0" />
            {model.verifyPending ? 'Verifying…' : 'Verify Recipe'}
          </button>
        ) : (
          <button
            type="button"
            disabled={model.deletePending}
            aria-busy={model.deletePending}
            onClick={() => void model.remove()}
            className={`${actionClassName} pressable bg-[#F6DEDA] text-[#A63B3B] disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <IconTrash className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
            {model.deletePending ? 'Deleting…' : 'Delete Recipe'}
          </button>
        )}
      </div>
    </div>
  );
}
