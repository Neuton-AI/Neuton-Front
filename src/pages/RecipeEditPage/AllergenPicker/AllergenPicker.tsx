import { IconClose, IconPlus, IconSearch } from '@/components/icons';
import { useAllergenPicker } from './AllergenPicker.module';
import './AllergenPicker.css';

type Props = { selected: string[]; onToggle: (allergen: string) => void };

export function AllergenPicker({ selected, onToggle }: Props) {
  const picker = useAllergenPicker(selected, onToggle);
  return (
    <section
      ref={picker.sectionRef}
      className="flex flex-col gap-2.5"
      aria-labelledby="edit-allergens"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="edit-allergens" className="text-[18px] font-medium leading-6">
          Allergens
        </h2>
        {picker.allergens.length > 0 ? (
          <span className="text-label font-medium text-ink-muted">Tap to toggle</span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {picker.allergens.map((allergen) => (
          <button
            type="button"
            key={allergen}
            aria-pressed={selected.includes(allergen)}
            onClick={() => onToggle(allergen)}
            className={`flex h-[34px] items-center gap-1.5 rounded-pill pl-2.5 pr-3.5 text-sm font-medium leading-[18px] ${selected.includes(allergen) ? 'bg-surface-dark text-ink-on-dark' : 'bg-surface-card text-ink-body'}`}
          >
            {selected.includes(allergen) ? (
              <svg
                className="h-3.5 w-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M20 6 9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
            {allergen}
          </button>
        ))}
        <button
          ref={picker.triggerRef}
          type="button"
          aria-label="Add allergen"
          aria-haspopup="dialog"
          aria-expanded={picker.open}
          onClick={picker.show}
          className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-pill bg-surface-card ${picker.open ? 'border border-brand-primary text-brand-primary-active' : 'text-ink-body'}`}
        >
          <IconPlus className="h-4 w-4" />
        </button>
      </div>
      {picker.open ? (
        <dialog
          ref={picker.dialogRef}
          aria-label="Add allergen"
          aria-modal="true"
          onCancel={picker.dismiss}
          onClose={picker.dismiss}
          onClick={picker.onBackdropClick}
          className="allergen-popover fixed m-0 max-w-none overflow-auto rounded-[14px] border border-hairline bg-white p-3 text-ink shadow-[0_16px_40px_#14141329,0_2px_6px_#1414130F]"
        >
          <div className="flex h-11 shrink-0 items-center gap-2.5 rounded-input border-[1.5px] border-brand-primary pl-3.5 pr-3">
            <IconSearch className="h-[18px] w-[18px] shrink-0 text-ink-muted" />
            <input
              ref={picker.inputRef}
              role="combobox"
              aria-label="Search allergens"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={picker.listId}
              aria-activedescendant={
                picker.suggestions.length ? `${picker.listId}-${picker.activeIndex}` : undefined
              }
              autoComplete="off"
              placeholder="Search allergens"
              value={picker.query}
              onChange={(event) => picker.changeQuery(event.target.value)}
              onKeyDown={picker.onKeyDown}
              className="min-w-0 flex-1 bg-transparent text-base leading-5 outline-none"
            />
            {picker.query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={picker.clear}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-surface-card text-ink-body"
              >
                <IconClose className="h-2.5 w-2.5" />
              </button>
            ) : null}
          </div>
          <div
            id={picker.listId}
            role="listbox"
            aria-label="Allergen suggestions"
            className="mt-2 max-h-40 overflow-y-auto"
          >
            {picker.suggestions.map((name, index) => (
              <button
                key={name}
                id={`${picker.listId}-${index}`}
                role="option"
                type="button"
                tabIndex={-1}
                aria-label={name}
                aria-selected={index === picker.activeIndex}
                onClick={() => picker.choose(name)}
                onMouseDown={(event) => event.preventDefault()}
                onPointerMove={() => picker.setActiveIndex(index)}
                className={`flex h-10 w-full shrink-0 items-center rounded-input px-3 text-left text-body leading-5 text-ink-body ${index === picker.activeIndex ? 'bg-surface-soft' : ''}`}
              >
                <span>
                  <strong className="font-bold text-ink">
                    {name.slice(0, picker.search.length)}
                  </strong>
                  {name.slice(picker.search.length)}
                </span>
              </button>
            ))}
          </div>
          {picker.suggestions.length === 0 ? (
            <p role="status" className="px-3 py-2 text-sm text-ink-muted">
              No matching allergens
            </p>
          ) : null}
        </dialog>
      ) : null}
    </section>
  );
}
