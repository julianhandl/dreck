# Invoicing

## Before the first invoice

- **Settings → Invoices:** your name, address and (optional) VAT ID appear as the sender on every invoice. The tax rate and the text below the invoice (bank details, a note on the small business exemption, …) are copied into each new invoice.
- **Customer → Address:** printed below the customer's name on new invoices. Put the customer's VAT ID there too if you need it (reverse charge).

Sender data is read live: changing your address also changes how older invoices print. Recipient, tax and notes are copied when the invoice is created and stay as they are.

## Creating an invoice

**Invoices → New invoice**, pick the customer and either

- **From tracked time and expenses:** choose all projects or one, the period, the grouping and whether billable expenses are included. Grouping is one item per project (and hourly rate), one per description (time entries with the same text are added up) or one per time entry. The preview lists the items exactly as they will appear on the invoice and updates with every change. Running timers and entries that round to 0:00 are skipped.
- **Empty invoice:** items are added by hand.

**Invoice** in the actions menu of a project (Projects) or on its page starts the same form with the project's customer and the project selected.

The period always starts as January 1 of the current year until today. With a single project selected, "one item per project" is disabled and the grouping defaults to one item per description.

Dreck creates a draft right away, numbered after the last invoice (`RE-2026-009` → `RE-2026-010`), dated today and due in 14 days, and opens it for editing.

Quantities are hours after [rounding](reports.md#rounding), rounded to two decimals. Without rounding the invoice can therefore differ from the report by a cent.

## Invoiced time entries and expenses

Everything taken over is **invoiced** and locked: it cannot be edited, deleted, continued with ▶ or given a new hourly rate. Time and Expenses mark it as "Invoiced".

To unlock, remove its item from the draft, or delete the draft. A second invoice for the same period only finds what is not invoiced yet.

## Editing a draft

Number, recipient, dates, service period, subject, tax, discount, items and the text below the invoice can all be changed while the invoice is a draft. Totals are calculated as:

```
item amount = round(quantity × unit price)
subtotal    = sum of item amounts
discount    = round(subtotal × discount %)
tax         = round((subtotal − discount) × tax %)
total       = subtotal − discount + tax
```

Every step rounds half up to the smallest unit of the currency.

## Status

| Status | Meaning |
|---|---|
| **Draft** | Can be changed and deleted. |
| **Sent** | Marked as sent. Content is locked. |
| **Late** | Sent and past the due date. |
| **Paid** | Payment recorded with its date. One full payment, no partial payments. |

**Back to draft** (in Actions) unlocks a sent or paid invoice and clears both dates. Dreck does not send emails; "Mark as sent" only records the date.

## PDF and printing

**Print / PDF** opens the browser's print dialog, which only prints the invoice itself. Choose "Save as PDF" as the printer to get a file. The page is A4 with its own margins, so leave paper size and margins on their defaults; the file name suggested is "Rechnung <number>" (in German).

## Overview

- **Open:** sent invoices not yet paid, with the overdue part and the total of drafts.
- **Paid in <year>:** invoices paid this year, by payment date.
- Tabs **Open** (drafts and sent) and **All**, filter by customer. Tab and filter are part of the URL.

## API

`GET /api/v1/invoices`, `POST /api/v1/invoices` (with `import` for tracked time), `PATCH /api/v1/invoices/:id`, `DELETE /api/v1/invoices/:id`. Amounts are in minor units, quantities in hundredths, tax and discount in basis points (2000 = 20 %). See `/api/v1/openapi.json`.
