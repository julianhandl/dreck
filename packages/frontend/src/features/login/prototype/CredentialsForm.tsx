import { Form } from '@base-ui/react/form';
import type { ReactElement, ReactNode } from 'react';
import { CheckboxField } from '@/forms/CheckboxField';
import { TextField } from '@/forms/TextField';
import { Button } from '@/ui/Button';
import { type NameMode, type PasswordMode, useCredentialsForm } from './useCredentialsForm';
import { useSetupText } from './useSetupText';

type CredentialsFormProps = {
  /** How the name is asked for; `none` for the reset form, which has no e-mail either. */
  nameMode: NameMode;
  /** How the password can be checked: checkbox, second field or eye icon. */
  passwordMode: PasswordMode;
  /** Text of the submit button. */
  submitLabel: string;
  /** Called with the checked values. */
  onSubmit: (values: { email: string; name: string }) => void;
  /** Note above the submit button, e.g. that other sessions end. */
  footnote?: ReactNode;
};

function EyeIcon({ off }: { off: boolean }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.25em"
      height="1.25em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

/**
 * PROTOTYPE: e-mail, name and password of the setup form (or only the password of the reset
 * form) in the field variant under test; the rule is 15 characters, no composition rules.
 * @example <CredentialsForm nameMode="suggested" passwordMode="toggle" submitLabel="Los" onSubmit={save} />
 */
export function CredentialsForm({
  nameMode,
  passwordMode,
  submitLabel,
  onSubmit,
  footnote,
}: CredentialsFormProps): ReactElement {
  const t = useSetupText().form;
  const form = useCredentialsForm({ nameMode, passwordMode, onSubmit });
  const passwordType = form.visible ? 'text' : 'password';
  const counter = form.charsLeft > 0 ? t.passwordLeft(form.charsLeft) : t.passwordOk;

  return (
    <Form
      ref={form.formRef}
      errors={form.errors}
      onFormSubmit={form.handleSubmit}
      className="flex flex-col gap-5"
    >
      {nameMode !== 'none' && (
        <TextField
          name="email"
          label={t.email}
          type="email"
          autoComplete="username"
          description={t.emailHint}
          required
          value={form.email}
          onValueChange={form.handleEmailChange}
        />
      )}
      {nameMode === 'derived' && form.name !== '' && (
        <p className="-mt-3 text-sm text-temp-ink-muted">{t.nameDerived(form.name)}</p>
      )}
      {(nameMode === 'suggested' || nameMode === 'required') && (
        <TextField
          name="name"
          label={nameMode === 'suggested' ? t.nameOptional : t.name}
          autoComplete="name"
          required={nameMode === 'required'}
          description={form.nameSuggested ? t.nameSuggested : t.nameHint}
          value={form.name}
          onValueChange={form.handleNameChange}
        />
      )}
      <div className="flex flex-col gap-2">
        <TextField
          name="password"
          label={nameMode === 'none' ? t.passwordNew : t.password}
          type={passwordType}
          autoComplete="new-password"
          required
          description={`${t.passwordRule} ${passwordMode === 'repeat' ? '' : counter}`}
          value={form.password}
          onValueChange={form.handlePasswordChange}
          suffix={
            passwordMode === 'eye' ? (
              <Button
                size="icon"
                variant="ghost"
                aria-pressed={form.visible}
                aria-label={t.showPassword}
                onClick={() => form.handleVisibleChange(!form.visible)}
              >
                <EyeIcon off={form.visible} />
              </Button>
            ) : undefined
          }
        />
        {passwordMode === 'toggle' && (
          <CheckboxField
            label={t.showPassword}
            checked={form.visible}
            onCheckedChange={form.handleVisibleChange}
          />
        )}
      </div>
      {passwordMode === 'repeat' && (
        <TextField
          name="repeat"
          label={t.passwordRepeat}
          type="password"
          autoComplete="new-password"
          required
          value={form.repeat}
          onValueChange={form.handleRepeatChange}
        />
      )}
      {footnote}
      <div>
        <Button variant="primary" type="submit">
          {submitLabel}
        </Button>
      </div>
    </Form>
  );
}
