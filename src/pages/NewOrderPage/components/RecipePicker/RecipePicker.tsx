import { IconPlus, IconSearch } from '@/components/icons';
import type { Recipe } from '@/features/recipes/types';
import { CatalogThumbnail } from '@/pages/CatalogPage/components/CatalogThumbnail/CatalogThumbnail';
import layout from '../../NewOrderPage.module.css';
import { useRecipePicker } from './RecipePicker.module';
import styles from './RecipePicker.module.css';

type RecipePickerProps = {
  recipes: readonly Recipe[];
  loading: boolean;
  error: boolean;
  disabled: boolean;
  onAdd: (recipe: Recipe) => void;
};

export function RecipePicker({ recipes, loading, error, disabled, onAdd }: RecipePickerProps) {
  const picker = useRecipePicker(recipes, onAdd);
  const count = picker.matches.length;
  let status = '';
  if (loading) {
    status = 'Loading shop recipes…';
  } else if (error) {
    status = 'Could not load shop recipes.';
  } else if (!recipes.length) {
    status = 'No active, verified recipes yet.';
  } else if (!count) {
    status = 'No matching recipes.';
  }

  return <>
    <button ref={picker.trigger} type='button' className={layout.addItem}
      aria-expanded={picker.open} aria-controls={picker.open ? picker.panelId : undefined}
      disabled={disabled} onClick={picker.toggle}>
      <IconPlus className='h-4 w-4' /> Add item
    </button>
    {picker.open ? (
      <div ref={picker.panel} id={picker.panelId} className={styles.panel}>
        <div className={styles.search}>
          <IconSearch className='h-[18px] w-[18px] shrink-0' />
          <input ref={picker.input} role='combobox' aria-label='Search recipes' type='text'
            aria-expanded='true' aria-autocomplete='list' aria-controls={picker.listId}
            aria-activedescendant={picker.activeId ? picker.optionId(picker.activeId) : undefined}
            placeholder='Search recipes' autoComplete='off' value={picker.query}
            onChange={event => picker.changeQuery(event.target.value)} onKeyDown={picker.onKeyDown} />
        </div>
        <div className={styles.count}>
          <span>Shop recipes</span>
          <span role='status'>{count} {count === 1 ? 'recipe' : 'recipes'}</span>
        </div>
        {status ? <p role='status' className={styles.status}>{status}</p> : null}
        <ul ref={picker.list} id={picker.listId} role='listbox' aria-label='Shop recipes'
          aria-busy={loading} className={styles.options}>
          {picker.matches.map(recipe => {
            const selectable = picker.selectableIds.has(recipe.id);
            return (
              <li id={picker.optionId(recipe.id)} key={recipe.id} role='option'
                aria-selected={picker.activeId === recipe.id} aria-disabled={!selectable || undefined}
                className={styles.option} onClick={() => picker.choose(recipe)}>
                <CatalogThumbnail compact imageUrl={recipe.imageUrl} />
                <span title={recipe.name}>{recipe.name}</span>
                {!selectable ? <small>Pricing requires sync</small> : null}
              </li>
            );
          })}
        </ul>
      </div>
    ) : null}
  </>;
}
