import { Skeleton } from '@/components/feedback';

export function RecipeDetailSkeleton() {
  return (
    <>
      <Skeleton className="h-[72px]" />
      <Skeleton className="h-14" />
      <Skeleton className="h-40" />
      <Skeleton className="h-24" />
    </>
  );
}

export function RecipeImagePlaceholder() {
  return (
    <svg
      className="h-[43.2px] w-[43.2px] text-ink-muted-soft"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
