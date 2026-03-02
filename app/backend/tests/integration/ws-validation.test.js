import test from "node:test";
import assert from "node:assert/strict";
import { validateInboundEnvelope, validateRoomCodeForEvent } from "../../src/websocket/validation.js";

test("invalid websocket envelope returns INVALID_PAYLOAD", () => {
  const result = validateInboundEnvelope("bad");
  assert.equal(result.ok, false);
  assert.equal(result.error.type, "error");
  assert.equal(result.error.code, "INVALID_PAYLOAD");
});

test("make_move with invalid room code fails validation", () => {
  const result = validateRoomCodeForEvent({
    type: "make_move",
    roomCode: "bad!"
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.type, "error");
  assert.equal(result.error.code, "INVALID_ROOM_CODE");
});

test("join_room with valid room code succeeds validation", () => {
  const result = validateRoomCodeForEvent({
    type: "join_room",
    roomCode: "abc12"
  });
  assert.equal(result.ok, true);
  assert.equal(result.roomCode, "ABC12");
});
