import { Form } from '@base-ui/react/form';
import { LANGUAGES } from '@dreck/shared/i18n';
import { ROUNDING_MINUTES } from '@dreck/shared/report';
import { type ReactElement, useId } from 'react';
import { currencySymbol } from '@/format/money';
import { FormStatus } from '@/forms/FormStatus';
import { TextField } from '@/forms/TextField';
import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/ui/Button';
import { Page, PageTitle } from '@/ui/Page';
import { Select } from '@/ui/Select';
import { useSettingsPage } from './useSettingsPage';

const TIME_ZONES = Intl.supportedValuesOf('timeZone');

/**
 * Settings screen in the two-column form layout: language, time zone, currency, Default
 * Hourly Rate, Rounding; below backup and logout.
 * @example <Route path="settings" element={<SettingsPage />} />
 */
export function SettingsPage(): ReactElement {
  const { language, messages } = useI18n();
  const page = useSettingsPage();
  const { submit } = page;
  const zonesId = useId();
  const t = messages.settings;

  return (
    <Page>
      <PageTitle>{messages.nav.settings}</PageTitle>
      <Form
        ref={submit.formRef}
        errors={submit.errors}
        onFormSubmit={() => submit.handleSubmit(null)}
        className="flex flex-col gap-6 border-temp-divider border-t pt-6"
      >
        <Select
          name="language"
          layout="row"
          label={t.language}
          value={page.language}
          options={LANGUAGES.map((l) => ({ value: l, label: t.languages[l] }))}
          onValueChange={page.handleLanguageChange}
        />
        <div className="flex flex-col gap-2">
          <TextField
            name="timezone"
            layout="row"
            label={t.timezone}
            list={zonesId}
            autoComplete="off"
            value={page.timezone}
            onValueChange={page.handleTimezoneChange}
            inputClassName="max-w-md"
          />
          <datalist id={zonesId}>
            {TIME_ZONES.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
          {page.timezone !== page.deviceTimezone && (
            <div className="sm:pl-56">
              <Button size="sm" onClick={() => page.handleTimezoneChange(page.deviceTimezone)}>
                {t.deviceTimezone(page.deviceTimezone)}
              </Button>
            </div>
          )}
        </div>
        <TextField
          name="currency"
          layout="row"
          label={t.currency}
          description={page.currencyLocked ? t.currencyLocked : t.currencyHint}
          disabled={page.currencyLocked}
          autoComplete="off"
          value={page.currency}
          onValueChange={page.handleCurrencyChange}
          inputClassName="max-w-28 uppercase disabled:bg-temp-band"
        />
        <TextField
          name="defaultHourlyRateMinor"
          layout="row"
          label={t.defaultRate}
          description={t.defaultRateHint}
          inputMode="decimal"
          autoComplete="off"
          prefix={<span>{currencySymbol(page.currency || 'EUR', language)}</span>}
          suffix={<span className="whitespace-nowrap">{messages.common.perHour}</span>}
          value={page.defaultRate}
          onValueChange={page.handleDefaultRateChange}
          inputClassName="max-w-40"
        />
        <div className="flex flex-col gap-1">
          <Select
            name="roundingMinutes"
            layout="row"
            label={t.rounding}
            value={page.rounding}
            options={ROUNDING_MINUTES.map((m) => ({
              value: String(m),
              label: m === 0 ? t.roundingExact : t.roundingMinutes(m),
            }))}
            onValueChange={page.handleRoundingChange}
          />
          <p className="text-sm text-temp-ink-muted sm:pl-56">{t.roundingHint}</p>
        </div>
        <FormStatus submit={submit} />
        <p role="status" className="font-medium text-temp-success empty:sr-only">
          {page.saved ? t.saved : ''}
        </p>
        <div className="border-temp-divider border-t pt-6">
          <Button variant="primary" type="submit" aria-disabled={submit.pending}>
            {t.save}
          </Button>
        </div>
      </Form>
      <section
        aria-labelledby="settings-data"
        className="grid gap-x-8 gap-y-3 border-temp-divider border-t pt-6 sm:grid-cols-[12rem_1fr]"
      >
        <h2 id="settings-data" className="font-medium">
          {t.data}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button as="a" href="/api/v1/backup" download>
            {t.backup}
          </Button>
          <Button
            aria-disabled={page.logout.pending}
            onClick={() => page.logout.handleSubmit(null)}
          >
            {t.logout}
          </Button>
        </div>
        <div className="sm:col-start-2">
          <FormStatus submit={page.logout} />
        </div>
      </section>
    </Page>
  );
}
