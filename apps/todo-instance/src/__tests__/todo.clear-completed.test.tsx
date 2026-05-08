import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import App from "../App";
import { saveTodos, type Todo } from "../todos.storage";

function listCount() {
  return screen.queryAllByRole("listitem").length;
}

beforeEach(() => {
  window.localStorage.clear();
});

test("clear completed removes only completed todos", () => {
  const seed: Todo[] = [
    { id: "1", title: "Scaffolded todo-instance", done: true, createdAt: 1 },
    { id: "2", title: "Persistence: refresh should keep todos", done: false, createdAt: 2 },
  ];
  saveTodos(seed);

  render(<App />);

  expect(listCount()).toBe(2);

  fireEvent.click(screen.getByRole("button", { name: /clear completed/i }));

  expect(listCount()).toBe(1);
  expect(screen.getByText(/persistence: refresh should keep todos/i)).toBeInTheDocument();
});

