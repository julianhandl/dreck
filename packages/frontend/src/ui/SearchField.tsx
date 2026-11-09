import { type ReactElement, useId } from 'react';
import { SearchIcon } from './icons';

type SearchFieldProps = {
  /** Accessible name, also the placeholder, e.g. "Nach Project oder Customer suchen". */
  label: string;
  /** Current search text. */
  value: string;
  /** Called with the new text on every change. */
  onValueChange: (value: string) => void;
  /** Extra classes for the wrapper, e.g. a width. */
  className?: string;
};

/**
 * Search input with a magnifier; filters while typing.
 * @example <SearchField label="Suchen" value={search} onValueChange={setSearch} />
 */
export function SearchField({
  label,
  value,
  onValueChange,
  className = '',
}: SearchFieldProps): ReactElement {
  const id = useId();
  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <SearchIcon className="pointer-events-none absolute top-3 left-3 text-temp-ink-muted" />
      <input
        id={id}
        type="search"
        placeholder={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="min-h-11 w-full rounded-temp-control border border-temp-border bg-temp-surface pr-3 pl-10 placeholder:text-temp-ink-muted"
      />
    </div>
  );
}
