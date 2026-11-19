import type { BudgetState } from '@dreck/shared/budget';
import type { ReactElement } from 'react';

const FILL: Record<BudgetState, string> = {
  ok: 'bg-temp-chart',
  warning: 'bg-temp-warning',
  over: 'bg-temp-danger',
};
const TEXT: Record<BudgetState, string> = {
  ok: 'text-temp-ink-muted',
  warning: 'text-temp-warning',
  over: 'text-temp-danger',
};

type BudgetBarProps = {
  /** Accessible name of the bar, e.g. "Budget von Website-Relaunch". */
  label: string;
  /** Consumed part in the unit of `limit`. */
  used: number;
  /** Upper limit. */
  limit: number;
  /** Colours the bar; `warning` and `over` also show `stateLabel` as text. */
  state: BudgetState;
  /** Name of the state, e.g. "Knapp". */
  stateLabel: string;
  /** Consumption as text, e.g. "12,5 h von 40 h". */
  valueText: string;
};

/**
 * Narrow progress bar of a Budget with its consumption as text; colour is never the only
 * hint: `warning` and `over` are written out.
 * @example <BudgetBar label="Budget" used={50} limit={100} state="ok" stateLabel="Im Rahmen" valueText="50 von 100" />
 */
export function BudgetBar({
  label,
  used,
  limit,
  state,
  stateLabel,
  valueText,
}: BudgetBarProps): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
        aria-valuetext={`${valueText}, ${stateLabel}`}
        className="h-2 w-full min-w-32 overflow-hidden rounded-temp-pill bg-temp-band"
      >
        <div
          className={`h-full ${FILL[state]}`}
          style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
        />
      </div>
      <p className="text-sm text-temp-ink-muted">
        {valueText}
        {state !== 'ok' && (
          <span className={`ml-2 font-semibold ${TEXT[state]}`}>{stateLabel}</span>
        )}
      </p>
    </div>
  );
}
