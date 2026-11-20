import { useEffect, useState } from 'react';

/** Phases: 0 current page, 1 address bar selected, 2 link pasted, 3 Enter, 4 setup form. */
export const BROWSER_PHASES = 5;
const STEP_MS = 1600;

type BrowserMock = {
  phase: number;
  playing: boolean;
  handleTogglePlay: () => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * PROTOTYPE: loops the phases of the browser mock; starts paused on the pasted link when the
 * user prefers reduced motion, and can always be paused (WCAG 2.2.2).
 */
export function useBrowserMock(): BrowserMock {
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [phase, setPhase] = useState(() => (prefersReducedMotion() ? 2 : 0));

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setPhase((p) => (p + 1) % BROWSER_PHASES), STEP_MS);
    return () => window.clearInterval(timer);
  }, [playing]);

  return { phase, playing, handleTogglePlay: () => setPlaying((p) => !p) };
}
