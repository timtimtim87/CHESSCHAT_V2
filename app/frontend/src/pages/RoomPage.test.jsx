import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoomPage from "./RoomPage";

const mockNavigate = vi.fn();
const mockSocketSend = vi.fn();
const hoisted = vi.hoisted(() => ({
  latestSocketConfig: null
}));

vi.mock("../components/ChessBoardPanel", () => ({
  default: () => <div>ChessBoardMock</div>
}));

vi.mock("../components/VideoPanel", () => ({
  default: () => <div>VideoPanelMock</div>
}));

vi.mock("../services/chime", () => ({
  createMeetingSession: () => ({ audioVideo: {} }),
  listDevices: async () => ({ audioInputs: [], videoInputs: [] }),
  startMedia: async () => {},
  stopMedia: () => {}
}));

vi.mock("../services/socket", () => ({
  ChessChatSocket: class {
    constructor(config) {
      hoisted.latestSocketConfig = config;
    }
    connect() {
      hoisted.latestSocketConfig?.onStateChange?.({ status: "connected", reconnectAttempt: 0, retryInMs: 0 });
      hoisted.latestSocketConfig?.onOpen?.();
    }
    send(type, payload = {}) {
      mockSocketSend(type, payload);
    }
    disconnect() {}
  }
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    accessToken: "token-1",
    getValidToken: async () => "token-1",
    user: { sub: "user-1" }
  })
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

function renderRoom() {
  return render(
    <MemoryRouter initialEntries={["/room/abc12"]}>
      <Routes>
        <Route path="/room/:code" element={<RoomPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RoomPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSocketSend.mockReset();
    hoisted.latestSocketConfig = null;
    cleanup();
  });

  it("renders reconnect paused toast from socket event", async () => {
    renderRoom();

    await waitFor(() => expect(mockSocketSend).toHaveBeenCalledWith("join_room", { roomCode: "ABC12" }));
    hoisted.latestSocketConfig.onMessage({
      type: "reconnect_state",
      status: "paused",
      disconnectedUserId: "user-2",
      graceEndsAt: Date.now() + 5000
    });

    expect(await screen.findByText("Opponent disconnected. Waiting for reconnect.")).toBeInTheDocument();
  });

  it("shows and confirms resign modal", async () => {
    renderRoom();

    hoisted.latestSocketConfig.onMessage({
      type: "game_started",
      gameId: "g-1",
      whitePlayerId: "user-1",
      blackPlayerId: "user-2",
      fen: "start",
      moves: [],
      moveSans: [],
      turn: "white",
      timeWhite: 300,
      timeBlack: 300,
      serverTimestampMs: Date.now()
    });

    await userEvent.click(await screen.findByRole("button", { name: "Resign" }));
    expect(screen.getByText("Are you sure you want to resign this game?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirm Resign" }));
    expect(mockSocketSend).toHaveBeenCalledWith("resign", { roomCode: "ABC12" });
  });

  it("renders room command and action controls", async () => {
    renderRoom();
    expect(await screen.findByRole("button", { name: "Return to Lobby" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Game" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Room" })).toBeInTheDocument();
    expect(screen.queryByText("Move History")).not.toBeInTheDocument();
  });

  it("renders game result modal", async () => {
    renderRoom();
    hoisted.latestSocketConfig.onMessage({
      type: "game_ended",
      gameId: "g-1",
      winner: "user-1",
      result: "checkmate",
      pgn: "1. e4 e5"
    });

    expect(await screen.findByText("Game Result")).toBeInTheDocument();
    expect(screen.getByText("checkmate")).toBeInTheDocument();
  });
});
