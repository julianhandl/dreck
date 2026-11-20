import { Accordion } from '@base-ui/react/accordion';
import type { ReactElement } from 'react';
import { ChevronDownIcon } from '@/ui/icons';
import { CopyCommand } from './CopyCommand';
import { useSetupText } from './useSetupText';

// Docker Desktop first: the target group starts Dreck there, not in a terminal
export const LOG_METHODS = ['desktop', 'run', 'compose', 'kubernetes'] as const;

export type LogMethod = (typeof LOG_METHODS)[number];

/** How each way starts Dreck, as in the README; lets the user recognise their own setup. */
export const START_COMMANDS: Record<LogMethod, string> = {
  desktop: 'ghcr.io/julianhandl/dreck',
  run: 'docker run -d --name dreck -p 127.0.0.1:3000:3000 -v dreck-data:/data ghcr.io/julianhandl/dreck',
  compose: 'docker compose up -d',
  kubernetes: 'ghcr.io/julianhandl/dreck',
};

type LogMethodBodyProps = {
  /** How Dreck is started. */
  method: LogMethod;
};

/**
 * PROTOTYPE: the steps to open the log for one way of starting Dreck, with copy buttons.
 * @example <LogMethodBody method="run" />
 */
export function LogMethodBody({ method }: LogMethodBodyProps): ReactElement {
  const t = useSetupText().logHelp;
  switch (method) {
    case 'desktop':
      return <p>{t.desktop.body}</p>;
    case 'run':
      return (
        <div className="flex flex-col gap-3">
          <p>{t.run.body}</p>
          <CopyCommand command="docker logs dreck" />
          <p className="text-sm text-temp-ink-muted">{t.run.otherName}</p>
          <CopyCommand command="docker ps" />
        </div>
      );
    case 'compose':
      return (
        <div className="flex flex-col gap-3">
          <p>{t.compose.body}</p>
          <CopyCommand command="docker compose logs app" />
        </div>
      );
    case 'kubernetes':
      return (
        <div className="flex flex-col gap-3">
          <p>{t.kubernetes.body}</p>
          <CopyCommand command="kubectl logs deployment/dreck" />
        </div>
      );
  }
}

type LogHelpProps = {
  /** Panels open from the start, e.g. all of them in variant C. */
  defaultOpen?: LogMethod[];
  /** Heading level inside the page; the accordion title is one level up. */
  headingLevel?: 2 | 3;
};

/**
 * PROTOTYPE: accordion "So öffnest du den Log" with one panel per way of starting Dreck.
 * @example <LogHelp />
 */
export function LogHelp({ defaultOpen = [], headingLevel = 2 }: LogHelpProps): ReactElement {
  const t = useSetupText().logHelp;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const ItemHeading = headingLevel === 2 ? 'h3' : 'h4';
  return (
    <section className="flex flex-col gap-2">
      <Heading className="font-medium text-xl">{t.title}</Heading>
      <Accordion.Root
        multiple
        defaultValue={defaultOpen}
        className="overflow-hidden rounded-temp-card border border-temp-divider bg-temp-surface"
      >
        {LOG_METHODS.map((method) => (
          <Accordion.Item
            key={method}
            value={method}
            className="border-temp-divider not-first:border-t"
          >
            <Accordion.Header render={<ItemHeading />}>
              <Accordion.Trigger className="group flex min-h-12 w-full items-center justify-between gap-4 px-5 text-left font-medium hover:bg-temp-band">
                {t[method].title}
                <ChevronDownIcon className="shrink-0 transition-transform group-data-panel-open:rotate-180" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel className="px-5 pt-1 pb-4">
              <LogMethodBody method={method} />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  );
}
