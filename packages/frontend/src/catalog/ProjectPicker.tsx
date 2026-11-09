import { Combobox } from '@base-ui/react/combobox';
import { Field } from '@base-ui/react/field';
import type { ReactElement } from 'react';
import { useI18n } from '@/i18n/useI18n';
import { CheckIcon, ChevronDownIcon, SearchIcon } from '@/ui/icons';
import type { Catalog } from './useCatalog';

type PickerItem = { id: number; label: string; customer: string };
type PickerGroup = { value: string; items: PickerItem[] };

type ProjectPickerProps = {
  /** Field name for `<Form errors>`. */
  name: string;
  /** Visible label. */
  label: string;
  /** Customers and Projects; only selectable ones appear. */
  catalog: Catalog;
  /** Projects shown first under "Heute verwendet". */
  usedToday?: number[];
  /** Selected Project, `null` for none. */
  value: number | null;
  /** Called with the chosen Project. */
  onValueChange: (projectId: number) => void;
};

/**
 * Project selection like a dropdown with a search field inside the popup, grouped by
 * Customer; Archived Projects are not selectable (Base UI Combobox).
 * @example <ProjectPicker name="projectId" label="Project" catalog={catalog} value={id} onValueChange={setId} />
 */
export function ProjectPicker({
  name,
  label,
  catalog,
  usedToday = [],
  value,
  onValueChange,
}: ProjectPickerProps): ReactElement {
  const { messages } = useI18n();
  const groups = pickerGroups(catalog, usedToday, messages.picker.usedToday);
  const selected = groups.flatMap((g) => g.items).find((item) => item.id === value) ?? null;

  return (
    <Field.Root name={name} className="flex flex-col gap-1">
      <Combobox.Root
        autoHighlight
        items={groups}
        value={selected}
        onValueChange={(item: PickerItem | null) => item && onValueChange(item.id)}
        itemToStringLabel={(item: PickerItem) => `${item.label} ${item.customer}`}
        isItemEqualToValue={(item: PickerItem, current: PickerItem) => item.id === current.id}
      >
        <Combobox.Label className="font-medium">{label}</Combobox.Label>
        <Combobox.Trigger className="flex min-h-14 w-full items-center justify-between gap-3 rounded-temp-control border border-temp-border bg-temp-surface px-3 py-1.5 text-left hover:bg-temp-band data-invalid:border-temp-danger">
          {selected ? (
            <span className="flex flex-col">
              <span className="text-sm text-temp-ink-muted">{selected.customer}</span>
              <span>{selected.label}</span>
            </span>
          ) : (
            <span className="text-temp-ink-muted">{messages.picker.placeholder}</span>
          )}
          <ChevronDownIcon />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner className="z-20 outline-hidden" sideOffset={4} align="start">
            <Combobox.Popup
              aria-label={label}
              className="w-(--anchor-width) max-w-(--available-width) rounded-temp-control border border-temp-divider bg-temp-surface p-3 text-temp-ink shadow-xl"
            >
              <div className="relative">
                <SearchIcon className="absolute top-3 left-3 text-temp-ink-muted" />
                <Combobox.Input
                  placeholder={messages.picker.search}
                  className="min-h-11 w-full rounded-temp-control border-2 border-temp-ink bg-temp-surface pr-3 pl-10"
                />
              </div>
              <Combobox.Empty>
                <p className="px-3 py-4 text-temp-ink-muted empty:hidden">
                  {messages.picker.empty}
                </p>
              </Combobox.Empty>
              <Combobox.List className="mt-2 max-h-[min(22rem,var(--available-height))] overflow-y-auto overscroll-contain">
                {(group: PickerGroup) => (
                  <Combobox.Group key={group.value} items={group.items} className="pb-1">
                    <Combobox.GroupLabel className="px-3 py-2 font-semibold">
                      {group.value}
                    </Combobox.GroupLabel>
                    <Combobox.Collection>
                      {(item: PickerItem) => (
                        <Combobox.Item
                          key={`${group.value}-${item.id}`}
                          value={item}
                          className="grid cursor-default grid-cols-[1.25rem_1fr] items-center gap-2 rounded-temp-option py-2 pr-3 pl-4 outline-hidden select-none data-highlighted:bg-temp-selected data-highlighted:text-temp-on-selected"
                        >
                          <Combobox.ItemIndicator className="col-start-1">
                            <CheckIcon />
                          </Combobox.ItemIndicator>
                          <span className="col-start-2">{item.label}</span>
                        </Combobox.Item>
                      )}
                    </Combobox.Collection>
                  </Combobox.Group>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <Field.Error className="text-sm text-temp-danger" />
    </Field.Root>
  );
}

function pickerGroups(
  catalog: Catalog,
  usedToday: number[],
  usedTodayLabel: string,
): PickerGroup[] {
  const groups = catalog.selectable.map((group) => ({
    value: group.customer.name,
    items: group.projects.map((p) => ({ id: p.id, label: p.name, customer: group.customer.name })),
  }));
  const all = groups.flatMap((g) => g.items);
  const today = all.filter((item) => usedToday.includes(item.id));
  return today.length > 0 ? [{ value: usedTodayLabel, items: today }, ...groups] : groups;
}
