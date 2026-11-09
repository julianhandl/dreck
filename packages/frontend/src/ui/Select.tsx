import { Field } from '@base-ui/react/field';
import { Select as BaseSelect } from '@base-ui/react/select';
import type { ReactElement } from 'react';
import { CheckIcon, ChevronDownIcon } from './icons';

export type SelectOption<V extends string> = { value: V; label: string };

type SelectProps<V extends string> = {
  /** Accessible name; visible above the trigger unless `hideLabel`. */
  label: string;
  /** Label only for screen readers, e.g. for filters whose trigger already says enough. */
  hideLabel?: boolean;
  /** Selected value. */
  value: V;
  /** Options in display order. */
  options: SelectOption<V>[];
  /** Called with the chosen value. */
  onValueChange: (value: V) => void;
  /** Field name in a Base UI `Form`; shows its errors below the trigger. */
  name?: string;
  /** `row`: label in a left column like the Harvest settings forms. */
  layout?: 'stacked' | 'row';
  /** Extra classes for the trigger, e.g. a width. */
  className?: string;
};

/**
 * Dropdown with a fixed list of options (Base UI Select).
 * @example <Select label="Sprache" value={language} options={options} onValueChange={setLanguage} />
 */
export function Select<V extends string>({
  label,
  hideLabel = false,
  value,
  options,
  onValueChange,
  name,
  layout = 'stacked',
  className = '',
}: SelectProps<V>): ReactElement {
  const row = layout === 'row';
  return (
    <Field.Root
      name={name}
      className={row ? 'grid gap-x-8 gap-y-1 sm:grid-cols-[12rem_1fr]' : 'flex flex-col gap-1'}
    >
      <BaseSelect.Root
        items={options}
        value={value}
        onValueChange={(next) => next !== null && onValueChange(next)}
      >
        <BaseSelect.Label
          className={hideLabel ? 'sr-only' : `font-medium ${row ? 'sm:pt-2.5' : ''}`}
        >
          {label}
        </BaseSelect.Label>
        <BaseSelect.Trigger
          className={`flex min-h-11 w-fit min-w-48 items-center justify-between gap-3 rounded-temp-control border border-temp-border bg-temp-surface px-4 text-left hover:bg-temp-band data-invalid:border-temp-danger ${row ? 'sm:col-start-2' : ''} ${className}`}
        >
          <BaseSelect.Value />
          <BaseSelect.Icon className="text-temp-ink">
            <ChevronDownIcon />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>
        <BaseSelect.Portal>
          <BaseSelect.Positioner
            className="z-20 outline-hidden"
            sideOffset={4}
            alignItemWithTrigger={false}
          >
            <BaseSelect.Popup className="min-w-(--anchor-width) rounded-temp-control border border-temp-divider bg-temp-surface p-1 text-temp-ink shadow-lg">
              <BaseSelect.List className="max-h-(--available-height) overflow-y-auto">
                {options.map((option) => (
                  <BaseSelect.Item
                    key={option.value}
                    value={option.value}
                    className="grid cursor-default grid-cols-[1.25rem_1fr] items-center gap-2 rounded-temp-option py-2 pr-4 pl-3 outline-hidden select-none data-highlighted:bg-temp-selected data-highlighted:text-temp-on-selected"
                  >
                    <BaseSelect.ItemIndicator className="col-start-1">
                      <CheckIcon />
                    </BaseSelect.ItemIndicator>
                    <BaseSelect.ItemText className="col-start-2">
                      {option.label}
                    </BaseSelect.ItemText>
                  </BaseSelect.Item>
                ))}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
      <Field.Error className="text-sm text-temp-danger sm:col-start-2" />
    </Field.Root>
  );
}
