/** Inline stroke icons matching the OpenPencil nav/measurement vectors. */

type IconProps = {
  className?: string;
  strokeWidth?: number;
};

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
      <path d="M6.67 10v2.5h6.66V10" />
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