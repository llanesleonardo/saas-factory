import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import App from "../App";
import { saveTodos, type Todo } from "../todos.storage";

beforeEach(() => {
  window.localStorage.clear();
});

function seedTodos(): Todo[] {
  const seed: Todo[] = [
    { id: "1", title: "First", done: false, createdAt: 1 },
    { id: "2", title: "Second", done: true, createdAt: 2 },
  ];
  saveTodos(seed);
  return seed;
}

test("inline edit: Enter saves trimmed title", () => {
  seedTodos();
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: /edit todo: first/i }));
  const input = screen.getByLabelText(/edit todo title/i);
  fireEvent.change(input, { target: { value: "  Updated  " } });
  fireEvent.keyDown(input, { key: "Enter" });

  expect(screen.getByText("Updated")).toBeInTheDocument();
  expect(screen.queryByLabelText(/edit todo title/i)).toBeNull();
});

test("inline edit: Escape cancels", () => {
  seedTodos();
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: /edit todo: first/i }));
  const input = screen.getByLabelText(/edit todo title/i);
  fireEvent.change(input, { target: { value: "Updated" } });
  fireEvent.keyDown(input, { key: "Escape" });

  expect(screen.getByText("First")).toBeInTheDocument();
  expect(screen.queryByText("Updated")).toBeNull();
});

test("inline edit: Enter rejects empty/whitespace-only edits", () => {
  seedTodos();
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: /edit todo: first/i }));
  const input = screen.getByLabelText(/edit todo title/i);
  fireEvent.change(input, { target: { value: "   " } });
  fireEvent.keyDown(input, { key: "Enter" });

  expect(screen.getByText("First")).toBeInTheDocument();
});

