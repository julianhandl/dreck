import type { Customer } from '@dreck/shared/api/customers';
import type { Expense } from '@dreck/shared/api/expenses';
import type { UpdateSettings } from '@dreck/shared/api/settings';
import type { Language } from '@dreck/shared/i18n';
import type { RoundingMinutes } from '@dreck/shared/report';
import { useState } from 'react';
import { api } from '@/api/api-client';
import { useQuery } from '@/api/useQuery';
import { formatPercentInput, parsePercent } from '@/format/decimal';
import { formatAmountInput, parseAmount } from '@/format/money';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';

export type SettingsPage = {
  language: Language;
  timezone: string;
  deviceTimezone: string;
  currency: string;
  /** Customers or Expenses exist; the API refuses a new currency. */
  currencyLocked: boolean;
  defaultRate: string;
  rounding: string;
  invoicing: Record<InvoicingField, string>;
  saved: boolean;
  submit: Submit<null>;
  logout: Submit<null>;
  handleLanguageChange: (value: Language) => void;
  handleTimezoneChange: (value: string) => void;
  handleCurrencyChange: (value: string) => void;
  handleDefaultRateChange: (value: string) => void;
  handleRoundingChange: (value: string) => void;
  handleInvoicingChange: (field: InvoicingField) => (value: string) => void;
};

/** Text settings for Invoices; the tax is edited as percent. */
export type InvoicingField =
  | 'senderName'
  | 'senderAddress'
  | 'senderVatId'
  | 'defaultTax'
  | 'defaultInvoiceNotes';

/** Form state of the settings screen plus logout. */
export function useSettingsPage(): SettingsPage {
  const settings = useSettings();
  const { messages } = useI18n();
  const customers = useQuery<Customer[]>('/customers');
  const expenses = useQuery<Expense[]>('/expenses');
  const currencyLocked =
    (customers.status === 'ready' && customers.data.length > 0) ||
    (expenses.status === 'ready' && expenses.data.length > 0);

  const [language, setLanguage] = useState(settings.language);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [currency, setCurrency] = useState(settings.currency);
  const [defaultRate, setDefaultRate] = useState(() =>
    formatAmountInput(settings.defaultHourlyRateMinor, settings.currency, settings.language),
  );
  const [rounding, setRounding] = useState(String(settings.roundingMinutes));
  const [invoicing, setInvoicing] = useState<Record<InvoicingField, string>>(() => ({
    senderName: settings.senderName ?? '',
    senderAddress: settings.senderAddress ?? '',
    senderVatId: settings.senderVatId ?? '',
    defaultTax: formatPercentInput(settings.defaultTaxBasisPoints, settings.language),
    defaultInvoiceNotes: settings.defaultInvoiceNotes ?? '',
  }));
  const [saved, setSaved] = useState(false);

  function changes(): UpdateSettings {
    const body: UpdateSettings = {};
    const rateMinor = parseAmount(defaultRate, currency);
    if (language !== settings.language) body.language = language;
    if (timezone !== settings.timezone) body.timezone = timezone;
    if (currency !== settings.currency) body.currency = currency;
    if (rateMinor !== null && rateMinor !== settings.defaultHourlyRateMinor) {
      body.defaultHourlyRateMinor = rateMinor;
    }
    if (Number(rounding) !== settings.roundingMinutes)
      body.roundingMinutes = Number(rounding) as RoundingMinutes;
    for (const key of [
      'senderName',
      'senderAddress',
      'senderVatId',
      'defaultInvoiceNotes',
    ] as const) {
      const value = invoicing[key].trim() || null;
      if (value !== settings[key]) body[key] = value;
    }
    const tax = parsePercent(invoicing.defaultTax);
    if (tax !== null && tax !== settings.defaultTaxBasisPoints) body.defaultTaxBasisPoints = tax;
    return body;
  }

  const submit = useSubmit(
    async () => {
      const body = changes();
      if (Object.keys(body).length > 0) await api.patch('/settings', body);
      setSaved(true);
    },
    {
      validate: (): Record<string, string> => {
        const errors: Record<string, string> = {};
        if (parseAmount(defaultRate, currency) === null) {
          errors.defaultHourlyRateMinor = messages.expenses.errors.amount;
        }
        if (parsePercent(invoicing.defaultTax) === null) {
          errors.defaultTax = messages.settings.percentError;
        }
        return errors;
      },
      fields: { currency_locked: 'currency' },
    },
  );

  const logout = useSubmit(async () => {
    await api.post('/auth/logout');
    window.location.reload();
  });

  // Any edit hides "Gespeichert."
  function edit<T>(setter: (value: T) => void): (value: T) => void {
    return (value) => {
      setSaved(false);
      setter(value);
    };
  }

  return {
    language,
    timezone,
    deviceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency,
    currencyLocked,
    defaultRate,
    rounding,
    invoicing,
    saved,
    submit,
    logout,
    handleLanguageChange: edit(setLanguage),
    handleTimezoneChange: edit(setTimezone),
    handleCurrencyChange: edit((value: string) => setCurrency(value.trim().toUpperCase())),
    handleDefaultRateChange: edit(setDefaultRate),
    handleRoundingChange: edit(setRounding),
    handleInvoicingChange: (field) =>
      edit((value: string) => setInvoicing((current) => ({ ...current, [field]: value }))),
  };
}
