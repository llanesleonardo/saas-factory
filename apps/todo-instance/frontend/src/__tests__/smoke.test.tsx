import { render, screen } from "@testing-library/react";
import App from "../App";

test("smoke: renders Todo heading", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /todo/i })).toBeInTheDocument();
});

