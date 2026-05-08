import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import App from "../App";

function listCount() {
  return screen.queryAllByRole("listitem").length;
}

beforeEach(() => {
  window.localStorage.clear();
});

test("clear completed removes only completed todos", () => {
  render(<App />);

  // Seed data includes one completed and one active todo by default.
  expect(listCount()).toBe(2);

  fireEvent.click(screen.getByRole("button", { name: /clear completed/i }));

  expect(listCount()).toBe(1);
  expect(screen.getByText(/persistence: refresh should keep todos/i)).toBeInTheDocument();
});

