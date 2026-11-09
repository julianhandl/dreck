import type { Customer } from '@dreck/shared/api/customers';
import type { Language } from '@dreck/shared/i18n';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/api/api-client';
import { formatAmountInput, parseAmount } from '@/format/money';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { browserLanguage } from '@/i18n/browser-language';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';

export type Onboarding = {
  currency: string;
  defaultRate: string;
  customerName: string;
  projectName: string;
  language: Language;
  timezone: string;
  submit: Submit<null>;
  handleCurrencyChange: (value: string) => void;
  handleDefaultRateChange: (value: string) => void;
  handleCustomerNameChange: (value: string) => void;
  handleProjectNameChange: (value: string) => void;
  handleLanguageChange: (value: Language) => void;
  handleTimezoneChange: (value: string) => void;
};

/**
 * Form state of the onboarding: Settings, the first Customer and its first Project in one go.
 * Creating the Customer ends the onboarding; there is no flag.
 */
export function useOnboarding(): Onboarding {
  const settings = useSettings();
  const { messages, language: uiLanguage } = useI18n();
  const navigate = useNavigate();
  const [currency, setCurrency] = useState(settings.currency);
  const [defaultRate, setDefaultRate] = useState(() =>
    formatAmountInput(settings.defaultHourlyRateMinor, settings.currency, uiLanguage),
  );
  const [customerName, setCustomerName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [language, setLanguage] = useState(browserLanguage);
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  // "Erneut versuchen" after a failed Project must not create the Customer twice
  const createdCustomer = useRef<Customer | null>(null);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (parseAmount(defaultRate, currency) === null)
      errors.defaultHourlyRateMinor = messages.expenses.errors.amount;
    if (customerName.trim() === '') errors.name = messages.projects.form.errors.nameRequired;
    if (projectName.trim() === '') errors.projectName = messages.projects.form.errors.nameRequired;
    return errors;
  }

  const submit = useSubmit(
    async () => {
      // The Customer copies the Default Hourly Rate, so the Settings go first
      await api.patch('/settings', {
        currency,
        defaultHourlyRateMinor: parseAmount(defaultRate, currency),
        language,
        timezone,
      });
      createdCustomer.current ??= await api.post<Customer>('/customers', {
        name: customerName.trim(),
      });
      await api.post('/projects', {
        customerId: createdCustomer.current.id,
        name: projectName.trim(),
      });
      navigate('/');
    },
    { validate },
  );

  return {
    currency,
    defaultRate,
    customerName,
    projectName,
    language,
    timezone,
    submit,
    handleCurrencyChange: (value) => setCurrency(value.trim().toUpperCase()),
    handleDefaultRateChange: setDefaultRate,
    handleCustomerNameChange: setCustomerName,
    handleProjectNameChange: setProjectName,
    handleLanguageChange: setLanguage,
    handleTimezoneChange: setTimezone,
  };
}
