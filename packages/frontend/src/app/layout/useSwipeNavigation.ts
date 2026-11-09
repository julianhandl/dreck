import { useEffect, useEffectEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useNavItems } from './useNavItems';

/** Minimum horizontal distance of a swipe. */
const MIN_DISTANCE_PX = 60;
/** Slower movements count as scrolling or reading, not as a swipe. */
const MAX_DURATION_MS = 600;
/** Where a swipe must not switch the screen: typing, dialogs, popups. */
const IGNORE = 'input, textarea, select, [contenteditable], [role="dialog"], [role="listbox"]';

type Start = { x: number; y: number; time: number; target: EventTarget | null };

/**
 * Swiping left/right on a touch screen opens the next/previous screen of the navigation.
 * Only on the screens themselves (not on forms below them), not in horizontally scrolling
 * areas (tables) and not while a dialog is open.
 */
export function useSwipeNavigation(): void {
  const { items } = useNavItems();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleSwipe = useEffectEvent((start: Start, end: Touch): void => {
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) < MIN_DISTANCE_PX || Math.abs(dx) < 2 * Math.abs(dy)) return;
    if (performance.now() - start.time > MAX_DURATION_MS) return;
    if (!(start.target instanceof Element) || start.target.closest(IGNORE)) return;
    if (document.querySelector('[role="dialog"]') || scrollsHorizontally(start.target)) return;
    const index = items.findIndex((item) => item.to === pathname);
    const next = index === -1 ? undefined : items[index + (dx < 0 ? 1 : -1)];
    if (next) navigate(next.to);
  });

  useEffect(() => {
    let start: Start | null = null;
    function handleTouchStart(event: TouchEvent): void {
      const touch = event.touches[0];
      start =
        event.touches.length === 1 && touch
          ? { x: touch.clientX, y: touch.clientY, time: performance.now(), target: event.target }
          : null;
    }
    function handleTouchEnd(event: TouchEvent): void {
      const touch = event.changedTouches[0];
      if (start && touch) handleSwipe(start, touch);
      start = null;
    }
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);
}

/** Whether the element or an ancestor scrolls sideways; the swipe belongs to it then. */
function scrollsHorizontally(element: Element): boolean {
  for (let el: Element | null = element; el; el = el.parentElement) {
    const { overflowX } = getComputedStyle(el);
    if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth) {
      return true;
    }
  }
  return false;
}
