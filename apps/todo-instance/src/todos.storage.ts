export type Todo = {
  id: string;
  title: string;
  done: boolean;
  createdAt?: number;
};

export const TODOS_STORAGE_KEY = "todo.todos.v1";

export function loadTodos(): Todo[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(TODOS_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const todos: Todo[] = [];
    for (const item of parsed) {
      const t = coerceTodo(item);
      if (t) todos.push(t);
    }
    return todos;
  } catch {
    return [];
  }
}

export function saveTodos(todos: Todo[]): void {
  if (typeof window === "undefined") return;

  const safe = todos.map((t) => ({
    id: t.id,
    title: t.title,
    done: !!t.done,
    ...(typeof t.createdAt === "number" ? { createdAt: t.createdAt } : {}),
  }));

  window.localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(safe));
}

function coerceTodo(value: unknown): Todo | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  const id = v.id;
  const title = v.title;
  const done = v.done;
  const createdAt = v.createdAt;

  if (typeof id !== "string") return null;
  if (typeof title !== "string") return null;
  if (typeof done !== "boolean") return null;

  if (typeof createdAt === "number") {
    return { id, title, done, createdAt };
  }

  return { id, title, done };
}

