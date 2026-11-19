import { type RefObject, useEffect, useRef, useState } from 'react';
import { nameFromEmail, passwordCharsLeft } from './useSetupRecoveryPrototype';
import { useSetupText } from './useSetupText';

/**
 * `suggested`: optional, prefilled from the e-mail until edited. `derived`: no field, taken
 * from the e-mail. `required`: plain required field. `none`: the reset form has no name.
 */
export type NameMode = 'suggested' | 'derived' | 'required' | 'none';

/** `toggle`: checkbox "Passwort anzeigen". `repeat`: second field. `eye`: icon in the field. */
export type PasswordMode = 'toggle' | 'repeat' | 'eye';

type Options = {
  nameMode: NameMode;
  passwordMode: PasswordMode;
  /** Called with the checked values. */
  onSubmit: (values: { email: string; name: string }) => void;
};

type CredentialsForm = {
  formRef: RefObject<HTMLFormElement | null>;
  email: string;
  /** Shown name: the typed one, or the suggestion while the field was not edited. */
  name: string;
  /** The name field still holds the suggestion from the e-mail. */
  nameSuggested: boolean;
  password: string;
  repeat: string;
  visible: boolean;
  charsLeft: number;
  errors: Record<string, string>;
  handleEmailChange: (value: string) => void;
  handleNameChange: (value: string) => void;
  handlePasswordChange: (value: string) => void;
  handleRepeatChange: (value: string) => void;
  handleVisibleChange: (visible: boolean) => void;
  handleSubmit: () => void;
};

/** PROTOTYPE: state and checks of the setup and reset forms in their field variants. */
export function useCredentialsForm({ nameMode, passwordMode, onSubmit }: Options): CredentialsForm {
  const t = useSetupText().form;
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState('');
  const [typedName, setTypedName] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const [first] = Object.keys(errors);
    if (first === undefined) return;
    formRef.current?.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"]`)?.focus();
  }, [errors]);

  const suggestion = nameMode === 'suggested' || nameMode === 'derived' ? nameFromEmail(email) : '';
  const name = typedName ?? suggestion;
  const charsLeft = passwordCharsLeft(password);

  function handleSubmit(): void {
    const next: Record<string, string> = {};
    if (nameMode !== 'none' && !/^\S+@\S+$/.test(email.trim())) next.email = t.errorEmail;
    if (nameMode === 'required' && name.trim() === '') next.name = t.errorName;
    if (charsLeft > 0) next.password = t.errorShort(charsLeft);
    else if (passwordMode === 'repeat' && repeat !== password) next.repeat = t.errorRepeat;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    // An empty optional name falls back to the e-mail, so columns and filters stay readable
    onSubmit({ email: email.trim(), name: name.trim() || email.trim() });
  }

  return {
    formRef,
    email,
    name,
    nameSuggested: typedName === null && suggestion !== '',
    password,
    repeat,
    visible,
    charsLeft,
    errors,
    handleEmailChange: setEmail,
    handleNameChange: setTypedName,
    handlePasswordChange: setPassword,
    handleRepeatChange: setRepeat,
    handleVisibleChange: setVisible,
    handleSubmit,
  };
}
