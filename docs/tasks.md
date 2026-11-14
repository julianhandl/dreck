# Tasks

A task splits a project into kinds of work, e.g. *Design*, *Development* and *Project management*. The description of a time entry still says what happened; the task says which part of the project it belongs to.

## Default tasks

**Settings → Tasks** holds the default tasks: a name and whether the task is billable.

- A **new project** starts with a copy of the default tasks. On **New project** they are already listed and can be changed, removed or extended before saving.
- Changing the default tasks later affects only projects created afterwards. Existing projects keep their tasks.

## Tasks of a project

**Edit project → Tasks** lists the project's tasks.

- **Add task** adds a row. Rows left without a name are ignored when saving.
- **Billable:** time on a non-billable task counts as hours, but not as an amount and never ends up on an invoice. Examples: acquisition, internal meetings.
- **Own hourly rate** (billable tasks only): replaces the project's rate for time entries of this task. Empty means "as project".
- **Remove:** a task without time entries is deleted. A task with time entries is archived instead: it disappears from the task selection, keeps its time entries and shows up again with **Restore**.
- Task names are unique within a project, ignoring case.

## Time entries with a task

The time entry dialog shows a **Task** field once the chosen project has tasks. The task is optional; **No task** is billable and uses the project's rate.

- The entry takes over the task's own rate, otherwise the project's, see [Hourly rates](hourly-rates.md).
- Moving an entry to another project removes its task, because tasks belong to their project.
- The **Time** screen shows the task next to the project, the project page lists it in its own column.

## Billable or not

Billable is read from the task at any time, not copied into the time entry. Switching a task to non-billable therefore changes past reports too. Invoiced time entries stay on their invoice.

## Through the API

- `GET /api/v1/projects` returns each project with `tasks`.
- `POST /api/v1/projects` takes `tasks`; without it the default tasks are copied.
- `PATCH /api/v1/projects/:id` with `tasks` replaces the list: tasks with `id` change, tasks without `id` are new, missing ones are deleted or archived.
- `PATCH /api/v1/settings` with `defaultTasks` replaces the default tasks.
- Time entries and `POST /api/v1/timer/start` take an optional `taskId`.
