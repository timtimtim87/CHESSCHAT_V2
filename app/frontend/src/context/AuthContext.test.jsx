import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

const hoisted = vi.hoisted(() => ({
  cognito: {
    hostedUiBaseUrl: "https://example.auth.us-east-1.amazoncognito.com",
    clientId: "client-123",
    redirectUri: "https://chess-chat.com/auth/callback",
    logoutUri: "https://chess-chat.com/"
  }
}));

vi.mock("../config", () => ({
  config: {
    appDomain: "https://chess-chat.com",
    cognito: hoisted.cognito
  },
  loadPublicConfig: async () => ({
    appDomain: "https://chess-chat.com",
    cognito: hoisted.cognito
  })
}));

vi.mock("../utils/auth", () => ({
  createPkceChallenge: async () => ({
    verifier: "verifier-123",
    challenge: "challenge-123"
  }),
  parseJwt: () => null
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
    hoisted.cognito.hostedUiBaseUrl = "https://example.auth.us-east-1.amazoncognito.com";
    cleanup();
    sessionStorage.clear();
    vi.stubGlobal("location", {
      assign: vi.fn()
    });
    vi.stubGlobal("crypto", {
      randomUUID: () => "uuid-123"
    });
  });

  it("signup uses Cognito screen_hint=signup", async () => {
    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText("ready")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Signup" }));

    expect(globalThis.location.assign).toHaveBeenCalledTimes(1);
    const url = globalThis.location.assign.mock.calls[0][0];
    expect(url).toContain("/oauth2/authorize?");
    expect(url).toContain("screen_hint=signup");
  });

  it("logout falls back locally if Cognito config is incomplete", async () => {
    hoisted.cognito.hostedUiBaseUrl = "";

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(globalThis.location.assign).toHaveBeenCalledWith("/");

    hoisted.cognito.hostedUiBaseUrl = "https://example.auth.us-east-1.amazoncognito.com";
  });
});
