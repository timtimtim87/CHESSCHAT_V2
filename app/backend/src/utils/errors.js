const ERROR_CATALOG = {
  UNAUTHORIZED: { message: "Unauthorized.", retryable: false },
  INVALID_ROOM_CODE: { message: "Room code must be 8 characters.", retryable: false },
  ROOM_FULL: { message: "Room already has two players.", retryable: false },
  WAITING_FOR_PLAYER: { message: "Waiting for second player.", retryable: true },
  GAME_ALREADY_ACTIVE: { message: "Game already in progress.", retryable: false },
  GAME_PAUSED: { message: "Game is paused while waiting for reconnect.", retryable: true },
  RECONNECT_WINDOW_EXPIRED: { message: "Reconnect window expired.", retryable: false },
  ROOM_TERMINATED: { message: "Room is no longer available.", retryable: false },
  NO_ACTIVE_GAME: { message: "No active game in this room.", retryable: false },
  NOT_YOUR_TURN: { message: "Wait for your turn.", retryable: false },
  ILLEGAL_MOVE: { message: "Illegal move.", retryable: false },
  ROOM_NOT_FOUND: { message: "Room does not exist.", retryable: false },
  ROOM_UPDATE_CONFLICT: { message: "Concurrent room update detected. Please retry.", retryable: true },
  INVALID_PAYLOAD: { message: "Invalid payload envelope.", retryable: false },
  BAD_JSON: { message: "Invalid JSON payload.", retryable: true },
  UNKNOWN_EVENT: { message: "Unknown event type.", retryable: false },
  INTERNAL_ERROR: { message: "Unexpected error handling request.", retryable: true }
};

export function buildError(code, overrides = {}) {
  const defaults = ERROR_CATALOG[code] || ERROR_CATALOG.INTERNAL_ERROR;
  return {
    code: code || "INTERNAL_ERROR",
    message: overrides.message || defaults.message,
    retryable: typeof overrides.retryable === "boolean" ? overrides.retryable : defaults.retryable,
    context: overrides.context ?? null
  };
}

export function buildHttpError(code, overrides = {}) {
  return { error: buildError(code, overrides) };
}

export function sendHttpError(res, statusCode, code, overrides = {}) {
  res.status(statusCode).json(buildHttpError(code, overrides));
}

export function buildWsError(code, overrides = {}) {
  return {
    type: "error",
    ...buildError(code, overrides)
  };
}

export function normalizeWsPayload(payload) {
  if (!payload || payload.type !== "error") {
    return payload;
  }
  return buildWsError(payload.code, {
    message: payload.message,
    retryable: payload.retryable,
    context: payload.context
  });
}
