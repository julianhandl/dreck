# Keyboard and gestures

## Time screen

These shortcuts work on the **Time** screen while no dialog is open and the cursor is not in a text field. They ignore `Ctrl`, `Alt` and `Cmd` combinations, so browser shortcuts keep working.

| Key | Action |
|---|---|
| `N` | New time entry |
| `←` / `→` | Previous / next day |
| `↓` / `↑` | Select the next / previous time entry of the day. Without a selection, `↓` starts at the first entry and `↑` at the last. |
| `Space` | Start or stop the selected time entry. Start works only on entries of today. While a timer is [forgotten](time-tracking.md#forgotten-timers), it asks when you stopped first. |
| `E` | Edit the selected time entry |

`Space` acts on the selected row itself. If a button inside the row has the focus (for example after pressing `Tab`), `Space` presses that button as usual.

## Time entry dialog

| Key | Action |
|---|---|
| `Enter` | Save the entry, or start the timer. Works from every field, including the project picker. |
| `Esc` | Close the dialog without saving |
| `Tab` | Next field: project, description, duration, date, and when editing the folded hourly rate (`Space` or `Enter` opens it) |

When the dialog opens, the focus is on the project picker for a new entry and on the duration for an existing one. After closing, the focus returns to the row you came from, so `↓`, `Space` and `E` continue where you left off.

In the project picker, type to filter and use `↑`/`↓` to choose.

## Other dialogs

`Esc` closes any dialog. Clicking outside closes it too.

## Touch gestures

On a touch screen, swipe left or right to switch to the next or previous screen in the navigation order: Time, Expenses, Projects, Reports, Settings.

A swipe is ignored inside text fields, dialogs, open pickers and areas that scroll sideways (wide tables), and when the movement is slow or mostly vertical.
