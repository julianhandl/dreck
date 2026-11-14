import { beforeEach, describe, expect, test } from 'bun:test';
import type { Invoice } from '@dreck/shared/api/invoices';
import type { Project } from '@dreck/shared/api/projects';
import type { Report } from '@dreck/shared/api/reports';
import type { Task } from '@dreck/shared/api/tasks';
import type { TimeEntry } from '@dreck/shared/api/time-entries';
import { createTestApp } from '@/test/test-app';

let api: Awaited<ReturnType<typeof createTestApp>>;
let customerId: number;
beforeEach(async () => {
  api = await createTestApp();
  customerId = (
    await api.call<{ id: number }>('POST', '/customers', { name: 'Acme', hourlyRateMinor: 9000 })
  ).body.id;
});

const DEFAULTS = [
  { name: 'Design', billable: true },
  { name: 'Akquise', billable: false },
];

async function createProject(body: Record<string, unknown> = {}): Promise<Project> {
  const res = await api.call<Project>('POST', '/projects', { customerId, name: 'Web', ...body });
  expect(res.status).toBe(201);
  return res.body;
}

async function patchProject(id: number, body: Record<string, unknown>): Promise<Project> {
  const res = await api.call<Project>('PATCH', `/projects/${id}`, body);
  expect(res.status).toBe(200);
  return res.body;
}

function taskNamed(project: Project, name: string): Task {
  const task = project.tasks.find((t) => t.name === name);
  if (!task) throw new Error(`No task ${name}`);
  return task;
}

async function entry(projectId: number, taskId?: number, date = '2026-03-02'): Promise<TimeEntry> {
  const res = await api.call<TimeEntry>('POST', '/time-entries', {
    projectId,
    taskId,
    date,
    durationSeconds: 3600,
  });
  expect(res.status).toBe(201);
  return res.body;
}

async function rates(): Promise<Map<number, number>> {
  const res = await api.call<TimeEntry[]>('GET', '/time-entries');
  return new Map(res.body.map((e) => [e.id, e.hourlyRateMinor]));
}

describe('Default Tasks', () => {
  test('PATCH /settings replaces them, sorted by name; duplicate names fail', async () => {
    const res = await api.call('PATCH', '/settings', { defaultTasks: DEFAULTS });
    expect(res.body.defaultTasks).toEqual([DEFAULTS[1], DEFAULTS[0]]);
    const dup = await api.call('PATCH', '/settings', {
      defaultTasks: [
        { name: 'Design', billable: true },
        { name: 'design', billable: false },
      ],
    });
    expect(dup.status).toBe(400);
  });

  test('a new Project copies them; later changes affect only new Projects', async () => {
    await api.call('PATCH', '/settings', { defaultTasks: DEFAULTS });
    const project = await createProject();
    expect(
      project.tasks.map(({ name, billable, hourlyRateMinor, archived }) => ({
        name,
        billable,
        hourlyRateMinor,
        archived,
      })),
    ).toEqual([
      { name: 'Akquise', billable: false, hourlyRateMinor: null, archived: false },
      { name: 'Design', billable: true, hourlyRateMinor: null, archived: false },
    ]);
    await api.call('PATCH', '/settings', { defaultTasks: [] });
    const projects = await api.call<Project[]>('GET', '/projects');
    expect(projects.body[0]?.tasks).toHaveLength(2);
  });

  test('tasks sent with POST /projects replace them', async () => {
    await api.call('PATCH', '/settings', { defaultTasks: DEFAULTS });
    const project = await createProject({
      tasks: [{ name: 'Support', billable: true, hourlyRateMinor: 12000 }],
    });
    expect(project.tasks).toMatchObject([{ name: 'Support', hourlyRateMinor: 12000 }]);
  });
});

describe('Task list of a Project', () => {
  test('changes, adds, deletes unused and archives used Tasks', async () => {
    const project = await createProject({
      tasks: [
        { name: 'Design', billable: true },
        { name: 'Code', billable: true },
        { name: 'Calls', billable: true },
      ],
    });
    const calls = taskNamed(project, 'Calls');
    await entry(project.id, calls.id);

    const changed = await patchProject(project.id, {
      tasks: [
        { id: taskNamed(project, 'Design').id, name: 'UX', billable: true, hourlyRateMinor: 11000 },
        { name: 'Testing', billable: false },
      ],
    });
    expect(changed.tasks.map((t) => [t.name, t.archived])).toEqual([
      ['Calls', true],
      ['Testing', false],
      ['UX', false],
    ]);
    expect(taskNamed(changed, 'UX').hourlyRateMinor).toBe(11000);
  });

  test('rejects a Task of another Project and a rate on a non-billable Task', async () => {
    const other = await createProject({ name: 'App', tasks: [{ name: 'X', billable: true }] });
    const project = await createProject();
    const foreign = await api.call('PATCH', `/projects/${project.id}`, {
      tasks: [{ id: other.tasks[0]?.id, name: 'X', billable: true }],
    });
    expect(foreign.status).toBe(400);
    const rated = await api.call('PATCH', `/projects/${project.id}`, {
      tasks: [{ name: 'Y', billable: false, hourlyRateMinor: 100 }],
    });
    expect(rated.status).toBe(400);
  });

  test('a Project without Time Entries is deleted with its Tasks', async () => {
    const project = await createProject({ tasks: [{ name: 'X', billable: true }] });
    expect((await api.call('DELETE', `/projects/${project.id}`)).status).toBe(204);
  });
});

describe('Time Entries with a Task', () => {
  test('take the rate of the Task, without own rate the one of the Project', async () => {
    const project = await createProject({
      tasks: [
        { name: 'Support', billable: true, hourlyRateMinor: 12000 },
        { name: 'Design', billable: true },
      ],
    });
    expect((await entry(project.id, taskNamed(project, 'Support').id)).hourlyRateMinor).toBe(12000);
    expect((await entry(project.id, taskNamed(project, 'Design').id)).hourlyRateMinor).toBe(9000);
    const timer = await api.call<{ started: TimeEntry }>('POST', '/timer/start', {
      projectId: project.id,
      taskId: taskNamed(project, 'Support').id,
    });
    expect(timer.body.started).toMatchObject({ hourlyRateMinor: 12000 });
  });

  test('a Task of another Project fails at taskId', async () => {
    const other = await createProject({ name: 'App', tasks: [{ name: 'X', billable: true }] });
    const project = await createProject();
    const res = await api.call<{ details: { issues: { path: string[] }[] } }>(
      'POST',
      '/time-entries',
      {
        projectId: project.id,
        taskId: other.tasks[0]?.id,
        date: '2026-03-02',
        durationSeconds: 60,
      },
    );
    expect(res.status).toBe(400);
    expect(res.body.details.issues[0]?.path).toEqual(['taskId']);
  });

  test('changing the Task brings its rate; moving the Project drops the Task', async () => {
    const project = await createProject({
      tasks: [{ name: 'Support', billable: true, hourlyRateMinor: 12000 }],
    });
    const other = await createProject({ name: 'App', hourlyRateMinor: 5000 });
    const created = await entry(project.id);
    const support = taskNamed(project, 'Support').id;
    const withTask = await api.call<TimeEntry>('PATCH', `/time-entries/${created.id}`, {
      taskId: support,
    });
    expect(withTask.body).toMatchObject({ taskId: support, hourlyRateMinor: 12000 });
    const moved = await api.call<TimeEntry>('PATCH', `/time-entries/${created.id}`, {
      projectId: other.id,
    });
    expect(moved.body).toMatchObject({ projectId: other.id, taskId: null, hourlyRateMinor: 5000 });
  });
});

describe('Hourly Rate changes with Tasks', () => {
  async function setup(): Promise<{
    project: Project;
    ids: { none: number; support: number; design: number };
  }> {
    const project = await createProject({
      tasks: [
        { name: 'Support', billable: true, hourlyRateMinor: 12000 },
        { name: 'Design', billable: true },
      ],
    });
    const ids = {
      none: (await entry(project.id)).id,
      support: (await entry(project.id, taskNamed(project, 'Support').id)).id,
      design: (await entry(project.id, taskNamed(project, 'Design').id)).id,
    };
    return { project, ids };
  }

  test('a Project rate reaches entries without Task and of Tasks without own rate', async () => {
    const { project, ids } = await setup();
    await patchProject(project.id, { hourlyRateMinor: 10000, applyToTimeEntries: {} });
    const all = await rates();
    expect([all.get(ids.none), all.get(ids.support), all.get(ids.design)]).toEqual([
      10000, 12000, 10000,
    ]);
  });

  test('a Task rate reaches only the entries of that Task', async () => {
    const { project, ids } = await setup();
    const tasks = project.tasks.map(({ id, name, billable, hourlyRateMinor }) => ({
      id,
      name,
      billable,
      hourlyRateMinor,
    }));
    await patchProject(project.id, {
      tasks: tasks.map((t) => (t.name === 'Design' ? { ...t, hourlyRateMinor: 15000 } : t)),
      applyToTimeEntries: {},
    });
    const all = await rates();
    expect([all.get(ids.none), all.get(ids.support), all.get(ids.design)]).toEqual([
      9000, 12000, 15000,
    ]);
  });

  test('a Customer rate leaves entries of Tasks with own rate alone', async () => {
    const { project, ids } = await setup();
    await api.call('PATCH', `/customers/${customerId}`, {
      hourlyRateMinor: 9500,
      applyToProjects: { projectIds: [project.id], applyToTimeEntries: {} },
    });
    const all = await rates();
    expect([all.get(ids.none), all.get(ids.support), all.get(ids.design)]).toEqual([
      9500, 12000, 9500,
    ]);
  });
});

describe('non-billable Tasks', () => {
  async function setup(): Promise<Project> {
    const project = await createProject({
      tasks: [
        { name: 'Design', billable: true },
        { name: 'Akquise', billable: false },
      ],
    });
    await entry(project.id, taskNamed(project, 'Design').id);
    await entry(project.id, taskNamed(project, 'Akquise').id);
    await entry(project.id);
    return project;
  }

  test('count as hours without amount in the Report', async () => {
    await setup();
    const res = await api.call<Report>('GET', '/reports?from=2026-03-01&to=2026-03-31');
    expect(res.body.totals).toMatchObject({
      roundedSeconds: 3 * 3600,
      nonBillableSeconds: 3600,
      amountMinor: 2 * 9000,
    });
  });

  test('stay out of invoices; grouping per Task splits the items', async () => {
    const project = await setup();
    const res = await api.call<Invoice>('POST', '/invoices', {
      customerId,
      issueDate: '2026-04-01',
      dueDate: '2026-04-15',
      import: { from: '2026-03-01', to: '2026-03-31', grouping: 'task', expenses: false },
    });
    expect(res.body.items.map((i) => i.description.split(' (')[0])).toEqual([
      'Web',
      'Web – Design',
    ]);
    const entries = await api.call<TimeEntry[]>('GET', '/time-entries');
    const akquise = taskNamed(project, 'Akquise').id;
    expect(entries.body.find((e) => e.taskId === akquise)?.invoiceItemId).toBeNull();
  });
});
