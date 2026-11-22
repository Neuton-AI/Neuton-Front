import { recipeOrderPricing } from '@/features/recipes/selectors';
import type { Recipe } from '@/features/recipes/types';
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';

const viewportInset = 8;
const minimumPickerSpace = 180;

export function useRecipePicker(
  recipes: readonly Recipe[],
  onAdd: (recipe: Recipe) => void,
  scrollArea: RefObject<HTMLDivElement | null>,
  itemsSection: RefObject<HTMLElement | null>,
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string>();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const updatePosition = useRef<() => void>(undefined);
  const panelId = useId();
  const listId = useId();
  const term = query.trim().toLowerCase();
  const matches = recipes.filter(recipe => recipe.name.toLowerCase().includes(term));
  const selectable = matches.filter(recipe => recipeOrderPricing(recipe).orderPricing);
  const selectableIds = new Set(selectable.map(recipe => recipe.id));
  const activeIndex = selectable.findIndex(recipe => recipe.id === activeId);
  const optionId = (recipeId: string) => `${listId}-${recipeId}`;

  useLayoutEffect(() => {
    const button = trigger.current;
    const popup = panel.current;
    const area = scrollArea.current;
    const items = itemsSection.current;
    if (!open || !button || !popup || !area || !items) return;
    const position = () => {
      const section = items.getBoundingClientRect();
      const bounds = area.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const top = Math.max(bounds.top, viewportTop) + viewportInset;
      const bottom = Math.min(bounds.bottom, viewportBottom) - viewportInset;
      // Move up on short screens so the search and results stay usable above the footer.
      const y = Math.max(top, Math.min(section.top, bottom - minimumPickerSpace));
      popup.style.left = `${section.left}px`;
      popup.style.width = `${section.width}px`;
      popup.style.top = `${y}px`;
      popup.style.maxHeight = `${Math.max(0, bottom - y)}px`;
    };
    const dismissOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && (popup.contains(event.target) || button.contains(event.target))) return;
      setOpen(false);
      button.focus({ preventScroll: true });
    };
    position();
    updatePosition.current = position;
    input.current?.focus({ preventScroll: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(position);
    observer?.observe(area);
    observer?.observe(items);
    document.addEventListener('click', dismissOutside, true);
    area.addEventListener('scroll', position);
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      updatePosition.current = undefined;
      observer?.disconnect();
      document.removeEventListener('click', dismissOutside, true);
      area.removeEventListener('scroll', position);
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [open, scrollArea, itemsSection]);

  useLayoutEffect(() => {
    updatePosition.current?.();
  });

  function dismiss() {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  function choose(recipe: Recipe) {
    if (!selectable.includes(recipe)) return;
    onAdd(recipe);
    dismiss();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Tab') {
      // Resume tab navigation at the trigger when the search input disappears.
      dismiss();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const active = selectable[activeIndex];
      if (active) choose(active);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      let index = activeIndex + 1;
      if (event.key === 'ArrowUp') index = activeIndex < 0 ? selectable.length - 1 : activeIndex - 1;
      const option = selectable[Math.min(selectable.length - 1, Math.max(0, index))];
      if (option) {
        setActiveId(option.id);
        document.getElementById(optionId(option.id))?.scrollIntoView?.({ block: 'nearest' });
      }
    }
  }

  return {
    open, query, trigger, panel, input, panelId, listId, matches, term, optionId,
    activeId: selectable[activeIndex]?.id,
    list, selectableIds, choose, onKeyDown,
    toggle: () => {
      if (open) {
        dismiss();
      } else {
        setQuery('');
        setActiveId(undefined);
        setOpen(true);
      }
    },
    changeQuery: (value: string) => {
      setQuery(value);
      setActiveId(undefined);
      if (list.current) list.current.scrollTop = 0;
    },
  };
}
