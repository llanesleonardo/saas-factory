import { beforeEach, expect, test } from "vitest";
import { loadTodos, saveTodos, TODOS_STORAGE_KEY, type Todo } from "../todos.storage";

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
  expect(Array.isArray(parsed)).toBe(true);
  expect(parsed).toEqual([
    { id: "1", title: "a", done: false, createdAt: 123 },
    { id: "2", title: "b", done: true },
  ]);
});

