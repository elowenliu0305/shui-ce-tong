import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../../src/app/App";

describe("App bootstrap", () => {
  it("renders the React application shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "邮箱登录" })).toBeInTheDocument();
  });
});
