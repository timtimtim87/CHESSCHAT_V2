import { Chess } from "chess.js";

export function startNewGame(roomCode, whitePlayerId, blackPlayerId, durationSeconds) {
  return {
    game_id: `${roomCode}-${Date.now()}`,
    board_fen: "start",
    moves: [],
    move_sans: [],
    white_player_id: whitePlayerId,
    black_player_id: blackPlayerId,
    turn: "white",
    time_white: durationSeconds,
    time_black: durationSeconds,
    started_at: Date.now(),
    last_move_at: Date.now()
  };
}

export function applyMove(fen, move) {
  const chess = new Chess(fen === "start" ? undefined : fen);
  let applied = null;
  try {
    applied = chess.move(move);
  } catch {
    return { ok: false };
  }

  if (!applied) {
    return { ok: false };
  }

  return {
    ok: true,
    newFen: chess.fen(),
    san: applied.san,
    pgn: chess.pgn(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isDraw: chess.isDraw()
  };
}
