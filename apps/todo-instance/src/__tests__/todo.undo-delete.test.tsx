import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import App from "../App";
import { saveTodos, type Todo } from "../todos.storage";

beforeEach(() => {
  window.localStorage.clear();
});

test("undo delete restores the removed todo", () => {
  const seed: Todo[] = [
    { id: "1", title: "First", done: false, createdAt: 1 },
    { id: "2", title: "Second", done: true, createdAt: 2 },
  ];
  saveTodos(seed);

  render(<App />);
  expect(screen.getByText("First")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /delete todo: first/i }));
  expect(screen.queryByText("First")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: /undo/i }));
  expect(screen.getByText("First")).toBeInTheDocument();
});

