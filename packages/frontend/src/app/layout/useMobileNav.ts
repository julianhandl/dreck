import { useState } from 'react';

export type MobileNav = {
  open: boolean;
  handleOpenChange: (open: boolean) => void;
  /** Closes the list after a screen was chosen. */
  handleNavigate: () => void;
};

/** Open state of the screen list behind the bubble in the mobile top bar. */
export function useMobileNav(): MobileNav {
  const [open, setOpen] = useState(false);
  return { open, handleOpenChange: setOpen, handleNavigate: () => setOpen(false) };
}
