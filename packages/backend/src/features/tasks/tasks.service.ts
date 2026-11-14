import type { DefaultTask as DefaultTaskResponse, TaskInput } from '@dreck/shared/api/tasks';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '@/db/db';
import { timeEntries } from '@/features/time-entries/time-entries.table';
import { fieldError } from '@/http/api-error';
import { defaultTasks, type Task, tasks } from './tasks.table';

/** Tasks of the given Projects (Archived included), sorted by name, per Project. */
export function tasksByProject(db: Db, projectIds: number[]): Map<number, Task[]> {
  const rows =
    projectIds.length === 0
      ? []
      : db
          .select()
          .from(tasks)
          .where(inArray(tasks.projectId, projectIds))
          .orderBy(sql`${tasks.name} COLLATE NOCASE`, tasks.id)
          .all();
  const byProject = new Map<number, Task[]>(projectIds.map((id) => [id, []]));
  for (const task of rows) byProject.get(task.projectId)?.push(task);
  return byProject;
}

/** Task referenced by a Time Entry; it must belong to the Project, otherwise `400` at `taskId`. */
export function requireTask(db: Db, projectId: number, taskId: number): Task {
  const task = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
    .get();
  if (!task) throw fieldError('taskId', 'Task not found for this project');
  return task;
}

/**
 * Replaces the Tasks of a Project: Tasks with id change, without id are new. Missing ones are
 * deleted, or archived while Time Entries use them. A non-billable Task has no own rate.
 */
export function replaceTasks(db: Db, projectId: number, list: TaskInput[]): void {
  const existing = new Set(
    db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .all()
      .map((t) => t.id),
  );
  const kept = new Set<number>();
  for (const { id } of list) {
    if (id === undefined) continue;
    if (!existing.has(id) || kept.has(id)) {
      throw fieldError('tasks', `Task ${id} does not belong to this project`);
    }
    kept.add(id);
  }

  // Removed ones first, so a new Task may take over a freed name
  for (const id of existing) {
    if (kept.has(id)) continue;
    const used = db
      .select({ id: timeEntries.id })
      .from(timeEntries)
      .where(eq(timeEntries.taskId, id))
      .limit(1)
      .get();
    if (used) db.update(tasks).set({ archived: true }).where(eq(tasks.id, id)).run();
    else db.delete(tasks).where(eq(tasks.id, id)).run();
  }

  for (const { id, ...task } of list) {
    const values = {
      name: task.name,
      billable: task.billable,
      hourlyRateMinor: task.billable ? (task.hourlyRateMinor ?? null) : null,
      archived: task.archived ?? false,
    };
    if (id === undefined) {
      db.insert(tasks)
        .values({ ...values, projectId })
        .run();
    } else {
      db.update(tasks).set(values).where(eq(tasks.id, id)).run();
    }
  }
}

/** Deletes all Tasks of a Project; fails with `has_dependencies` while Time Entries use one. */
export function deleteTasksOfProject(db: Db, projectId: number): void {
  db.delete(tasks).where(eq(tasks.projectId, projectId)).run();
}

/** The Default Tasks, sorted by name. */
export function listDefaultTasks(db: Db): DefaultTaskResponse[] {
  return db
    .select({ name: defaultTasks.name, billable: defaultTasks.billable })
    .from(defaultTasks)
    .orderBy(sql`${defaultTasks.name} COLLATE NOCASE`, defaultTasks.id)
    .all();
}

/** Replaces the Default Tasks; existing Projects keep their Tasks. */
export function replaceDefaultTasks(db: Db, list: DefaultTaskResponse[]): void {
  db.delete(defaultTasks).run();
  if (list.length > 0) db.insert(defaultTasks).values(list).run();
}
