import type { Todo } from "./todos.storage";

export type Filter = "all" | "active" | "completed";

export function getVisibleTodos(todos: Todo[], filter: Filter): Todo[] {
  const filtered =
    filter === "active"
      ? todos.filter((t) => !t.done)
      : filter === "completed"
        ? todos.filter((t) => t.done)
        : todos;

  return [...filtered].sort((a, b) => {
    const aT = typeof a.createdAt === "number" ? a.createdAt : 0;
    const bT = typeof b.createdAt === "number" ? b.createdAt : 0;
    if (aT !== bT) return bT - aT;
    return a.id.localeCompare(b.id);
  });
}

export function getCounts(todos: Todo[]): { remaining: number; total: number } {
  return {
    remaining: todos.filter((t) => !t.done).length,
    total: todos.length,
  };
}

export function toggleAllTodos(todos: Todo[]): Todo[] {
  const hasActive = todos.some((t) => !t.done);
  const nextDone = hasActive;
  return todos.map((t) => ({ ...t, done: nextDone }));
}

export function clearCompletedTodos(todos: Todo[]): Todo[] {
  return todos.filter((t) => !t.done);
}

