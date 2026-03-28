import test from "node:test";
import assert from "node:assert/strict";
import { forfeitWinnerFromDisconnect, reconnectPauseState, reconnectRestoredState } from "../../src/websocket/reconnect.js";

test("reconnect pause state includes grace deadline", () => {
  const paused = reconnectPauseState({
    roomCode: "AB12CD34",
    disconnectedUserId: "user-1",
    reconnectGraceSeconds: 60,
    now: 1700000000000
  });

  assert.equal(paused.reconnectDeadlineMs, 1700000060000);
  assert.deepEqual(paused.event, {
    type: "reconnect_state",
    roomCode: "AB12CD34",
    status: "paused",
    disconnectedUserId: "user-1",
    graceEndsAt: 1700000060000,
    reconnectVersion: null
  });
});

test("reconnect restored event clears paused metadata", () => {
  const restored = reconnectRestoredState({ roomCode: "AB12CD34" });
  assert.deepEqual(restored, {
    type: "reconnect_state",
    roomCode: "AB12CD34",
    status: "restored",
    disconnectedUserId: null,
    graceEndsAt: null,
    reconnectVersion: null
  });
});

test("forfeit winner mapping favors connected opponent", () => {
  const winner = forfeitWinnerFromDisconnect(
    { white_player_id: "white-1", black_player_id: "black-1" },
    "white-1"
  );
  assert.equal(winner, "black");
});
