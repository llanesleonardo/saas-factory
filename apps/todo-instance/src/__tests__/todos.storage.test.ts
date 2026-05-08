import { beforeEach, expect, test } from "vitest";
import { loadTodos, saveTodos, TODOS_SCHEMA_VERSION, TODOS_STORAGE_KEY, type Todo } from "../todos.storage";

beforeEach(() => {
  window.localStorage.clear();
});

test("loadTodos returns [] when storage key is missing", () => {
  expect(window.localStorage.getItem(TODOS_STORAGE_KEY)).toBeNull();
  expect(loadTodos()).toEqual([]);
});

test("loadTodos returns [] when stored JSON is corrupt", () => {
  window.localStorage.setItem(TODOS_STORAGE_KEY, "{");
  expect(loadTodos()).toEqual([]);
});

test("saveTodos writes a JSON array under the versioned key", () => {
  const todos: Todo[] = [
    { id: "1", title: "a", done: false, createdAt: 123 },
    { id: "2", title: "b", done: true },
  ];

  saveTodos(todos);

  const raw = window.localStorage.getItem(TODOS_STORAGE_KEY);
  expect(raw).not.toBeNull();

  const parsed = JSON.parse(raw!);
  expect(parsed).toEqual({
    schemaVersion: TODOS_SCHEMA_VERSION,
    todos: [
      { id: "1", title: "a", done: false, createdAt: 123 },
      { id: "2", title: "b", done: true },
    ],
  });
});

test("loadTodos can read legacy array format and persists back to versioned payload", () => {
  window.localStorage.setItem(
    TODOS_STORAGE_KEY,
    JSON.stringify([
      { id: "1", title: "a", done: false, createdAt: 123 },
      { id: "2", title: "b", done: true },
    ])
  );

  expect(loadTodos()).toEqual([
    { id: "1", title: "a", done: false, createdAt: 123 },
    { id: "2", title: "b", done: true },
  ]);

  const raw = window.localStorage.getItem(TODOS_STORAGE_KEY);
  expect(raw).not.toBeNull();
  expect(JSON.parse(raw!)).toEqual({
    schemaVersion: TODOS_SCHEMA_VERSION,
    todos: [
      { id: "1", title: "a", done: false, createdAt: 123 },
      { id: "2", title: "b", done: true },
    ],
  });
});

