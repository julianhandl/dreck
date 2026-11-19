import type { ReactElement, ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { usePrototypeSwitcher } from './usePrototypeSwitcher';

type PrototypeSwitcherProps<K extends string> = {
  /** Variants in order, with a short name for the label. */
  variants: readonly { key: K; name: string }[];
  /** Key of the variant on screen. */
  current: K;
  /** Called with the key of the variant to show; the caller writes it to the URL. */
  onChange: (key: K) => void;
  /** Extra controls of the prototype, e.g. a state picker. */
  children?: ReactNode;
};

/**
 * PROTOTYPE ONLY: floating dark bar at the bottom that cycles through UI variants (← →).
 * Renders nothing in a production build.
 * @example <PrototypeSwitcher variants={VARIANTS} current="A" onChange={setVariant} />
 */
export function PrototypeSwitcher<K extends string>({
  variants,
  current,
  onChange,
  children,
}: PrototypeSwitcherProps<K>): ReactElement | null {
  const switcher = usePrototypeSwitcher({ keys: variants.map((v) => v.key), current, onChange });
  if (!import.meta.env.DEV) return null;
  const name = variants.find((v) => v.key === current)?.name ?? '';
  return (
    <aside
      aria-label="Prototyp-Steuerung"
      className="fixed inset-x-2 bottom-3 z-30 mx-auto flex w-fit max-w-[calc(100vw-1rem)] flex-wrap items-center justify-center gap-2 rounded-2xl bg-black px-3 py-2 text-sm text-white shadow-temp-float ring-2 ring-fuchsia-500"
    >
      <span className="rounded bg-fuchsia-600 px-1.5 py-0.5 font-bold text-xs uppercase">
        Prototyp
      </span>
      <button
        type="button"
        onClick={switcher.handlePrevious}
        aria-label="Vorige Variante"
        className="grid size-9 place-items-center rounded-full hover:bg-white/20"
      >
        <ChevronLeftIcon />
      </button>
      <span aria-live="polite" className="min-w-40 text-center font-medium">
        {current} ({name})
      </span>
      <button
        type="button"
        onClick={switcher.handleNext}
        aria-label="Nächste Variante"
        className="grid size-9 place-items-center rounded-full hover:bg-white/20"
      >
        <ChevronRightIcon />
      </button>
      {children}
    </aside>
  );
}
