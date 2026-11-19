import { useState } from 'react';
import { useSetupText } from './useSetupText';

type PasteLink = {
  value: string;
  errors: Record<string, string>;
  handleValueChange: (value: string) => void;
  handleSubmit: () => void;
};

/** PROTOTYPE: field "Link aus dem Log"; opens a pasted setup or reset link on this host. */
export function usePasteLink(onOpenLink: (link: string) => boolean): PasteLink {
  const t = useSetupText().setup;
  const [value, setValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  return {
    value,
    errors,
    handleValueChange: setValue,
    handleSubmit: () => setErrors(onOpenLink(value) ? {} : { link: t.pasteInvalid }),
  };
}
