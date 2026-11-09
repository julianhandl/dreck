import { useLocation } from 'react-router';
import { useI18n } from '@/i18n/useI18n';

export type NavItem = {
  to: string;
  label: string;
  /** Only the exact path is active (`/` would match every page). */
  end: boolean;
};

export type NavItems = {
  /** The screens in navigation order; also the swipe order on mobile. */
  items: NavItem[];
  /** Screen of the current URL, `undefined` e.g. on "Seite nicht gefunden". */
  current: NavItem | undefined;
};

/** Screens of the top bar and the one the current URL belongs to. */
export function useNavItems(): NavItems {
  const { messages } = useI18n();
  const { pathname } = useLocation();
  const items: NavItem[] = [
    { to: '/', label: messages.nav.time, end: true },
    { to: '/expenses', label: messages.nav.expenses, end: false },
    { to: '/projects', label: messages.nav.projects, end: false },
    { to: '/reports', label: messages.nav.reports, end: false },
    { to: '/settings', label: messages.nav.settings, end: false },
  ];
  const current = items.find((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
  return { items, current };
}
