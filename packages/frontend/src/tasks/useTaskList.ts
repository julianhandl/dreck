import { useEffect, useId, useState } from 'react';
import { changeTaskRow, newTaskRow, type TaskRow, taskFieldName } from './task-rows';

type RowPatch = Partial<Pick<TaskRow, 'name' | 'billable' | 'rate' | 'archived'>>;

export type TaskList = {
  rows: TaskRow[];
  /** Id of "Task hinzufügen"; it takes the focus after a row is removed. */
  addId: string;
  handleAdd: () => void;
  handleChange: (key: string, patch: RowPatch) => void;
  handleRemove: (key: string) => void;
};

/** Rows of the Task list editor; a new row gets the focus, a removed one hands it to "add". */
export function useTaskList(initial: () => TaskRow[], onEdit?: () => void): TaskList {
  const prefix = useId();
  const [rows, setRows] = useState(initial);
  const [count, setCount] = useState(0);
  const [focusKey, setFocusKey] = useState<string | null>(null);

  useEffect(() => {
    if (focusKey === null) return;
    document
      .querySelector<HTMLInputElement>(`[name="${CSS.escape(taskFieldName(focusKey, 'name'))}"]`)
      ?.focus();
  }, [focusKey]);

  function update(next: (current: TaskRow[]) => TaskRow[]): void {
    onEdit?.();
    setRows(next);
  }

  return {
    rows,
    addId: `${prefix}add`,
    handleAdd: () => {
      const key = `${prefix}new-${count}`;
      setCount((n) => n + 1);
      update((current) => [...current, newTaskRow(key)]);
      setFocusKey(key);
    },
    handleChange: (key, patch) => update((current) => changeTaskRow(current, key, patch)),
    handleRemove: (key) => {
      update((current) => current.filter((row) => row.key !== key));
      document.getElementById(`${prefix}add`)?.focus();
    },
  };
}
