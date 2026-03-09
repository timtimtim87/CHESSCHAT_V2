import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("../config", () => ({
  config: {
    appDomain: "https://app.chess-chat.com",
    authHost: "https://chess-chat.com",
    sessionCookieName: "cc_session",
    pendingRoomCookieName: "cc_pending_room"
  }
}));

vi.mock("../utils/auth", () => ({
  parseJwt: () => ({
    sub: "user-1",
    email: "user-1@example.com",
    "cognito:username": "user-1"
  })
}));

function AuthHarness() {
  const { signup, logout, isConfigReady } = useAuth();
  return (
    <>
      <p>{isConfigReady ? "ready" : "not-ready"}</p>
      <button onClick={signup}>Signup</button>
      <button onClick={logout}>Logout</button>
    </>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    cleanup();
    sessionStorage.clear();
    document.cookie = "";
    vi.stubGlobal("location", {
      assign: vi.fn(),
      protocol: "https:",
      hostname: "app.chess-chat.com"
    });
  });

  it("signup redirects to apex signup", async () => {
    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Signup" }));
    expect(globalThis.location.assign).toHaveBeenCalledWith("https://chess-chat.com/signup");
  });

  it("logout redirects to apex and clears session", async () => {
    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(globalThis.location.assign).toHaveBeenCalledWith("https://chess-chat.com/?logout=1");
  });
});
