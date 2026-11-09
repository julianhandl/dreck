import { Menu } from '@base-ui/react/menu';
import type { ReactElement } from 'react';
import { ChevronDownIcon } from './icons';

export type MenuAction = {
  /** Visible text of the item. */
  label: string;
  /** Runs when the item is chosen. */
  onSelect: () => void;
  /** Red text for destructive actions. */
  danger?: boolean;
};

type ActionsMenuProps = {
  /** Text of the trigger, e.g. "Aktionen". */
  label: string;
  /** Accessible name of the trigger that names the object, e.g. "Aktionen für Website". */
  ariaLabel: string;
  /** Items in display order. */
  actions: MenuAction[];
};

/**
 * Dropdown button "Aktionen ▾" with a list of actions (Base UI Menu).
 * @example <ActionsMenu label="Aktionen" ariaLabel="Aktionen für Website" actions={actions} />
 */
export function ActionsMenu({ label, ariaLabel, actions }: ActionsMenuProps): ReactElement {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={ariaLabel}
        className="inline-flex min-h-9 items-center gap-2 rounded-temp-control border border-temp-border bg-temp-surface px-3 text-sm hover:bg-temp-band data-popup-open:bg-temp-band"
      >
        {label}
        <ChevronDownIcon />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-20 outline-hidden" sideOffset={4} align="end">
          <Menu.Popup className="min-w-44 rounded-temp-control border border-temp-divider bg-temp-surface p-1 text-temp-ink shadow-lg outline-hidden">
            {actions.map((action) => (
              <Menu.Item
                key={action.label}
                onClick={action.onSelect}
                className={`flex cursor-default rounded-temp-option px-4 py-2 outline-hidden select-none data-highlighted:bg-temp-selected data-highlighted:text-temp-on-selected ${action.danger ? 'text-temp-danger' : ''}`}
              >
                {action.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
