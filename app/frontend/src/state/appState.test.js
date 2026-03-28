import { describe, expect, it } from "vitest";
import { appStateReducer, initialAppState } from "./appState";

describe("appStateReducer", () => {
  it("handles auth and room initialization", () => {
    const authed = appStateReducer(initialAppState, {
      type: "INIT_AUTH",
      isAuthenticated: true,
      userId: "user-1"
    });
    expect(authed.auth_state.status).toBe("authenticated");
    expect(authed.auth_state.userId).toBe("user-1");

    const joined = appStateReducer(authed, { type: "ROOM_INIT", roomCode: "AB12CD34" });
    expect(joined.room_state.code).toBe("AB12CD34");
    expect(joined.room_state.status).toBe("joining");
  });

  it("updates reconnect state", () => {
    const reconnecting = appStateReducer(initialAppState, {
      type: "RECONNECT_STATE",
      status: "paused",
      disconnectedUserId: "user-2",
      graceEndsAt: 1700000060000,
      reconnectVersion: 2
    });
    expect(reconnecting.room_state.reconnect.status).toBe("paused");
    expect(reconnecting.room_state.reconnect.version).toBe(2);
  });

  it("ignores stale reconnect events by version", () => {
    const paused = appStateReducer(initialAppState, {
      type: "RECONNECT_STATE",
      status: "paused",
      disconnectedUserId: "user-2",
      graceEndsAt: 1700000060000,
      reconnectVersion: 3
    });
    const stale = appStateReducer(paused, {
      type: "RECONNECT_STATE",
      status: "restored",
      disconnectedUserId: null,
      graceEndsAt: null,
      reconnectVersion: 2
    });

    expect(stale.room_state.reconnect.status).toBe("paused");
    expect(stale.room_state.reconnect.version).toBe(3);
  });

  it("handles game lifecycle events", () => {
    const started = appStateReducer(initialAppState, {
      type: "GAME_STARTED",
      game: {
        gameId: "g-1",
        whitePlayerId: "user-1",
        blackPlayerId: "user-2",
        fen: "start",
        moves: [],
        moveSans: [],
        turn: "white",
        timeWhite: 300,
        timeBlack: 300,
        serverTimestampMs: 1
      }
    });
    expect(started.game_state.active).toBe(true);
    expect(started.game_state.game.gameId).toBe("g-1");

    const moved = appStateReducer(started, {
      type: "MOVE_MADE",
      fen: "fen-2",
      moves: ["e2e4"],
      moveSans: ["e4"],
      turn: "black",
      timeWhite: 298,
      timeBlack: 300,
      serverTimestampMs: 2
    });
    expect(moved.game_state.game.fen).toBe("fen-2");
    expect(moved.game_state.game.turn).toBe("black");

    const ended = appStateReducer(moved, { type: "GAME_ENDED", result: { result: "checkmate" } });
    expect(ended.game_state.active).toBe(false);
    expect(ended.game_state.lastResult.result).toBe("checkmate");
  });

  it("handles media and error channels", () => {
    const mediaReady = appStateReducer(initialAppState, {
      type: "VIDEO_READY",
      credentials: { meetingData: {}, attendeeData: {} }
    });
    expect(mediaReady.media_state.status).toBe("ready");

    const connected = appStateReducer(mediaReady, { type: "MEDIA_STARTED", message: "Connected" });
    expect(connected.media_state.started).toBe(true);

    const withBlockingError = appStateReducer(connected, {
      type: "SET_BLOCKING_ERROR",
      error: { code: "X" }
    });
    expect(withBlockingError.blocking_error.code).toBe("X");

    const withToastError = appStateReducer(withBlockingError, {
      type: "SET_TOAST_ERROR",
      error: { code: "Y" }
    });
    expect(withToastError.toast_error.code).toBe("Y");
  });
});
