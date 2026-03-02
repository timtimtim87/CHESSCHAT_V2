export function forfeitWinnerFromDisconnect(game, disconnectedUserId) {
  if (disconnectedUserId === game.white_player_id) {
    return "black";
  }
  if (disconnectedUserId === game.black_player_id) {
    return "white";
  }
  return "draw";
}

export function reconnectPauseState({
  roomCode,
  disconnectedUserId,
  reconnectGraceSeconds,
  reconnectVersion = null,
  now = Date.now()
}) {
  const graceEndsAt = now + reconnectGraceSeconds * 1000;
  return {
    reconnectDeadlineMs: graceEndsAt,
    event: {
      type: "reconnect_state",
      roomCode,
      status: "paused",
      disconnectedUserId,
      graceEndsAt,
      reconnectVersion
    }
  };
}

export function reconnectRestoredState({ roomCode, reconnectVersion = null }) {
  return {
    type: "reconnect_state",
    roomCode,
    status: "restored",
    disconnectedUserId: null,
    graceEndsAt: null,
    reconnectVersion
  };
}
