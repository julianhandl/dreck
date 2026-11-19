import type { ReactElement } from 'react';
import { Button } from '@/ui/Button';
import { CheckIcon } from '@/ui/icons';
import { useCopyCommand } from './useCopyCommand';
import { useSetupText } from './useSetupText';

type CopyCommandProps = {
  /** Terminal command, e.g. `docker logs dreck`. */
  command: string;
};

/**
 * PROTOTYPE: a terminal command in monospace with a "Kopieren" button.
 * @example <CopyCommand command="docker logs dreck" />
 */
export function CopyCommand({ command }: CopyCommandProps): ReactElement {
  const t = useSetupText().logHelp;
  const copy = useCopyCommand(command);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-h-9 rounded-temp-control bg-temp-band px-3 py-1.5 font-mono text-sm select-all">
          {command}
        </code>
        <Button size="sm" onClick={copy.handleCopy} aria-label={t.copyLabel(command)}>
          {copy.state === 'copied' ? <CheckIcon /> : null}
          {copy.state === 'copied' ? t.copied : t.copy}
        </Button>
      </div>
      <p role="status" className="text-sm text-temp-ink-muted empty:sr-only">
        {copy.state === 'failed' ? t.copyFailed : ''}
      </p>
    </div>
  );
}
