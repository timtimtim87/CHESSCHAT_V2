import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import LobbyPage from "./LobbyPage";

const mockNavigate = vi.fn();
const mockLogout = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { sub: "user-1", username: "user-1" },
    accessToken: "token-1",
    logout: mockLogout
  })
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe("LobbyPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogout.mockReset();
    sessionStorage.clear();
    vi.restoreAllMocks();
    cleanup();
  });

  it("renders username in nav and opponent username input after profile loads", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/notifications") {
        return {
          ok: true,
          json: async () => ({ notifications: [] })
        };
      }
      if (url === "/api/me") {
        return {
          ok: true,
          json: async () => ({ user: { username: "tim", wins: 3, losses: 1, draws: 2 } })
        };
      }
      throw new Error(`Unexpected fetch URL in test: ${url}`);
    });

    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("tim")).toBeInTheDocument());
    expect(screen.getByLabelText("Opponent username")).toBeInTheDocument();
  });

  it("submits opponent username, calls pair API and navigates", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/notifications") {
        return {
          ok: true,
          json: async () => ({ notifications: [] })
        };
      }
      if (url === "/api/me") {
        return {
          ok: true,
          json: async () => ({
            user: { user_id: "user-1", username: "tim", wins: 0, losses: 0, draws: 0 }
          })
        };
      }
      if (url === "/api/rooms/pair?username=tim_5ew") {
        return {
          ok: true,
          json: async () => ({
            room_code: "ABCD1234",
            opponent: { user_id: "user-2", username: "tim_5ew", display_name: "tim_5ew" }
          })
        };
      }
      throw new Error(`Unexpected fetch URL in test: ${url}`);
    });

    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>
    );

    const input = await screen.findByLabelText("Opponent username");
    await userEvent.type(input, "tim_5ew");
    await userEvent.click(screen.getByRole("button", { name: "Start Game" }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/room/ABCD1234"));
  });
});
