import test from "node:test";
import assert from "node:assert/strict";
import { buildHttpError, buildWsError, normalizeWsPayload } from "../../src/utils/errors.js";

test("buildHttpError returns normalized envelope", () => {
  const payload = buildHttpError("UNAUTHORIZED");
  assert.deepEqual(payload, {
    error: {
      code: "UNAUTHORIZED",
      message: "Unauthorized.",
      retryable: false,
      context: null
    }
  });
});

test("buildWsError returns normalized websocket payload", () => {
  const payload = buildWsError("ROOM_FULL");
  assert.deepEqual(payload, {
    type: "error",
    code: "ROOM_FULL",
    message: "Room already has two players.",
    retryable: false,
    context: null
  });
});

test("normalizeWsPayload normalizes partial error payload", () => {
  const payload = normalizeWsPayload({ type: "error", code: "ILLEGAL_MOVE", context: { roomCode: "AB12CD34" } });
  assert.deepEqual(payload, {
    type: "error",
    code: "ILLEGAL_MOVE",
    message: "Illegal move.",
    retryable: false,
    context: { roomCode: "AB12CD34" }
  });
});

test("core websocket failure codes remain normalized", () => {
  const roomFull = buildWsError("ROOM_FULL");
  const illegalMove = buildWsError("ILLEGAL_MOVE");
  const reconnectForfeit = buildWsError("NO_ACTIVE_GAME", { context: { result: "forfeit_disconnect" } });

  assert.equal(roomFull.code, "ROOM_FULL");
  assert.equal(illegalMove.code, "ILLEGAL_MOVE");
  assert.equal(reconnectForfeit.context.result, "forfeit_disconnect");
});
