// PROTOTYPE tooling: floating bar to flip between UI variants; rendered only in dev builds.
import type { ReactElement, ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { type PrototypeVariant, usePrototypeSwitcher } from './usePrototypeSwitcher';

type PrototypeSwitcherProps = {
  /** Variants in display order; the first is the default without `?variant=`. */
  variants: PrototypeVariant[];
  /** Extra prototype controls next to the variant, e.g. the viewer's Role. */
  children?: ReactNode;
};

/**
 * Dark pill at the bottom centre: ← variant →, cycles `?variant=`; also with ←/→ on the page.
 * @example <PrototypeSwitcher variants={[{ key: 'A', name: 'Tabelle' }]} />
 */
export function PrototypeSwitcher({
  variants,
  children,
}: PrototypeSwitcherProps): ReactElement | null {
  const { current, handlePrevious, handleNext } = usePrototypeSwitcher(variants);
  if (!import.meta.env.DEV) return null;
  return (
    <aside
      aria-label="Prototyp-Steuerung"
      className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-temp-pill bg-temp-ink px-2 py-1.5 text-temp-canvas shadow-temp-float print:hidden"
    >
      <span className="px-2 font-semibold text-xs uppercase tracking-wide">Prototyp</span>
      <button
        type="button"
        onClick={handlePrevious}
        aria-label="Vorige Variante"
        className="inline-flex size-9 items-center justify-center rounded-temp-pill hover:bg-temp-ink-muted"
      >
        <ChevronLeftIcon />
      </button>
      <span aria-live="polite" className="min-w-40 text-center font-medium">
        {current.key} ({current.name})
      </span>
      <button
        type="button"
        onClick={handleNext}
        aria-label="Nächste Variante"
        className="inline-flex size-9 items-center justify-center rounded-temp-pill hover:bg-temp-ink-muted"
      >
        <ChevronRightIcon />
      </button>
      {children}
    </aside>
  );
}
