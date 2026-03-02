import test from "node:test";
import assert from "node:assert/strict";
import { buildRematchOutcome } from "../../src/websocket/rematch.js";

function baseRoom() {
  return {
    participants: {
      alpha: { userId: "alpha", connected: true },
      beta: { userId: "beta", connected: true }
    },
    rematch_requested_by: "alpha",
    active_game: null
  };
}

test("rematch decline clears pending request and emits declined event", () => {
  const room = baseRoom();
  const outcome = buildRematchOutcome({
    room,
    roomCode: "ABCDE",
    requestedBy: "alpha",
    responderUserId: "beta",
    accept: false,
    gameDurationSeconds: 300
  });

  assert.equal(outcome.room.rematch_requested_by, null);
  assert.equal(outcome.meta.event.type, "rematch_declined");
  assert.equal(outcome.meta.event.requestedBy, "alpha");
  assert.equal(outcome.meta.event.declinedBy, "beta");
});

test("rematch accept starts game and emits accepted + game_started", () => {
  const room = baseRoom();
  const outcome = buildRematchOutcome({
    room,
    roomCode: "ABCDE",
    requestedBy: "alpha",
    responderUserId: "beta",
    accept: true,
    gameDurationSeconds: 300,
    pickColors: () => ["alpha", "beta"],
    now: () => 1700000000000
  });

  assert.equal(outcome.meta.rematchAcceptedEvent.type, "rematch_accepted");
  assert.equal(outcome.meta.gameStartedEvent.type, "game_started");
  assert.equal(outcome.meta.gameStartedEvent.whitePlayerId, "alpha");
  assert.equal(outcome.meta.gameStartedEvent.blackPlayerId, "beta");
  assert.equal(outcome.meta.gameStartedEvent.serverTimestampMs, 1700000000000);
});

test("invalid rematch response type returns error", () => {
  const outcome = buildRematchOutcome({
    room: baseRoom(),
    roomCode: "ABCDE",
    requestedBy: "alpha",
    responderUserId: "beta",
    accept: "yes",
    gameDurationSeconds: 300
  });

  assert.equal(outcome.error.type, "error");
  assert.equal(outcome.error.code, "INVALID_REMATCH_RESPONSE");
});
