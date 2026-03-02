import { OutboundEvent } from "./events.js";
import { startNewGame } from "../services/chess.js";

export function buildRematchOutcome({
  room,
  roomCode,
  requestedBy,
  responderUserId,
  accept,
  gameDurationSeconds,
  pickColors = (players) => (Math.random() < 0.5 ? [players[0], players[1]] : [players[1], players[0]]),
  now = () => Date.now()
}) {
  if (typeof accept !== "boolean") {
    return {
      error: {
        type: OutboundEvent.ERROR,
        code: "INVALID_REMATCH_RESPONSE",
        message: "Invalid rematch response."
      }
    };
  }

  if (!requestedBy || requestedBy === responderUserId) {
    return {
      error: {
        type: OutboundEvent.ERROR,
        code: "REMATCH_NOT_PENDING",
        message: "No pending rematch request."
      }
    };
  }

  if (!accept) {
    room.rematch_requested_by = null;
    return {
      room,
      meta: {
        event: {
          type: OutboundEvent.REMATCH_DECLINED,
          roomCode,
          requestedBy,
          declinedBy: responderUserId
        }
      }
    };
  }

  const players = Object.keys(room.participants);
  const [whitePlayerId, blackPlayerId] = pickColors(players);
  room.active_game = startNewGame(roomCode, whitePlayerId, blackPlayerId, gameDurationSeconds);
  room.rematch_requested_by = null;

  return {
    room,
    meta: {
      rematchAcceptedEvent: {
        type: OutboundEvent.REMATCH_ACCEPTED,
        roomCode,
        requestedBy,
        acceptedBy: responderUserId
      },
      gameStartedEvent: {
        type: OutboundEvent.GAME_STARTED,
        gameId: room.active_game.game_id,
        whitePlayerId,
        blackPlayerId,
        fen: room.active_game.board_fen,
        moves: [...room.active_game.moves],
        moveSans: [...(room.active_game.move_sans || [])],
        turn: room.active_game.turn,
        timeWhite: room.active_game.time_white,
        timeBlack: room.active_game.time_black,
        serverTimestampMs: now()
      }
    }
  };
}
