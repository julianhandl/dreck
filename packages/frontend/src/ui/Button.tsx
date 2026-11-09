import type { ComponentPropsWithoutRef, ElementType, ReactElement } from 'react';

const VARIANTS = {
  primary:
    'border border-transparent bg-temp-primary text-temp-on-primary hover:bg-temp-primary-hover',
  secondary:
    'border border-temp-divider bg-temp-surface text-temp-ink shadow-temp-card hover:bg-temp-band',
  link: 'border border-transparent text-temp-link underline underline-offset-2',
  /** Destructive text action, e.g. "Löschen" */
  danger: 'border border-transparent text-temp-danger underline underline-offset-2',
  /** Start of the timer */
  timer: 'border border-transparent bg-temp-timer text-temp-on-timer hover:bg-temp-timer-hover',
  ghost: 'border border-transparent text-temp-ink hover:bg-temp-band',
};

const SIZES = {
  md: 'min-h-11 px-4 text-base',
  sm: 'min-h-9 px-3 text-sm',
  /** Square button for an icon, e.g. ← → */
  icon: 'size-11',
};

type ButtonProps<E extends ElementType> = {
  /** Element to render, e.g. `Link` for navigation; `button` by default. */
  as?: E;
  /** `primary` for the main action of a screen, `link` for text actions. */
  variant?: keyof typeof VARIANTS;
  /** `icon` for a square button with only an icon (needs `aria-label`). */
  size?: keyof typeof SIZES;
} & ComponentPropsWithoutRef<E>;

/**
 * Button with rounded corners; `type="button"` unless set otherwise. Renders as another
 * element via `as`.
 * @example <Button variant="primary" type="submit">Speichern</Button>
 * @example <Button as={Link} to="/projects/new" variant="primary">Neues Project</Button>
 */
export function Button<E extends ElementType = 'button'>({
  as,
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps<E>): ReactElement {
  const Component: ElementType = as ?? 'button';
  const type = Component === 'button' ? (props.type ?? 'button') : undefined;
  return (
    <Component
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-temp-button font-medium whitespace-nowrap aria-disabled:opacity-60 disabled:opacity-60 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
      type={type}
    />
  );
}
