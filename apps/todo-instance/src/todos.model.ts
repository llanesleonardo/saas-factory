import type { Todo } from "./todos.storage";

export type Filter = "all" | "active" | "completed";

export function getVisibleTodos(todos: Todo[], filter: Filter): Todo[] {
  if (filter === "active") return todos.filter((t) => !t.done);
  if (filter === "completed") return todos.filter((t) => t.done);
  return todos;
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

