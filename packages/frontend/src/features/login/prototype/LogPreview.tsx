import type { ReactElement } from 'react';
import type { LogLine } from './useSetupRecoveryPrototype';

type LogPreviewProps = {
  /** Lines of the container log, oldest first. */
  lines: LogLine[];
  /** Makes link lines clickable, e.g. in the simulated log of the prototype. */
  onOpenLink?: (link: string) => void;
  /** Accessible name of the region. */
  label: string;
};

/**
 * PROTOTYPE: container log in a dark terminal box; the block markers SETUP LINK / RESET LINK
 * are highlighted so the page text can point at them.
 * @example <LogPreview lines={log} label="Log" onOpenLink={handleOpenLink} />
 */
export function LogPreview({ lines, onOpenLink, label }: LogPreviewProps): ReactElement {
  return (
    <pre
      role="log"
      aria-label={label}
      className="max-h-80 overflow-auto rounded-temp-control bg-[oklch(20%_0.02_258)] p-4 font-mono text-[oklch(92%_0.01_90)] text-xs leading-relaxed"
    >
      {lines.map((line) => (
        <div key={line.id} className={line.marker ? 'font-bold text-[oklch(85%_0.12_90)]' : ''}>
          {line.link && onOpenLink ? (
            <>
              {line.text.slice(0, line.text.indexOf(line.link))}
              <a
                href={line.link}
                onClick={(event) => {
                  event.preventDefault();
                  onOpenLink(line.link ?? '');
                }}
                className="text-[oklch(82%_0.11_228)] underline"
              >
                {line.link}
              </a>
            </>
          ) : (
            line.text
          )}
        </div>
      ))}
    </pre>
  );
}
