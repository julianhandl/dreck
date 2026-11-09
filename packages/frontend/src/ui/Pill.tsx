import type { ReactElement, ReactNode } from 'react';

type PillProps = {
  /** Short label, e.g. "Billable" or "Archived". */
  children: ReactNode;
};

/**
 * Small rounded label with a thin border.
 * @example <Pill>Billable</Pill>
 */
export function Pill({ children }: PillProps): ReactElement {
  return (
    <span className="inline-flex items-center rounded-temp-pill border border-temp-divider bg-temp-surface px-2.5 py-0.5 text-sm text-temp-ink-muted">
      {children}
    </span>
  );
}
