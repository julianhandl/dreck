import { Field } from '@base-ui/react/field';
import type {
  HTMLAttributes,
  HTMLInputAutoCompleteAttribute,
  HTMLInputTypeAttribute,
  ReactElement,
  ReactNode,
  Ref,
} from 'react';

type TextFieldProps = {
  /** Field name; key in the form values and in `<Form errors>`. */
  name: string;
  /** Visible label. */
  label: string;
  /** Label only for screen readers; use when a heading or placeholder already says it. */
  hideLabel?: boolean;
  /** `row`: label in a left column like the Harvest settings forms. */
  layout?: 'stacked' | 'row';
  /** Input type, `text` by default. */
  type?: HTMLInputTypeAttribute;
  /** Renders a `<textarea>`. */
  multiline?: boolean;
  /** Autofill hint (WCAG 1.3.5). */
  autoComplete?: HTMLInputAutoCompleteAttribute;
  /** Keyboard on touch devices, e.g. `decimal` for amounts. */
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  /** Required field, marked with `*`. */
  required?: boolean;
  /** Example inside the empty input; never the only label. */
  placeholder?: string;
  /** Id of a `<datalist>` with suggestions. */
  list?: string;
  /** Text before the input, e.g. the currency symbol. */
  prefix?: ReactNode;
  /** Text after the input, e.g. "pro Stunde". */
  suffix?: ReactNode;
  /** Hint below the input. */
  description?: string;
  /** Not editable, e.g. a locked currency; say why in `description`. */
  disabled?: boolean;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Controlled value; use together with `onValueChange`. */
  value?: string;
  /** Called with the new text on every change. */
  onValueChange?: (value: string) => void;
  /** Extra classes for the input, e.g. a width or a large font. */
  inputClassName?: string;
  /** Ref to the input, e.g. for the initial focus of a dialog. */
  ref?: Ref<HTMLInputElement>;
};

const INPUT =
  'min-h-11 w-full rounded-temp-control border border-temp-border bg-temp-surface px-3 placeholder:text-temp-ink-muted data-invalid:border-temp-danger';

/**
 * Labelled input of a Base UI `Form`; shows client and server errors below the input,
 * linked via `aria-describedby` and `aria-invalid`.
 * @example <TextField name="password" label="Passwort" type="password" autoComplete="current-password" required />
 */
export function TextField({
  name,
  label,
  hideLabel = false,
  layout = 'stacked',
  type = 'text',
  multiline = false,
  required = false,
  prefix,
  suffix,
  description,
  onValueChange,
  inputClassName = '',
  ...inputProps
}: TextFieldProps): ReactElement {
  const row = layout === 'row';
  return (
    <Field.Root
      name={name}
      className={row ? 'grid gap-x-8 gap-y-1 sm:grid-cols-[12rem_1fr]' : 'flex flex-col gap-1'}
    >
      <Field.Label className={hideLabel ? 'sr-only' : `font-medium ${row ? 'sm:pt-2.5' : ''}`}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </Field.Label>
      <div className="flex flex-col gap-1 sm:col-start-2">
        <div className="flex items-center gap-2">
          {prefix}
          <Field.Control
            type={multiline ? undefined : type}
            required={required}
            onValueChange={onValueChange}
            render={multiline ? <textarea rows={3} /> : undefined}
            className={`${INPUT} ${multiline ? 'py-2' : ''} ${inputClassName}`}
            {...inputProps}
          />
          {suffix}
        </div>
        {description && (
          <Field.Description className="text-sm text-temp-ink-muted">
            {description}
          </Field.Description>
        )}
        <Field.Error className="text-sm text-temp-danger" />
      </div>
    </Field.Root>
  );
}
