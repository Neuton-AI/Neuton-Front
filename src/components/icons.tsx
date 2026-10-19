/** Inline stroke icons matching the OpenPencil nav/measurement vectors. */

type IconProps = {
  className?: string;
  strokeWidth?: number;
};

export function IconProductLink({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function IconProductScan({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />
    </svg>
  );
}

const base = (className = 'h-5 w-5', strokeWidth = 2) => ({
  className,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export function IconPin({ className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M10 17.5s5-4.5 5-8.5a5 5 0 0 0-10 0c0 4 5 8.5 5 8.5Z" />
      <circle cx="10" cy="8.75" r="2.25" />
    </svg>
  );
}

export function IconHome({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M2.5 8.33 10 2.5l7.5 5.83V17a1 1 0 0 1-1 1h-4v-5.5h-5V18h-4a1 1 0 0 1-1-1V8.33Z" />
    </svg>
  );
}

export function IconBook({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M10 5.83S8.5 4.17 3.33 4.17v11.5C8.5 15.67 10 17.33 10 17.33s1.5-1.66 6.67-1.66V4.17C11.5 4.17 10 5.83 10 5.83Z" />
      <path d="M10 5.83v11.5" />
    </svg>
  );
}

export function IconBag({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M4 6.67h12v9.16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.67Z" />
      <path d="M2.5 6.67h15" />
      <path d="M7 10a3 3 0 0 0 6 0" />
    </svg>
  );
}

export function IconUser({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M4.17 17.5v-1.67a3.33 3.33 0 0 1 3.33-3.33h4.99a3.33 3.33 0 0 1 3.34 3.33v1.67" />
      <circle cx="10" cy="5.83" r="3.33" />
    </svg>
  );
}

export function IconPlus({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M10 3.5v13M3.5 10h13" />
    </svg>
  );
}

export function IconCamera({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M2.5 6.67h3.33L7.5 4.17h5l1.67 2.5h3.33v9.16a1 1 0 0 1-1 1h-14a1 1 0 0 1-1-1V6.67Z" />
      <circle cx="10" cy="10.83" r="3" />
    </svg>
  );
}

export function IconFile({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M11.67 2.5H5.83a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h8.34a1 1 0 0 0 1-1V5.83l-3.5-3.33Z" />
      <path d="M11.67 2.5v3.33H15" />
    </svg>
  );
}

export function IconChevronRight({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="m7.5 4.17 5 5.83-5 5.83" />
    </svg>
  );
}

export function IconChevronLeft({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="m12.5 4.17-5 5.83 5 5.83" />
    </svg>
  );
}

export function IconSearch({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <circle cx="8.83" cy="8.83" r="5.67" />
      <path d="m16.5 16.5-3.84-3.84" />
    </svg>
  );
}

export function IconReceipt({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M4.17 2.5h11.66v15l-1.94-1.25-1.94 1.25-1.94-1.25-1.94 1.25-1.94-1.25-1.96 1.25v-15Z" />
      <path d="M7 6.67h6" />
      <path d="M7 10h6" />
    </svg>
  );
}

export function IconBox({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M17.5 6.67v6.66l-7.5 4.17-7.5-4.17V6.67" />
      <path d="m2.5 6.67 7.5-4.17 7.5 4.17-7.5 4.16-7.5-4.16Z" />
      <path d="M10 10.83v6.67" />
    </svg>
  );
}

export function IconChefHat({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M4.17 13.33h11.66v3.5a1 1 0 0 1-1 1h-9.66a1 1 0 0 1-1-1v-3.5Z" />
      <path d="M4.17 13.33a2.83 2.83 0 0 1-.67-5.58A3.33 3.33 0 0 1 9.83 4a2.83 2.83 0 0 1 6.67 3.75 2.83 2.83 0 0 1 0 5.58" />
    </svg>
  );
}

export function IconClose({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

export function IconTrash({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M3.33 5.83h13.34" />
      <path d="M8.33 5.83V4.17a1 1 0 0 1 1-1h1.34a1 1 0 0 1 1 1v1.66" />
      <path d="M5 5.83 5.83 17a1 1 0 0 0 1 .83h6.34a1 1 0 0 0 1-.83L15 5.83" />
    </svg>
  );
}

export function IconWarning({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M10 3.5 17.5 16.5H2.5L10 3.5Z" />
      <path d="M10 8.5v3" />
      <path d="M10 14h.01" />
    </svg>
  );
}

export function IconEdit({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M13.33 3.33 16.67 6.67 7 16.34H3.66v-3.34l9.67-9.67Z" />
    </svg>
  );
}

export function IconRefresh({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M16.67 8.33a6.67 6.67 0 0 0-11.66-2.5L3.33 7.5" />
      <path d="M3.33 11.67a6.67 6.67 0 0 0 11.67 2.5l1.67-1.67" />
      <path d="M3.33 3.33v4.17h4.17" />
      <path d="M16.67 16.67v-4.17h-4.17" />
    </svg>
  );
}

export function IconStore({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M3.33 8.33h13.34v8.5a.83.83 0 0 1-.83.83H4.16a.83.83 0 0 1-.83-.83v-8.5Z" />
      <path d="m3.33 3.33 1.67 5h10l1.67-5H3.33Z" />
      <path d="M7.5 12.5h5" />
    </svg>
  );
}

export function IconLogout({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path d="M12.5 6.67V3.33h-10v13.34h10v-3.34" />
      <path d="M8.33 10h9.34" />
      <path d="m14.17 6.67 3.5 3.33-3.5 3.33" />
    </svg>
  );
}

export function IconGoogle({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path
        fill="currentColor"
        d="M10 18.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM10 2.5a7.5 7.5 0 0 0-5.77 2.38L3 3l4.5 4.5a7.5 7.5 0 0 0 1.53 4.23c0 2.15-.68 4.14-1.89 5.78A7.5 7.5 0 0 0 10 17.5a7.5 7.5 0 0 0 7.5-7.5h-2.5a5 5 0 0 1 0 10h-5a5 5 0 0 1 0-10h2.5a5 5 0 0 1 4.17 2.5A5 5 0 0 1 10 12.5 5 5 0 0 1 5 7.5v-2.5a5 5 0 0 1 5-5h5Z"
        stroke="none"
      />
    </svg>
  );
}

export function IconApple({ className, strokeWidth }: IconProps) {
  return (
    <svg {...base(className, strokeWidth)}>
      <path
        fill="currentColor"
        d="M17.5 10.83c0 3.64-2.96 6.67-6.5 6.67s-6.5-3.03-6.5-6.67 2.96-6.67 6.5-6.67 6.5 3.03 6.5 6.67ZM17.5 10.83c0 2.43-1.53 4.5-3.44 5.27a6.3 6.3 0 0 1-1.06 1.4c-.61.5-1.25.95-1.92 1.32a6.35 6.35 0 0 1-2.08.45c-1.71 0-3.23-.76-4.38-2.02-.68-.73-1.2-.15-1.83-.07a6.37 6.37 0 0 1-.72 2.5c0 .36.08.7.2.1.26-.12.55-.24.84-.37a6.3 6.3 0 0 0 1.92-1.06c.5-.61.95-1.25 1.32-1.92.52-.87.97-1.82 1.32-2.81.09-.26.17-.52.25-.78.1-.32.17-.67.23-1.02.05-.33.08-.67.08-1 0-4.71-3.81-8.5-8.5-8.5S2.5 4.12 2.5 8.83s3.81 8.5 8.5 8.5c2.17 0 4.16-.78 5.74-2.1L10 19l4.5-4.5a6.27 6.27 0 0 0 1.56-4.5Z"
        stroke="none"
      />
    </svg>
  );
}
