import type { ReactElement, ReactNode } from 'react';

const TONES = {
  default: 'border-temp-divider text-temp-ink-muted',
  accent: 'border-temp-accent text-temp-accent',
  success: 'border-temp-success text-temp-success',
  danger: 'border-temp-danger text-temp-danger',
};

type PillProps = {
  /** Short label, e.g. "Billable" or "Archived". */
  children: ReactNode;
  /** Colour of border and text, e.g. `danger` for an overdue Invoice. */
  tone?: keyof typeof TONES;
};

/**
 * Small rounded label with a thin border.
 * @example <Pill>Billable</Pill>
 * @example <Pill tone="success">Bezahlt</Pill>
 */
export function Pill({ children, tone = 'default' }: PillProps): ReactElement {
  return (
    <span
      className={`inline-flex items-center rounded-temp-pill border bg-temp-surface px-2.5 py-0.5 text-sm whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
