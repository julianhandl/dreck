import { useEffect, useRef, useState } from 'react';

type LogPanel = {
  open: boolean;
  handleToggle: () => void;
  handleClose: () => void;
};

/** PROTOTYPE: simulated log panel; opens by itself when a new link lands in the log. */
export function useLogPanel(lineCount: number): LogPanel {
  const [open, setOpen] = useState(false);
  const seen = useRef(lineCount);
  useEffect(() => {
    if (lineCount > seen.current) setOpen(true);
    seen.current = lineCount;
  }, [lineCount]);
  return {
    open,
    handleToggle: () => setOpen((current) => !current),
    handleClose: () => setOpen(false),
  };
}
