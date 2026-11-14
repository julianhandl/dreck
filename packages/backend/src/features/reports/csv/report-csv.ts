import { messages } from '@dreck/shared/i18n';
import { currencyFractionDigits, minorToMajor } from '@dreck/shared/money';
import type { ReportLine } from '@/features/reports/reports.service';
import type { Settings } from '@/features/settings/settings.service';

/**
 * CSV with one row per Time Entry and Expense, in the instance language: `de` uses `;` and a
 * decimal comma, `en` uses `,` and a decimal point. Amounts in the major unit. UTF-8 with BOM.
 */
export function reportCsv(
  lines: ReportLine[],
  { currency, language }: Pick<Settings, 'currency' | 'language'>,
): string {
  const t = messages[language].csv;
  const separator = language === 'de' ? ';' : ',';
  const digits = currencyFractionDigits(currency);
  const money = new Intl.NumberFormat(language, {
    useGrouping: false,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const minutes = new Intl.NumberFormat(language, { useGrouping: false, maximumFractionDigits: 2 });
  const major = (minor: number): string => money.format(minorToMajor(minor, currency));

  const header = Object.values(t.columns);
  const rows = lines.map((line) => [
    t.types[line.type],
    line.customer.name,
    line.project.name,
    line.task ?? '',
    line.date,
    line.type === 'timeEntry' ? minutes.format(line.roundedSeconds / 60) : '',
    line.description ?? '',
    line.hourlyRateMinor === null ? '' : major(line.hourlyRateMinor),
    major(line.amountMinor),
    line.billable ? t.yes : t.no,
  ]);

  const csv = [header, ...rows].map((row) => row.map(quoteField).join(separator)).join('\r\n');
  return `﻿${csv}\r\n`;
}

function quoteField(value: string): string {
  return /[",;\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
