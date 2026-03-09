import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LandingPage from "./LandingPage";

const mockLogin = vi.fn();
const mockSignup = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    signup: mockSignup,
    isConfigReady: true
  })
}));

describe("LandingPage", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockSignup.mockReset();
    cleanup();
  });

  it("renders separate sign up/sign in actions without tagline", async () => {
    render(<LandingPage />);

    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.queryByText(/Real-time chess and video/i)).not.toBeInTheDocument();
  });

  it("calls signup and login actions from buttons", async () => {
    render(<LandingPage />);

    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(mockSignup).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });
});
