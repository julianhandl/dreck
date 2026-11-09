import type { ReactElement, ReactNode } from 'react';
import type { QueryState } from '@/api/useQuery';
import { useI18n } from '@/i18n/useI18n';
import { Button } from './Button';
import { OfflineNotice } from './OfflineNotice';

type QueryViewProps<T> = {
  /** State from `useQuery` or `combineQueries`. */
  state: QueryState<T>;
  /** Renders the loaded data. */
  children: (data: T) => ReactNode;
};

/**
 * Renders the data of a query, or "Lädt …", "Keine Verbindung" or the error with retry.
 * @example <QueryView state={projects}>{(list) => <ProjectTable projects={list} />}</QueryView>
 */
export function QueryView<T>({ state, children }: QueryViewProps<T>): ReactElement {
  const { messages } = useI18n();
  switch (state.status) {
    case 'ready':
      return <>{children(state.data)}</>;
    case 'loading':
      return (
        <p role="status" className="py-8 text-temp-ink-muted">
          {messages.shell.loading}
        </p>
      );
    case 'offline':
      return <OfflineNotice message={messages.connection.offline} onRetry={state.retry} />;
    case 'error':
      return (
        <div role="alert" className="flex flex-wrap items-center gap-3">
          <p className="text-temp-danger">{messages.errors[state.code]}</p>
          <Button onClick={state.retry}>{messages.connection.retry}</Button>
        </div>
      );
  }
}
