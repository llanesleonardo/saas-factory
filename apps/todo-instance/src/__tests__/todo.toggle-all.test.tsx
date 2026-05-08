import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import App from "../App";

function checkboxStates() {
  return screen.getAllByRole("checkbox").map((el) => (el as HTMLInputElement).checked);
}

beforeEach(() => {
  window.localStorage.clear();
});

test("toggle all marks all completed when any todo is active, and toggles back when all completed", () => {
  render(<App />);

  // Seed: [completed, active]
  expect(checkboxStates()).toEqual([true, false]);

  fireEvent.click(screen.getByRole("button", { name: /toggle all/i }));
  expect(checkboxStates()).toEqual([true, true]);

  fireEvent.click(screen.getByRole("button", { name: /toggle all/i }));
  expect(checkboxStates()).toEqual([false, false]);
});

