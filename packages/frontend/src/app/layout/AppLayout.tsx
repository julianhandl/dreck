import type { ReactElement } from 'react';
import { MainNav } from './MainNav';
import { PageOutlet } from './PageOutlet';
import { useSwipeNavigation } from './useSwipeNavigation';

/**
 * Page frame: top bar with the navigation, below it the current page; on touch screens a
 * sideways swipe switches the screen.
 * @example <Route element={<AppLayout />}>…</Route>
 */
export function AppLayout(): ReactElement {
  useSwipeNavigation();
  return (
    <div className="isolate flex min-h-dvh flex-col">
      <MainNav />
      <main className="flex-1 pb-16 print:pb-0">
        <PageOutlet />
      </main>
    </div>
  );
}
