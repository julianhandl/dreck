import type { ApiErrorCode } from '@dreck/shared/api-errors';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { ApiError, NetworkError } from '@/api/api-client';
import { invalidateQueries } from '@/api/useQuery';
import { useI18n } from '@/i18n/useI18n';

type SubmitOptions<V> = {
  /** Field that shows an error code without field path, e.g. `{ name_taken: 'name' }`. */
  fields?: Partial<Record<ApiErrorCode, string>>;
  /** Client-side check before the call: field name → UI text; empty object = valid. */
  validate?: (values: V) => Record<string, string>;
};

export type Submit<V> = {
  /** For `<Form ref>`: server errors move the focus to the first invalid field. */
  formRef: RefObject<HTMLFormElement | null>;
  /** For `<Form onFormSubmit>`. */
  handleSubmit: (values: V) => Promise<void>;
  /** Sends the last values again (button "Erneut versuchen"); no automatic retry. */
  handleRetry: () => void;
  /** For `aria-disabled` on the submit button; `disabled` would drop the focus. */
  pending: boolean;
  /** The last attempt did not reach the server; the form keeps its input. */
  offline: boolean;
  /** For `<Form errors>`: field name → UI text. */
  errors: Record<string, string>;
  /** Error that belongs to no field. */
  formError: string | null;
};

/**
 * Runs a write action, loads the queries again on success and turns network and API errors
 * into form state.
 */
export function useSubmit<V>(
  action: (values: V) => Promise<void>,
  { fields = {}, validate }: SubmitOptions<V> = {},
): Submit<V> {
  const { messages } = useI18n();
  const lastValues = useRef<V>(null);
  const [pending, setPending] = useState(false);
  const [offline, setOffline] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const running = useRef(false);

  useEffect(() => {
    const [first] = Object.keys(errors);
    if (first === undefined) return;
    formRef.current?.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"]`)?.focus();
  }, [errors]);

  async function handleSubmit(values: V): Promise<void> {
    // The submit button stays focusable (aria-disabled), so ignore a second click here
    if (running.current) return;
    const invalid = validate?.(values) ?? {};
    if (Object.keys(invalid).length > 0) {
      setOffline(false);
      setFormError(null);
      setErrors(invalid);
      return;
    }
    running.current = true;
    lastValues.current = values;
    setPending(true);
    setOffline(false);
    setErrors({});
    setFormError(null);
    try {
      await action(values);
      invalidateQueries();
    } catch (error) {
      if (error instanceof NetworkError) setOffline(true);
      else if (error instanceof ApiError) {
        const text = messages.errors[error.code];
        const names = issueFields(error.details);
        const field = fields[error.code];
        if (field) names.push(field);
        if (names.length > 0) setErrors(Object.fromEntries(names.map((name) => [name, text])));
        else setFormError(text);
      } else throw error;
    } finally {
      running.current = false;
      setPending(false);
    }
  }

  function handleRetry(): void {
    if (lastValues.current !== null) void handleSubmit(lastValues.current);
  }

  return { formRef, handleSubmit, handleRetry, pending, offline, errors, formError };
}

// `validation_failed` carries Zod issues; the first path segment is the field name
function issueFields(details: Record<string, unknown>): string[] {
  const { issues } = details;
  if (!Array.isArray(issues)) return [];
  return issues.flatMap((issue: unknown) => {
    if (typeof issue !== 'object' || issue === null || !('path' in issue)) return [];
    const [name] = Array.isArray(issue.path) ? issue.path : [];
    return typeof name === 'string' ? [name] : [];
  });
}
