import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import App from "../App";

beforeEach(() => {
  window.localStorage.clear();
});

test("renders empty state when there are no todos", () => {
  render(<App />);
  expect(screen.getByRole("status")).toHaveTextContent(/no todos yet/i);
});

