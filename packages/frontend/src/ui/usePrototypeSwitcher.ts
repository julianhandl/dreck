// PROTOTYPE tooling: never ships, see PrototypeSwitcher.
import { useEffect, useEffectEvent } from 'react';
import { useSearchParams } from 'react-router';

export type PrototypeVariant = { key: string; name: string };

/** Elements that use the arrow keys themselves. */
const OWN_ARROWS =
  'input, textarea, select, [contenteditable], [role="tab"], [role="radio"], [role="listbox"], [role="menu"], [role="dialog"]';

/** Current `?variant=` and cycling through the variants with the arrows and ←/→. */
export function usePrototypeSwitcher(variants: PrototypeVariant[]): {
  current: PrototypeVariant;
  handlePrevious: () => void;
  handleNext: () => void;
} {
  const [params, setParams] = useSearchParams();
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === params.get('variant')),
  );
  const current = variants[index] ?? { key: '?', name: '' };

  const go = (step: number): void => {
    const next = variants[(index + step + variants.length) % variants.length];
    if (!next) return;
    setParams(
      (p) => {
        p.set('variant', next.key);
        return p;
      },
      { replace: true },
    );
  };

  const handleKey = useEffectEvent((event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.target instanceof Element && event.target.closest(OWN_ARROWS)) return;
    if (document.querySelector('[role="dialog"]')) return;
    go(event.key === 'ArrowLeft' ? -1 : 1);
  });

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return { current, handlePrevious: () => go(-1), handleNext: () => go(1) };
}
