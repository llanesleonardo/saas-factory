import { TODOS_SCHEMA_VERSION, type Todo } from "./todos.storage";

export type ExportTodosPayloadV1 = {
  schemaVersion: 1;
  todos: Todo[];
};

export type PortableTodos = {
  todos: Todo[];
};

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

  if (typeof createdAt === "number") return { id, title, done, createdAt };
  return { id, title, done, createdAt: 0 };
}

function coerceTodosArray(arr: unknown[]): Todo[] {
  const todos: Todo[] = [];
  for (const item of arr) {
    const t = coerceTodo(item);
    if (t) todos.push(t);
  }
  return todos;
}

export function buildExportPayload(todos: Todo[]): ExportTodosPayloadV1 {
  const safe = todos.map((t) => ({
    id: t.id,
    title: t.title,
    done: !!t.done,
    createdAt: typeof t.createdAt === "number" ? t.createdAt : 0,
  }));

  return {
    schemaVersion: TODOS_SCHEMA_VERSION,
    todos: safe,
  };
}

export function parseImportedTodos(text: string): PortableTodos {
  const parsed: unknown = JSON.parse(text);

  // Legacy: stored as array
  if (Array.isArray(parsed)) {
    const todos = coerceTodosArray(parsed).map((t) => ({
      ...t,
      createdAt: typeof t.createdAt === "number" ? t.createdAt : 0,
    }));
    return { todos };
  }

  if (!parsed || typeof parsed !== "object") return { todos: [] };
  const v = parsed as Record<string, unknown>;

  if (v.schemaVersion === 1 && Array.isArray(v.todos)) {
    const todos = coerceTodosArray(v.todos).map((t) => ({
      ...t,
      createdAt: typeof t.createdAt === "number" ? t.createdAt : 0,
    }));
    return { todos };
  }

  return { todos: [] };
}

