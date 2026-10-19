import type { RecipeIngredient } from '@/features/recipes/types';
import { formatQuantity } from '@/lib/format';

type Props = {
  ingredients: (RecipeIngredient & { isLinked: boolean })[];
  showLinkStatus: boolean;
  canManage: boolean;
  onLink: (ingredient: number) => void;
};

export function RecipeIngredients({ ingredients, showLinkStatus, canManage, onLink }: Props) {
  if (ingredients.length === 0) {
    return <p className="text-[14px] leading-[155%] text-ink-muted">No ingredients linked yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {ingredients.map((ingredient, index) => (
        <li
          key={`${index}-${ingredient.rawName ?? ingredient.name}`}
          className={`flex flex-col border-b border-hairline-soft ${ingredient.isLinked ? (showLinkStatus ? 'py-1.5' : 'min-h-[31px] py-1') : 'gap-1.5 pb-2.5 pt-2'}`}
        >
          <div className="flex items-center gap-2.5 text-[14px] leading-[155%]">
            <span
              data-testid={ingredient.isLinked ? 'linked-dot' : 'unlinked-dot'}
              aria-label={ingredient.isLinked ? 'Linked to inventory' : 'Not linked to inventory'}
              className={
                showLinkStatus
                  ? `h-2 w-2 shrink-0 rounded-pill ${ingredient.isLinked ? 'bg-brand-teal' : 'bg-brand-primary-active'}`
                  : 'sr-only'
              }
            />
            <span className="min-w-0 flex-1 break-words text-ink">{ingredient.name}</span>
            <span className="shrink-0 text-ink-muted">
              {formatQuantity(ingredient.quantity, ingredient.rawSrcUnit)}
            </span>
          </div>
          {!ingredient.isLinked ? (
            <div className="flex items-center justify-between gap-2 pl-[18px] text-label text-brand-primary-active">
              <span className="font-medium">Not Extracted · cost missing</span>
              {canManage ? (
                <button
                  type="button"
                  aria-label={`Link ${ingredient.name}`}
                  onClick={() => onLink(index)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-input border border-brand-primary-active pl-2.5 pr-3 font-semibold"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M6.7 9.3a2.6 2.6 0 0 0 3.7 0l2.3-2.3a2.6 2.6 0 0 0-3.7-3.7l-.7.7M9.3 6.7a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.7-.7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Link
                </button>
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
