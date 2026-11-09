import { Popover } from '@base-ui/react/popover';
import type { ReactElement } from 'react';
import { NavLink } from 'react-router';
import { useI18n } from '@/i18n/useI18n';
import { ChevronDownIcon } from '@/ui/icons';
import { useMobileNav } from './useMobileNav';
import { useNavItems } from './useNavItems';

const LINK =
  'inline-flex min-h-11 items-center whitespace-nowrap rounded-temp-pill px-4 font-medium text-temp-ink hover:bg-temp-band aria-[current=page]:bg-temp-nav-active aria-[current=page]:text-temp-on-nav';

/**
 * Top bar: wordmark and the screens. Desktop: screens as pills on the left, Einstellungen on
 * the right. Mobile: a bubble with the current screen that opens the list of all screens.
 * The active screen gets `aria-current="page"` from NavLink.
 * @example <MainNav />
 */
export function MainNav(): ReactElement {
  const { messages } = useI18n();
  const { items, current } = useNavItems();
  const mobile = useMobileNav();
  const settings = items.find((item) => item.to === '/settings');
  const screens = items.filter((item) => item !== settings);
  const currentLabel = current?.label ?? messages.nav.menu;

  return (
    <header className="bg-temp-nav py-3">
      <nav
        aria-label={messages.nav.label}
        className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 px-4 sm:gap-x-4 sm:px-8"
      >
        <span className="mr-2 shrink-0 font-semibold text-temp-primary text-temp-wordmark tracking-tight sm:mr-6">
          Dreck
        </span>

        {/* Mobile */}
        <Popover.Root open={mobile.open} onOpenChange={mobile.handleOpenChange}>
          <Popover.Trigger
            aria-label={`${messages.nav.menu}: ${currentLabel}`}
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-temp-pill bg-temp-nav-active px-4 font-medium text-temp-on-nav sm:hidden"
          >
            {currentLabel}
            <ChevronDownIcon />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner className="z-20" sideOffset={8} align="end">
              <Popover.Popup className="min-w-56 rounded-temp-control border border-temp-divider bg-temp-surface p-1 text-temp-ink shadow-lg">
                <ul>
                  {items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={mobile.handleNavigate}
                        className="flex min-h-11 items-center rounded-temp-option px-4 font-medium hover:bg-temp-band aria-[current=page]:bg-temp-selected aria-[current=page]:text-temp-on-selected"
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>

        {/* Desktop */}
        <ul className="hidden gap-1 rounded-temp-pill bg-temp-surface p-1 shadow-temp-card sm:flex">
          {screens.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className={LINK}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        {settings && (
          <NavLink to={settings.to} className={`${LINK} ml-auto max-sm:hidden`}>
            {settings.label}
          </NavLink>
        )}
      </nav>
    </header>
  );
}
