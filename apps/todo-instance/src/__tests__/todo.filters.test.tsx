import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import App from "../App";

function listItems() {
  return screen.queryAllByRole("listitem");
}

beforeEach(() => {
  window.localStorage.clear();
});

test("filters (All/Active/Completed) change visible items deterministically", () => {
  render(<App />);

  // Seed: one completed + one active.
  expect(listItems()).toHaveLength(2);

  fireEvent.click(screen.getByRole("button", { name: /^active$/i }));
  expect(listItems()).toHaveLength(1);
  expect(screen.getByText(/persistence: refresh should keep todos/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /^completed$/i }));
  expect(listItems()).toHaveLength(1);
  expect(screen.getByText(/scaffolded todo-instance/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /^all$/i }));
  expect(listItems()).toHaveLength(2);
});

