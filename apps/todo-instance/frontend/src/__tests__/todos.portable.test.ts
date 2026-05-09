import { expect, test } from "vitest";

import { buildExportPayload, parseImportedTodos } from "../todos.portable";
import { TODOS_SCHEMA_VERSION, type Todo } from "../todos.storage";

test("buildExportPayload returns versioned payload", () => {
  const todos: Todo[] = [{ id: "1", title: "a", done: false, createdAt: 123 }];
  expect(buildExportPayload(todos)).toEqual({
    schemaVersion: TODOS_SCHEMA_VERSION,
    todos: [{ id: "1", title: "a", done: false, createdAt: 123 }],
  });
});

test("parseImportedTodos accepts v1 payload", () => {
  const text = JSON.stringify({
    schemaVersion: 1,
    todos: [{ id: "1", title: "a", done: false, createdAt: 123 }],
  });
  expect(parseImportedTodos(text)).toEqual({
    todos: [{ id: "1", title: "a", done: false, createdAt: 123 }],
  });
});

test("parseImportedTodos accepts legacy array", () => {
  const text = JSON.stringify([{ id: "1", title: "a", done: false, createdAt: 123 }]);
  expect(parseImportedTodos(text)).toEqual({
    todos: [{ id: "1", title: "a", done: false, createdAt: 123 }],
  });
});

test("parseImportedTodos returns empty list for unknown shape", () => {
  const text = JSON.stringify({ schemaVersion: 999, todos: [{ id: "1", title: "a", done: false }] });
  expect(parseImportedTodos(text)).toEqual({ todos: [] });
});

