import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import App from "../App";
import { saveTodos, type Todo } from "../todos.storage";

beforeEach(() => {
  window.localStorage.clear();
});

test("counts summary updates after bulk actions", () => {
  const seed: Todo[] = [
    { id: "1", title: "Scaffolded todo-instance", done: true, createdAt: 1 },
    { id: "2", title: "Persistence: refresh should keep todos", done: false, createdAt: 2 },
  ];
  saveTodos(seed);

  render(<App />);

  // Seed: 1 completed + 1 active
  expect(screen.getByText(/1 remaining/i)).toBeInTheDocument();
  expect(screen.getByText(/\(2 total\)/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /toggle all/i }));
  expect(screen.getByText(/0 remaining/i)).toBeInTheDocument();
  expect(screen.getByText(/\(2 total\)/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /clear completed/i }));
  expect(screen.getByText(/0 remaining/i)).toBeInTheDocument();
  expect(screen.getByText(/\(0 total\)/i)).toBeInTheDocument();
});

