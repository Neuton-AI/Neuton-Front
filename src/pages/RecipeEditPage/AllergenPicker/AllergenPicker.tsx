import { IconPlus } from '@/components/icons';
import { useAllergenPicker } from './AllergenPicker.module';
import { AllergenSuggestions } from './AllergenSuggestions';
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
      <AllergenSuggestions picker={picker} />
    </section>
  );
}
