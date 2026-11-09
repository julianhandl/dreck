import type { ReactElement, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

// Decorative line icons (24 × 24 grid); the surrounding control carries the accessible name
function Icon({ children, ...props }: IconProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.25em"
      height="1.25em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Plus sign for "new" buttons. @example <PlusIcon /> */
export function PlusIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

/** Arrow to the left (previous, back). @example <ArrowLeftIcon /> */
export function ArrowLeftIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  );
}

/** Arrow to the right (next). @example <ArrowRightIcon /> */
export function ArrowRightIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

/** Chevron for dropdown triggers. @example <ChevronDownIcon /> */
export function ChevronDownIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

/** Chevron to the left (previous day on mobile). @example <ChevronLeftIcon /> */
export function ChevronLeftIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M15 6l-6 6 6 6" />
    </Icon>
  );
}

/** Chevron to the right (next day on mobile). @example <ChevronRightIcon /> */
export function ChevronRightIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  );
}

/** Magnifier for search fields. @example <SearchIcon /> */
export function SearchIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Icon>
  );
}

/** Pencil for "edit". @example <PencilIcon /> */
export function PencilIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3" />
    </Icon>
  );
}

/** Calendar for date pickers. @example <CalendarIcon /> */
export function CalendarIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </Icon>
  );
}

/** Play triangle for starting a timer. @example <PlayIcon /> */
export function PlayIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M8 5l11 7-11 7z" fill="currentColor" />
    </Icon>
  );
}

/** Square for stopping a timer. @example <StopIcon /> */
export function StopIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" />
    </Icon>
  );
}

/** Cross for "clear" or "close". @example <XIcon /> */
export function XIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

/** Check mark for the selected option. @example <CheckIcon /> */
export function CheckIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M5 12l5 5 9-10" />
    </Icon>
  );
}

/** Rising line for the progress chart. @example <TrendIcon /> */
export function TrendIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M4 18l6-6 4 3 6-8" />
    </Icon>
  );
}

/** Bars for the weekly chart. @example <BarsIcon /> */
export function BarsIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M6 20V12M12 20V5M18 20v-9" />
    </Icon>
  );
}
