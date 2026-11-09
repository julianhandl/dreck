import { Form } from '@base-ui/react/form';
import { LANGUAGES } from '@dreck/shared/i18n';
import { type ReactElement, useId } from 'react';
import { currencySymbol } from '@/format/money';
import { FormStatus } from '@/forms/FormStatus';
import { TextField } from '@/forms/TextField';
import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/ui/Button';
import { Page, PageTitle } from '@/ui/Page';
import { Select } from '@/ui/Select';
import { useOnboarding } from './useOnboarding';

const TIME_ZONES = Intl.supportedValuesOf('timeZone');

/**
 * First screen of a fresh instance: currency, Default Hourly Rate, the first Customer and
 * Project; language and time zone folded away, prefilled from the browser. "Loslegen" saves
 * everything and opens the time screen.
 * @example <OnboardingPage />
 */
export function OnboardingPage(): ReactElement {
  const { language, messages } = useI18n();
  const onboarding = useOnboarding();
  const { submit } = onboarding;
  const zonesId = useId();
  const t = messages.onboarding;

  return (
    <Page>
      <PageTitle>{t.title}</PageTitle>
      <p className="text-lg">{t.intro}</p>
      <Form
        ref={submit.formRef}
        errors={submit.errors}
        onFormSubmit={() => submit.handleSubmit(null)}
        className="flex max-w-xl flex-col gap-5"
      >
        <TextField
          name="name"
          label={t.customer}
          description={t.customerHint}
          autoComplete="organization"
          required
          value={onboarding.customerName}
          onValueChange={onboarding.handleCustomerNameChange}
        />
        <TextField
          name="projectName"
          label={t.project}
          autoComplete="off"
          required
          value={onboarding.projectName}
          onValueChange={onboarding.handleProjectNameChange}
        />
        <div className="flex flex-wrap gap-5">
          <TextField
            name="currency"
            label={messages.settings.currency}
            description={t.currencyHint}
            autoComplete="off"
            value={onboarding.currency}
            onValueChange={onboarding.handleCurrencyChange}
            inputClassName="max-w-28 uppercase"
          />
          <TextField
            name="defaultHourlyRateMinor"
            label={messages.settings.defaultRate}
            description={messages.settings.defaultRateHint}
            inputMode="decimal"
            autoComplete="off"
            prefix={<span>{currencySymbol(onboarding.currency || 'EUR', language)}</span>}
            suffix={<span className="whitespace-nowrap">{messages.common.perHour}</span>}
            value={onboarding.defaultRate}
            onValueChange={onboarding.handleDefaultRateChange}
            inputClassName="max-w-40"
          />
        </div>
        <details className="rounded-temp-card border border-temp-divider px-5 py-3">
          <summary className="cursor-pointer font-medium">{t.more}</summary>
          <div className="flex flex-col gap-5 pt-4 pb-2">
            <Select
              name="language"
              label={messages.settings.language}
              value={onboarding.language}
              options={LANGUAGES.map((l) => ({ value: l, label: messages.settings.languages[l] }))}
              onValueChange={onboarding.handleLanguageChange}
            />
            <TextField
              name="timezone"
              label={messages.settings.timezone}
              list={zonesId}
              autoComplete="off"
              value={onboarding.timezone}
              onValueChange={onboarding.handleTimezoneChange}
              inputClassName="max-w-md"
            />
            <datalist id={zonesId}>
              {TIME_ZONES.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
          </div>
        </details>
        <FormStatus submit={submit} />
        <div>
          <Button variant="primary" type="submit" aria-disabled={submit.pending}>
            {t.start}
          </Button>
        </div>
      </Form>
    </Page>
  );
}
