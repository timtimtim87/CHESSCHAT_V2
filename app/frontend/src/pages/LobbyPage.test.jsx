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

  it("renders username in nav and room code input after profile loads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { username: "tim", wins: 3, losses: 1, draws: 2 } })
    });

    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("tim")).toBeInTheDocument());
    expect(screen.getByLabelText("Room code")).toBeInTheDocument();
  });

  it("submits valid room code and navigates", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { username: "tim", wins: 0, losses: 0, draws: 0 } })
    });

    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>
    );

    const input = await screen.findByLabelText("Room code");
    await userEvent.type(input, "abc12");
    await userEvent.click(screen.getByRole("button", { name: "Start / Join" }));
    expect(mockNavigate).toHaveBeenCalledWith("/room/ABC12");
  });
});
