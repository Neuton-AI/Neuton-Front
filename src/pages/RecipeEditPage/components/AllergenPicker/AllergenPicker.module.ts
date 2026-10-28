import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

// Temporary autocomplete catalog; replaced by the database catalog in Neuton-Back #184.
const ALLERGENS = [
  "Dairy",
  "Eggs",
  "Fish",
  "Gluten",
  "Peanuts",
  "Sesame",
  "Shellfish",
  "Soy",
  "Sulphites",
  "Tree nuts",
];

export function useAllergenPicker(
  selected: string[],
  onToggle: (allergen: string) => void,
) {
  // Keep every badge shown during this edit, even when it is pending removal on save.
  const [allergens, setAllergens] = useState(selected);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const search = query.trim().toLowerCase();
  const suggestions = ALLERGENS.filter(
    (name) =>
      name.toLowerCase().startsWith(search) &&
      !selected.some(
        (value) => value.trim().toLowerCase() === name.toLowerCase(),
      ),
  );

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const trigger = triggerRef.current;
    function position() {
      const section = sectionRef.current;
      if (!section || !dialog) return;
      const rect = section.getBoundingClientRect();
      const viewport = window.visualViewport;
      const bottom =
        (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
      const top = Math.max(16, Math.min(rect.bottom + 14, bottom - 120));
      Object.assign(dialog.style, {
        left: `${rect.left}px`,
        top: `${top}px`,
        width: `${rect.width}px`,
        maxHeight: `${Math.max(100, bottom - top - 16)}px`,
      });
      dialog.style.setProperty("--allergen-scrim-top", `${rect.bottom}px`);
    }
    position();
    if (!dialog.open) dialog.showModal();
    inputRef.current?.focus({ preventScroll: true });
    window.addEventListener("resize", position);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      window.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);

  useLayoutEffect(() => {
    if (open)
      document
        .getElementById(`${listId}-${activeIndex}`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, listId, open, query]);

  function changeQuery(value: string) {
    setQuery(value);
    setActiveIndex(0);
  }
  function show() {
    changeQuery("");
    setOpen(true);
  }
  function dismiss() {
    setOpen(false);
  }
  function choose(name: string) {
    setAllergens((current) =>
      current.includes(name) ? current : [...current, name],
    );
    onToggle(name);
    dismiss();
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (suggestions[activeIndex]) choose(suggestions[activeIndex]);
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const last = Math.max(0, suggestions.length - 1);
      setActiveIndex((index) =>
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? last
            : Math.max(
                0,
                Math.min(last, index + (event.key === "ArrowDown" ? 1 : -1)),
              ),
      );
    }
  }
  function onBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dismiss();
  }
  return {
    allergens,
    open,
    query,
    search,
    activeIndex,
    setActiveIndex,
    suggestions,
    listId,
    sectionRef,
    triggerRef,
    dialogRef,
    inputRef,
    show,
    dismiss,
    choose,
    changeQuery,
    onKeyDown,
    onBackdropClick,
    clear: () => {
      changeQuery("");
      inputRef.current?.focus();
    },
  };
}
