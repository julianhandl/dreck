import type { ReactElement } from 'react';
import { NavLink } from 'react-router';
import { useI18n } from '@/i18n/useI18n';

const LINK =
  'inline-flex min-h-11 items-center rounded-temp-pill px-4 font-medium text-temp-ink hover:bg-temp-band aria-[current=page]:bg-temp-nav-active aria-[current=page]:text-temp-on-nav';

/**
 * Links between the settings pages "Allgemein" and "Tasks"; the open one gets
 * `aria-current="page"` from NavLink.
 * @example <SettingsNav />
 */
export function SettingsNav(): ReactElement {
  const { messages } = useI18n();
  const t = messages.settings;
  return (
    <nav aria-label={t.sections}>
      <ul className="flex flex-wrap gap-2">
        <li>
          <NavLink to="/settings" end className={LINK}>
            {t.general}
          </NavLink>
        </li>
        <li>
          <NavLink to="/settings/tasks" className={LINK}>
            {t.tasks}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
