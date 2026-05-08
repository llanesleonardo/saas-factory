import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import App from "../App";
import { saveTodos, type Todo } from "../todos.storage";

function checkboxStates() {
  return screen.getAllByRole("checkbox").map((el) => (el as HTMLInputElement).checked);
}

beforeEach(() => {
  window.localStorage.clear();
});

test("toggle all marks all completed when any todo is active, and toggles back when all completed", () => {
  const seed: Todo[] = [
    // Newest-first ordering: ensure the completed item renders first.
    { id: "1", title: "Scaffolded todo-instance", done: true, createdAt: 2 },
    { id: "2", title: "Persistence: refresh should keep todos", done: false, createdAt: 1 },
  ];
  saveTodos(seed);

  render(<App />);

  // Seed: [completed, active]
  expect(checkboxStates()).toEqual([true, false]);

  fireEvent.click(screen.getByRole("button", { name: /toggle all/i }));
  expect(checkboxStates()).toEqual([true, true]);

  fireEvent.click(screen.getByRole("button", { name: /toggle all/i }));
  expect(checkboxStates()).toEqual([false, false]);
});

