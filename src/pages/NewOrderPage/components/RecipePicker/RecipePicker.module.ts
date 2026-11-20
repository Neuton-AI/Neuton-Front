import { recipeOrderPricing } from '@/features/recipes/selectors';
import type { Recipe } from '@/features/recipes/types';
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';

export function useRecipePicker(recipes: readonly Recipe[], onAdd: (recipe: Recipe) => void) {
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
    const anchor = trigger.current;
    const popup = panel.current;
    if (!open || !anchor || !popup) return;
    const position = () => {
      const rect = anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = (viewport?.offsetTop ?? 0) + 8;
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 8;
      const above = Math.max(0, Math.min(bottom, rect.top - 8) - top);
      const below = Math.max(0, bottom - Math.max(top, rect.bottom + 8));
      const options = list.current;
      const listOverflow = options ? Math.max(0, options.scrollHeight - options.clientHeight) : 0;
      const desired = popup.scrollHeight + listOverflow + 2;
      const flip = below < desired && above > below;
      const space = flip ? above : below;
      const overlapsAnchor = space < Math.min(desired, 142);
      popup.style.left = `${rect.left}px`;
      popup.style.width = `${rect.width}px`;
      popup.style.maxHeight = `${overlapsAnchor ? bottom - top : space}px`;
      const y = flip ? Math.min(bottom, rect.top - 8) - popup.offsetHeight : Math.max(top, rect.bottom + 8);
      popup.style.top = `${overlapsAnchor ? top : y}px`;
    };
    const dismissOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && (popup.contains(event.target) || anchor.contains(event.target))) return;
      setOpen(false);
      anchor.focus({ preventScroll: true });
    };
    position();
    updatePosition.current = position;
    input.current?.focus({ preventScroll: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(position);
    observer?.observe(popup);
    document.addEventListener('click', dismissOutside, true);
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      updatePosition.current = undefined;
      observer?.disconnect();
      document.removeEventListener('click', dismissOutside, true);
      window.removeEventListener('scroll', position, true);
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [open]);

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
