import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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
  parseJwt: (token) => {
    if (token === "id-old") {
      return {
        aud: "client-1",
        sub: "user-1",
        email: "user-1@example.com",
        "cognito:username": "user-1"
      };
    }
    return {
      aud: "client-1",
      sub: "user-1",
      email: "user-1@example.com",
      "cognito:username": "user-1"
    };
  }
}));

function AuthHarness() {
  const { signup, logout, isConfigReady, getValidToken } = useAuth();
  const [token, setToken] = useState("");

  return (
    <>
      <p>{isConfigReady ? "ready" : "not-ready"}</p>
      <button onClick={signup}>Signup</button>
      <button onClick={logout}>Logout</button>
      <button onClick={async () => setToken(await getValidToken())}>Get token</button>
      <p>{token}</p>
    </>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    cleanup();
    sessionStorage.clear();
    document.cookie = "";
    globalThis.fetch = vi.fn();
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

  it("returns existing token when cookie session is still fresh", async () => {
    const session = {
      access_token: "access-fresh",
      id_token: "id-fresh",
      refresh_token: "refresh-1",
      expires_in: 3600,
      saved_at: Date.now()
    };
    document.cookie = `cc_session=${encodeURIComponent(JSON.stringify(session))}`;

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Get token" }));

    expect(await screen.findByText("access-fresh")).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("refreshes stale token and preserves refresh token in cookie", async () => {
    const session = {
      access_token: "access-old",
      id_token: "id-old",
      refresh_token: "refresh-old",
      expires_in: 1,
      saved_at: 1
    };
    document.cookie = `cc_session=${encodeURIComponent(JSON.stringify(session))}`;

    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        AuthenticationResult: {
          AccessToken: "access-new",
          IdToken: "id-new",
          ExpiresIn: 3600
        }
      })
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Get token" }));

    expect(await screen.findByText("access-new")).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch.mock.calls[0][1].body).toContain("\"REFRESH_TOKEN\":\"refresh-old\"");
    expect(globalThis.fetch.mock.calls[0][1].body).toContain("\"ClientId\":\"client-1\"");
  });
});
