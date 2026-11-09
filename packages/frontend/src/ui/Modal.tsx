import { Dialog } from '@base-ui/react/dialog';
import type { ReactElement, ReactNode, RefObject } from 'react';

type ModalProps = {
  /** Heading in the grey band, also the accessible name. */
  title: string;
  /** Whether the dialog is open; the state lives in the calling hook. */
  open: boolean;
  /** Called on Escape, a click outside and the close buttons. */
  onOpenChange: (open: boolean) => void;
  /** Element focused on open; the first tabbable element without. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Called on close: `false` = focus already moved, `true` = back to the trigger. */
  finalFocus?: () => boolean;
  /** Content below the heading. */
  children: ReactNode;
};

/**
 * Dialog with the heading in a grey band (Base UI Dialog), on mobile at the bottom within
 * thumb reach; Escape closes it and returns the focus to the trigger.
 * @example <Modal title="Neuer Time Entry" open={open} onOpenChange={setOpen}>…</Modal>
 */
export function Modal({
  title,
  open,
  onOpenChange,
  initialFocus,
  finalFocus,
  children,
}: ModalProps): ReactElement {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-10 bg-temp-backdrop" />
        <Dialog.Popup
          initialFocus={initialFocus}
          finalFocus={finalFocus}
          className="fixed inset-x-4 top-[8vh] z-10 mx-auto max-h-[84vh] max-sm:top-auto max-sm:bottom-4 max-w-2xl overflow-y-auto rounded-temp-card bg-temp-surface text-temp-ink shadow-temp-float"
        >
          <Dialog.Title className="px-6 pt-6 font-medium text-2xl tracking-tight">
            {title}
          </Dialog.Title>
          <div className="p-6">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
