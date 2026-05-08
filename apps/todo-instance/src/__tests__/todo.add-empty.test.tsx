import { fireEvent, render, screen } from "@testing-library/react";
import App from "../App";

function listCount() {
  return screen.queryAllByRole("listitem").length;
}

test("add rejects empty and whitespace-only titles", () => {
  window.localStorage.clear();
  render(<App />);

  const input = screen.getByLabelText(/new todo title/i);
  const addButton = screen.getByRole("button", { name: /add/i });

  const initialCount = listCount();

  fireEvent.change(input, { target: { value: "" } });
  expect(addButton).toBeDisabled();
  expect(listCount()).toBe(initialCount);

  fireEvent.change(input, { target: { value: "   " } });
  expect(addButton).toBeDisabled();
  expect(listCount()).toBe(initialCount);
});

