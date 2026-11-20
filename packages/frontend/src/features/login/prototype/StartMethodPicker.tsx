import type { ReactElement } from 'react';
import { LOG_METHODS, type LogMethod, START_COMMANDS } from './LogHelp';
import { useSetupText } from './useSetupText';

type StartMethodPickerProps = {
  /** The way Dreck was started that the user picked. */
  value: LogMethod;
  /** Called with the picked way. */
  onChange: (method: LogMethod) => void;
  /** Accessible name of the group, e.g. the step title. */
  legend: string;
};

/**
 * PROTOTYPE: cards stacked as a radio group, each with the start command from the README as a
 * subheadline, so a user without Docker knowledge recognises how they started Dreck.
 * @example <StartMethodPicker value={method} onChange={setMethod} legend="Wie startest du Dreck?" />
 */
export function StartMethodPicker({
  value,
  onChange,
  legend,
}: StartMethodPickerProps): ReactElement {
  const t = useSetupText().logHelp;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{legend}</legend>
      {LOG_METHODS.map((method) => (
        <label
          key={method}
          className="flex cursor-pointer gap-4 rounded-temp-control border border-temp-border bg-temp-surface p-4 hover:bg-temp-band has-checked:border-temp-primary has-checked:bg-temp-highlight has-checked:ring-2 has-checked:ring-temp-primary has-focus-visible:outline-2 has-focus-visible:outline-temp-focus"
        >
          <input
            type="radio"
            name="start-method"
            className="mt-0.5 size-5 shrink-0"
            checked={value === method}
            onChange={() => onChange(method)}
          />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-medium">{t[method].title}</span>
            <span className="text-sm text-temp-ink-muted">{t[method].started}</span>
            <code className="rounded bg-temp-band px-2 py-1 font-mono text-xs break-all">
              {START_COMMANDS[method]}
            </code>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
