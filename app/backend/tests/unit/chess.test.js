import test from "node:test";
import assert from "node:assert/strict";
import { applyMove, startNewGame } from "../../src/services/chess.js";

test("startNewGame initializes expected structure", () => {
  const game = startNewGame("ABCDE", "white", "black", 300);
  assert.equal(game.board_fen, "start");
  assert.equal(game.turn, "white");
  assert.equal(game.time_white, 300);
  assert.equal(game.time_black, 300);
  assert.deepEqual(game.moves, []);
  assert.deepEqual(game.move_sans, []);
});

test("applyMove accepts legal moves and returns SAN/FEN", () => {
  const result = applyMove("start", "e2e4");
  assert.equal(result.ok, true);
  assert.equal(typeof result.newFen, "string");
  assert.equal(result.san, "e4");
  assert.equal(result.isCheckmate, false);
});

test("applyMove rejects illegal moves", () => {
  const result = applyMove("start", "e2e5");
  assert.equal(result.ok, false);
});
