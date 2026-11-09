# Reports and rounding

## Rounding

Rounding is one setting for the whole instance: none (exact), 5, 6, 10, 15, 30 or 60 minutes. Default is none.

**Every time entry is rounded up on its own.** Three entries of 7 minutes at 15-minute rounding count as 3 × 15 = 45 minutes, not as 21 minutes rounded to 30. If you want fewer rounding steps, keep fewer, longer entries (continue an entry with ▶ instead of starting a new timer).

**Only full minutes count.** Seconds of a started minute are dropped before rounding up. A duration that sits exactly on a rounding step stays there until the next full minute:

| Rounding | Exact duration | Counts as |
|---|---|---|
| 15 min | 0:00:40 | 0 min |
| 15 min | 0:01:00 | 15 min |
| 15 min | 0:15:59 | 15 min |
| 15 min | 0:16:00 | 30 min |
| 6 min | 0:06:59 | 6 min |
| 6 min | 0:07:00 | 12 min |

**Rounding is retroactive.** Dreck always stores the exact duration and rounds only when it shows or calculates. Changing the setting immediately changes every report, past ones included. If you need fixed numbers for an invoice you already sent, export the CSV at that time.

Rounded durations appear on the **Time** screen below the exact duration, on project pages and in reports. Amounts are always calculated from the rounded duration, see [Hourly rates](hourly-rates.md#how-amounts-are-calculated).

## The Report screen

- **Period:** week, month (default), quarter, year or custom. The arrows move to the previous or next period. Both the first and the last day are included.
- **Filters:** customer and project. Period and filters are part of the URL, so a bookmark brings back the same report.
- **Grouping:** by customer, and below each customer by project.
- **Archived** customers and projects are included.
- **A running timer** counts up to now.

| Figure | Meaning |
|---|---|
| **Hours (rounded)** | Sum of rounded durations. **Exact** shows the sum of the exact durations next to it. |
| **Time** | Sum of the amounts of all time entries. |
| **Billable expenses** | Expenses marked billable. |
| **Own costs** | Expenses not marked billable. They are not part of "To invoice". |
| **To invoice** | Time + billable expenses. |

## CSV export

**Export CSV** downloads the report with the same period and filters as `dreck-report_<from>_<to>.csv`.

- One row per time entry and per expense, not per project.
- Columns: Type, Customer, Project, Date, Rounded duration (minutes), Description, Hourly rate, Amount, Billable.
- Duration, hourly rate and billable are empty where they do not apply (duration and rate for expenses, billable for time entries).
- Amounts are in the main unit of the currency (`12.50`, not `1250`).
- The format follows the language in Settings:

| Language | Column separator | Decimal separator | Column names |
|---|---|---|---|
| English | `,` | `.` | English |
| German | `;` | `,` | German |

- The file is UTF-8 with a byte order mark, so Excel opens umlauts correctly.

The same export is available through the API: `GET /api/v1/reports?from=…&to=…&format=csv`.
