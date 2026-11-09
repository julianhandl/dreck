import type { ReactElement } from 'react';

type CheckboxFieldProps = {
  /** Visible label right of the box. */
  label: string;
  /** Checked state; the state lives in the calling hook. */
  checked: boolean;
  /** Called with the new state. */
  onCheckedChange: (checked: boolean) => void;
};

/**
 * Native checkbox with its label, e.g. "Diese Expense ist billable".
 * @example <CheckboxField label="Billable" checked={billable} onCheckedChange={setBillable} />
 */
export function CheckboxField({
  label,
  checked,
  onCheckedChange,
}: CheckboxFieldProps): ReactElement {
  return (
    <label className="flex min-h-11 w-fit items-center gap-3">
      <input
        type="checkbox"
        className="size-5"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
