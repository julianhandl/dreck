# Getting started

This guide walks you from a fresh instance to your first tracked hour. It assumes Dreck already runs, see the [README](../README.md) for installation.

## 1. Sign in

Open Dreck in the browser and paste the secret from the container log as the password. The session lasts 90 days. When it expires, Dreck shows the sign-in dialog on top of the current page; whatever you were typing stays, and the action runs again after you sign in.

After 10 failed attempts within a minute, Dreck blocks further attempts for a short time. The limit is global, not per device.

Dreck only works over HTTPS, except on `localhost` and `127.0.0.1`. Over plain HTTP on any other address, the sign-in dialog says so instead of asking for the password.

## 2. Settings, more customers and projects

**Settings** holds the default hourly rate, rounding, time zone and language, all changeable at any time. Its second page, **Tasks**, holds the [default tasks](tasks.md) new projects start with:

- Changing the **default hourly rate** affects only customers created afterwards.
- **Rounding** applies retroactively, see [Reports and rounding](reports.md#rounding).
- If your device uses another **time zone** than the instance, Settings offers to take it over.

More customers and projects are created under **Projects**: **New customer** prefills the default hourly rate, and after saving Dreck opens **New project** for that customer with the customer's rate prefilled.

Rates are copied, not linked. How that works and what happens when you change a rate later is described in [Hourly rates](hourly-rates.md).

## 3. Track time

Open **Time** and choose **Track time** (or press `N`).

- **Today, without a duration:** the button reads **Start timer**. The new timer stops the one that is running.
- **With a duration**, or on an earlier day: the button reads **Save entry**.

Details on the timer, durations and editing are in [Tracking time](time-tracking.md). For the keyboard, see [Keyboard and gestures](keyboard.md).

## 4 Track expenses

Open **Expenses** and choose **Track expense**. An expense has a date, a project, a description and an amount greater than 0.

- **Billable** means you pass the expense on to the customer. Unchecked, it counts as your own costs. Reports show both separately.
- The form starts with today's date, the project of your latest expense (unless it is archived) and the billable flag you last used on that project.
- Amounts are read tolerantly: `12,50`, `12.5`, `1.234,50` and `1,234.50` all work. A single separator followed by exactly three digits groups thousands (`1.234` is 1234).
- There are no negative amounts or credits.

## 5. Look at the numbers

**Reports** shows hours, amounts and expenses for a period, grouped by customer and project, and exports them as CSV. See [Reports and rounding](reports.md).

Each project also has a detail page (click it under **Projects**) with its hours per week, totals, time entries and expenses over all time.

## Archiving and deleting

| | Archive | Delete |
|---|---|---|
| **Customer** | Disappears from pickers together with all its projects. Stays in reports. | Only while it has no projects. |
| **Project** | Disappears from pickers. Stays in reports and on its detail page. | Only while it has no time entries and expenses. |
| **Time entry, expense** | – | Always, directly. |

Archiving a customer hides its projects without changing them. Restore the customer, and each project is back in the state it had before: a project you archived yourself stays archived.

Names are unique, ignoring case: two customers cannot share a name, and neither can two projects of the same customer.

## Using Dreck on the phone

Dreck has the same screens on mobile. Add it to the home screen from the browser's share menu to open it like an app. Swipe left or right to switch between screens, see [Keyboard and gestures](keyboard.md#touch-gestures).