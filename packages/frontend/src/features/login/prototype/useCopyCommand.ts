import { useState } from 'react';

type CopyState = 'idle' | 'copied' | 'failed';

type CopyCommand = {
  state: CopyState;
  handleCopy: () => Promise<void>;
};

/** Copies a command; the clipboard API is missing over plain HTTP outside localhost. */
export function useCopyCommand(command: string): CopyCommand {
  const [state, setState] = useState<CopyState>('idle');
  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(command);
      setState('copied');
    } catch {
      setState('failed');
    }
  }
  return { state, handleCopy };
}
