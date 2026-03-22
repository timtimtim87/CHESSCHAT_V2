import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./context/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: false
  })
}));

describe("App preview routes", () => {
  beforeEach(() => {
    sessionStorage.clear();
    cleanup();
  });

  it("redirects unauthenticated preview pages to landing", async () => {
    render(
      <MemoryRouter initialEntries={["/ui-preview/play"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(/UI Preview Sandbox/i)).toBeInTheDocument();
  });

  it("supports guided preview flow from landing to play", async () => {
    render(
      <MemoryRouter initialEntries={["/ui-preview/landing"]}>
        <App />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    expect(await screen.findByText(/Create preview account/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText(/Registration Complete/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(await screen.findByRole("heading", { name: "Game" })).toBeInTheDocument();
  });
});
