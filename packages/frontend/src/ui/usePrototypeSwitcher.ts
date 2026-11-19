import { useEffect } from 'react';

type Options<K extends string> = {
  keys: readonly K[];
  current: K;
  onChange: (key: K) => void;
};

type PrototypeSwitcher = {
  handlePrevious: () => void;
  handleNext: () => void;
};

function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
      // Tabs move between tabs with ← →
      target.closest('[role="tablist"]') !== null)
  );
}

/** PROTOTYPE: cycles through the variants, also with ← and → outside of inputs. */
export function usePrototypeSwitcher<K extends string>({
  keys,
  current,
  onChange,
}: Options<K>): PrototypeSwitcher {
  const index = keys.indexOf(current);
  const step = (by: number): K => keys[(index + by + keys.length) % keys.length] ?? current;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (typing(event.target) || event.altKey || event.metaKey || event.ctrlKey) return;
      if (event.key === 'ArrowLeft') onChange(step(-1));
      if (event.key === 'ArrowRight') onChange(step(1));
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return { handlePrevious: () => onChange(step(-1)), handleNext: () => onChange(step(1)) };
}
