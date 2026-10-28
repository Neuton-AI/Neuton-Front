import { IconClose } from '@/components/icons';
import { Input } from '@/components/ui';
import type { RecipeEditPageModel } from '../RecipeEditPage.module';

type Ingredient = NonNullable<RecipeEditPageModel['draft']>['ingredients'][number];

export function IngredientRow({
  ingredient,
  index,
  linked,
  onChange,
  onRemove,
  onScan,
}: {
  ingredient: Ingredient;
  index: number;
  linked: boolean;
  onChange: RecipeEditPageModel['changeIngredient'];
  onRemove: () => void;
  onScan: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`relative flex min-w-0 flex-1 items-center rounded-input border ${linked ? 'border-hairline' : 'border-brand-primary'}`}>
        <Input
          id={`ingredient-${ingredient.key}`}
          aria-label={`Ingredient ${index + 1} name`}
          value={ingredient.rawName}
          maxLength={160}
          className={`border-0 ${linked ? '' : 'pr-12'}`}
          onChange={(event) => onChange(ingredient.key, 'rawName', event.target.value)}
        />
        {!linked ? <IngredientScanButton index={index} onScan={onScan} /> : null}
      </div>
      <div className="w-[60px] shrink-0">
        <Input
          aria-label={`Ingredient ${index + 1} amount`}
          type="number"
          min={0}
          step="any"
          value={ingredient.quantity}
          className="px-1 text-center"
          onChange={(event) => onChange(ingredient.key, 'quantity', event.target.value)}
        />
      </div>
      <div className="w-[58px] shrink-0">
        <Input
          aria-label={`Ingredient ${index + 1} unit`}
          value={ingredient.rawSrcUnit}
          maxLength={24}
          className="px-1 text-center"
          onChange={(event) => onChange(ingredient.key, 'rawSrcUnit', event.target.value)}
        />
      </div>
      <button
        type="button"
        aria-label={`Remove ingredient ${index + 1}`}
        onClick={onRemove}
        className="flex h-11 w-7 shrink-0 items-center justify-center text-ink-muted"
      >
        <IconClose className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function IngredientScanButton({ index, onScan }: { index: number; onScan: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Scan barcode for ingredient ${index + 1}`}
      onClick={onScan}
      className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-md bg-surface-soft text-brand-primary-active"
    >
      <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20.5 15V8.5a2 2 0 0 0-2-2H16L14.5 4h-5L8 6.5H5.5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2H11"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.8" />
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
  );
}
