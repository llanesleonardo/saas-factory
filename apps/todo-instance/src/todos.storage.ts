export type Todo = {
  id: string;
  title: string;
  done: boolean;
  createdAt?: number;
};

export const TODOS_STORAGE_KEY = "todo.todos.v1";
export const TODOS_SCHEMA_VERSION = 1;

type PersistedTodosV1 = {
  schemaVersion: 1;
  todos: Todo[];
};

export function loadTodos(): Todo[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(TODOS_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    const { todos, shouldPersist } = parseTodosPayload(parsed);

    if (shouldPersist) saveTodos(todos);
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

  const payload: PersistedTodosV1 = {
    schemaVersion: TODOS_SCHEMA_VERSION,
    todos: safe,
  };

  window.localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(payload));
}

function parseTodosPayload(value: unknown): { todos: Todo[]; shouldPersist: boolean } {
  // Legacy v0: stored as an array of todos under the v1 key.
  if (Array.isArray(value)) {
    return { todos: coerceTodosArray(value), shouldPersist: true };
  }

  if (!value || typeof value !== "object") return { todos: [], shouldPersist: false };
  const v = value as Record<string, unknown>;

  if (v.schemaVersion === 1) {
    const todosRaw = v.todos;
    if (!Array.isArray(todosRaw)) return { todos: [], shouldPersist: false };
    return { todos: coerceTodosArray(todosRaw), shouldPersist: false };
  }

  return { todos: [], shouldPersist: false };
}

function coerceTodosArray(arr: unknown[]): Todo[] {
  const todos: Todo[] = [];
  for (const item of arr) {
    const t = coerceTodo(item);
    if (t) todos.push(t);
  }
  return todos;
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

