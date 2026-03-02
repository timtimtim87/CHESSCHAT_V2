import { v4 as uuidv4 } from "uuid";
import { InboundEvent, OutboundEvent } from "./events.js";
import { config } from "../config.js";
import { verifyAccessToken } from "../middleware/auth.js";
import {
  clearReconnectDeadline,
  createRoomIfAbsent,
  deleteConnection,
  deleteRoom,
  getExpiredReconnectDeadlines,
  getConnection,
  getExpiringRooms,
  getRoom,
  mutateRoom,
  removeRoomFromExpiryIndex,
  setReconnectDeadline,
  setConnection
} from "../services/redis.js";
import { createAttendee, createMeeting, deleteMeeting } from "../services/chime.js";
import { applyMove, startNewGame } from "../services/chess.js";
import { saveGameAndUpdateStats } from "../services/dynamodb.js";
import { buildWsError, normalizeWsPayload } from "../utils/errors.js";
import { log } from "../utils/logger.js";
import { registerSocket, sendToConnection, unregisterSocket } from "./state.js";

function send(ws, payload) {
  const normalizedPayload =
    payload?.type === OutboundEvent.ERROR
      ? normalizeWsPayload(payload)
      : payload?.code && !payload?.type
        ? buildWsError(payload.code, {
            message: payload.message,
            retryable: payload.retryable,
            context: payload.context
          })
        : payload;
  ws.send(JSON.stringify(normalizedPayload));
}

function normalizeRoomCode(raw) {
  return String(raw || "").toUpperCase().trim();
}

function isValidRoomCode(code) {
  return /^[A-Z0-9]{5}$/.test(code);
}

function broadcastToRoom(room, payload) {
  Object.values(room.participants).forEach((participant) => {
    if (participant.connectionId) {
      sendToConnection(participant.connectionId, payload);
    }
  });
}

function connectedParticipantIds(room) {
  return Object.values(room.participants)
    .filter((participant) => participant.connected)
    .map((participant) => participant.userId);
}

function participantPresence(room) {
  return Object.values(room.participants).map((participant) => ({
    userId: participant.userId,
    connected: Boolean(participant.connected)
  }));
}

function activeGameSnapshot(room) {
  if (!room.active_game) {
    return null;
  }
  return {
    gameId: room.active_game.game_id,
    whitePlayerId: room.active_game.white_player_id,
    blackPlayerId: room.active_game.black_player_id,
    fen: room.active_game.board_fen,
    moves: [...room.active_game.moves],
    moveSans: [...(room.active_game.move_sans || [])],
    turn: room.active_game.turn,
    timeWhite: room.active_game.time_white,
    timeBlack: room.active_game.time_black,
    disconnectDeadlineMs: room.active_game.disconnect_deadline_ms || null,
    disconnectedUserId: room.active_game.disconnected_user_id || null,
    serverTimestampMs: Date.now()
  };
}

function roomJoinedPayload(room, roomCode) {
  return {
    type: OutboundEvent.ROOM_JOINED,
    roomCode,
    participants: participantPresence(room),
    expiresAt: room.expiresAt,
    activeGame: activeGameSnapshot(room),
    rematchRequestedBy: room.rematch_requested_by || null
  };
}

async function endGame(roomCode, result) {
  const mutation = await mutateRoom(roomCode, (nextRoom) => {
    if (!nextRoom.active_game) {
      return { error: { code: "NO_ACTIVE_GAME" } };
    }

    const game = nextRoom.active_game;
    const winnerPlayerId =
      result.winner === "white"
        ? game.white_player_id
        : result.winner === "black"
          ? game.black_player_id
          : "draw";

    const gameRecord = {
      game_id: game.game_id,
      ended_at: new Date().toISOString(),
      room_code: roomCode,
      white_player_id: game.white_player_id,
      black_player_id: game.black_player_id,
      winner: winnerPlayerId,
      result: result.reason,
      total_moves: game.moves.length,
      duration_seconds: Math.floor((Date.now() - game.started_at) / 1000),
      time_white_remaining: Math.floor(game.time_white),
      time_black_remaining: Math.floor(game.time_black),
      pgn_notation: result.pgn || "",
      started_at: new Date(game.started_at).toISOString()
    };

    nextRoom.games_played.push({
      game_id: game.game_id,
      winner: winnerPlayerId,
      result: result.reason,
      ended_at: Date.now()
    });
    nextRoom.active_game = null;
    nextRoom.rematch_requested_by = null;

    return {
      room: nextRoom,
      meta: {
        gameRecord,
        whitePlayerId: game.white_player_id,
        blackPlayerId: game.black_player_id,
        winnerPlayerId,
        event: {
          type: OutboundEvent.GAME_ENDED,
          gameId: game.game_id,
          winner: winnerPlayerId,
          result: result.reason,
          pgn: result.pgn || ""
        }
      }
    };
  });

  if (!mutation.ok) {
    if (mutation.reason !== "aborted" || mutation.error?.code !== "NO_ACTIVE_GAME") {
      log("warn", "end_game_mutation_failed", { roomCode, reason: mutation.reason, error: mutation.error?.code });
    }
    return;
  }

  const { gameRecord, whitePlayerId, blackPlayerId, winnerPlayerId, event } = mutation.meta;
  await saveGameAndUpdateStats(gameRecord, whitePlayerId, blackPlayerId, winnerPlayerId);
  await clearReconnectDeadline(roomCode);
  broadcastToRoom(mutation.room, event);
}

async function handleJoinRoom(ws, roomCode) {
  if (!isValidRoomCode(roomCode)) {
    send(ws, buildWsError("INVALID_ROOM_CODE", { context: { roomCode } }));
    return;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room = await getRoom(roomCode);

    if (!room) {
      const initialRoom = {
        room_code: roomCode,
        status: "waiting",
        participants: {
          [ws.userId]: {
            userId: ws.userId,
            connectionId: ws.connectionId,
            joinedAt: Date.now(),
            connected: true
          }
        },
        created_at: Date.now(),
        expiresAt: Date.now() + config.app.roomTtlSeconds * 1000,
        games_played: [],
        active_game: null,
        rematch_requested_by: null,
        chime_meeting: null
      };

      const created = await createRoomIfAbsent(roomCode, initialRoom);
      if (!created) {
        continue;
      }

      await setConnection(ws.connectionId, { userId: ws.userId, roomCode });
      send(ws, roomJoinedPayload(initialRoom, roomCode));
      return;
    }

    const joinMutation = await mutateRoom(roomCode, (nextRoom) => {
      const participantIds = Object.keys(nextRoom.participants);
      if (!nextRoom.participants[ws.userId] && participantIds.length >= 2) {
        return {
          error: { type: OutboundEvent.ERROR, code: "ROOM_FULL", message: "Room already has two players." }
        };
      }

      const wasConnected = nextRoom.participants[ws.userId]?.connected;
      nextRoom.participants[ws.userId] = {
        userId: ws.userId,
        connectionId: ws.connectionId,
        joinedAt: nextRoom.participants[ws.userId]?.joinedAt || Date.now(),
        connected: true
      };
      const connectedCount = connectedParticipantIds(nextRoom).length;
      nextRoom.status = connectedCount === 2 ? "both_connected" : "waiting";

      let reconnectEvent = null;
      if (nextRoom.active_game && nextRoom.active_game.disconnect_deadline_ms && !wasConnected) {
        nextRoom.active_game.disconnect_deadline_ms = null;
        nextRoom.active_game.disconnected_user_id = null;
        reconnectEvent = {
          type: OutboundEvent.RECONNECT_STATE,
          roomCode,
          status: "restored",
          disconnectedUserId: null,
          graceEndsAt: null
        };
      }

      return {
        room: nextRoom,
        meta: {
          reconnectEvent
        }
      };
    });

    if (!joinMutation.ok) {
      if (joinMutation.reason === "aborted" && joinMutation.error?.code === "ROOM_FULL") {
        send(ws, joinMutation.error);
        return;
      }
      continue;
    }

    const joinedRoom = joinMutation.room;
    await setConnection(ws.connectionId, { userId: ws.userId, roomCode });
    await clearReconnectDeadline(roomCode);

    broadcastToRoom(joinedRoom, {
      type: OutboundEvent.PARTICIPANT_JOINED,
      userId: ws.userId,
      roomCode,
      participants: participantPresence(joinedRoom)
    });

    broadcastToRoom(joinedRoom, roomJoinedPayload(joinedRoom, roomCode));

    if (joinMutation.meta?.reconnectEvent) {
      broadcastToRoom(joinedRoom, joinMutation.meta.reconnectEvent);
    }

    if (joinedRoom.status !== "both_connected" || joinedRoom.chime_meeting) {
      return;
    }

    const meeting = await createMeeting(roomCode);
    const participants = Object.values(joinedRoom.participants);
    const attendees = await Promise.all(
      participants.map((participant) => createAttendee(meeting.MeetingId, participant.userId))
    );

    const videoMutation = await mutateRoom(roomCode, (nextRoom) => {
      if (nextRoom.chime_meeting || nextRoom.status !== "both_connected") {
        return { error: { code: "VIDEO_ALREADY_BOUND" } };
      }
      nextRoom.chime_meeting = {
        meetingId: meeting.MeetingId,
        meetingData: meeting
      };
      return { room: nextRoom };
    });

    if (!videoMutation.ok) {
      await deleteMeeting(meeting.MeetingId).catch(() => null);
      return;
    }

    Object.values(videoMutation.room.participants).forEach((participant) => {
      const attendee = attendees.find((item) => item.ExternalUserId === participant.userId);
      sendToConnection(participant.connectionId, {
        type: OutboundEvent.VIDEO_READY,
        meetingData: meeting,
        attendeeData: attendee
      });
    });
    return;
  }

  send(ws, {
    ...buildWsError("ROOM_UPDATE_CONFLICT", { message: "Concurrent room update detected. Please try joining again." }),
    context: { roomCode }
  });
}

async function handleStartGame(ws, roomCode) {
  const mutation = await mutateRoom(roomCode, (nextRoom) => {
    const players = Object.keys(nextRoom.participants);
    if (players.length !== 2) {
      return {
        error: {
          type: OutboundEvent.ERROR,
          code: "WAITING_FOR_PLAYER",
          message: "Waiting for second player."
        }
      };
    }

    if (nextRoom.active_game) {
      return {
        error: {
          type: OutboundEvent.ERROR,
          code: "GAME_ALREADY_ACTIVE",
          message: "Game already in progress."
        }
      };
    }

    const [whitePlayerId, blackPlayerId] =
      Math.random() < 0.5 ? [players[0], players[1]] : [players[1], players[0]];
    nextRoom.active_game = startNewGame(roomCode, whitePlayerId, blackPlayerId, config.app.gameDurationSeconds);
    nextRoom.active_game.disconnect_deadline_ms = null;
    nextRoom.active_game.disconnected_user_id = null;
    nextRoom.rematch_requested_by = null;

    return {
      room: nextRoom,
      meta: {
        type: OutboundEvent.GAME_STARTED,
        gameId: nextRoom.active_game.game_id,
        whitePlayerId,
        blackPlayerId,
        fen: nextRoom.active_game.board_fen,
        moves: [...nextRoom.active_game.moves],
        moveSans: [...(nextRoom.active_game.move_sans || [])],
        turn: nextRoom.active_game.turn,
        timeWhite: nextRoom.active_game.time_white,
        timeBlack: nextRoom.active_game.time_black,
        serverTimestampMs: Date.now()
      }
    };
  });

  if (!mutation.ok) {
    if (mutation.reason === "not_found") {
      send(ws, buildWsError("ROOM_NOT_FOUND", { context: { roomCode } }));
      return;
    }
    if (mutation.reason === "aborted" && mutation.error) {
      send(ws, mutation.error);
      return;
    }
    send(ws, {
      ...buildWsError("ROOM_UPDATE_CONFLICT"),
      context: { roomCode }
    });
    return;
  }

  broadcastToRoom(mutation.room, mutation.meta);
}

async function handleMakeMove(ws, roomCode, move) {
  const mutation = await mutateRoom(roomCode, (nextRoom) => {
    if (!nextRoom.active_game) {
      return {
        error: { type: OutboundEvent.ERROR, code: "NO_ACTIVE_GAME", message: "No active game in this room." }
      };
    }

    const game = nextRoom.active_game;
    if (game.disconnect_deadline_ms) {
      return {
        error: {
          type: OutboundEvent.ERROR,
          code: "GAME_PAUSED",
          message: "Game is paused while waiting for reconnect.",
          retryable: true,
          context: {
            disconnectedUserId: game.disconnected_user_id,
            graceEndsAt: game.disconnect_deadline_ms
          }
        }
      };
    }

    const expectedPlayer = game.turn === "white" ? game.white_player_id : game.black_player_id;
    if (expectedPlayer !== ws.userId) {
      return { error: { type: OutboundEvent.ERROR, code: "NOT_YOUR_TURN", message: "Wait for your turn." } };
    }

    const elapsed = (Date.now() - game.last_move_at) / 1000;
    if (game.turn === "white") {
      game.time_white = Math.max(0, game.time_white - elapsed);
    } else {
      game.time_black = Math.max(0, game.time_black - elapsed);
    }

    const applied = applyMove(game.board_fen, move);
    if (!applied.ok) {
      return { error: { type: OutboundEvent.ERROR, code: "ILLEGAL_MOVE", message: "Illegal move." } };
    }

    game.board_fen = applied.newFen;
    game.moves.push(move);
    game.move_sans = game.move_sans || [];
    game.move_sans.push(applied.san);
    game.turn = game.turn === "white" ? "black" : "white";
    game.last_move_at = Date.now();

    const timeoutReached = game.time_white <= 0 || game.time_black <= 0;
    const gameEnded = applied.isCheckmate || applied.isStalemate || applied.isDraw || timeoutReached;

    if (gameEnded) {
      const winner = timeoutReached
        ? game.time_white <= 0
          ? "black"
          : "white"
        : applied.isCheckmate
          ? game.turn === "white"
            ? "black"
            : "white"
          : "draw";
      const result = {
        winner,
        reason: timeoutReached
          ? "timeout"
          : applied.isCheckmate
            ? "checkmate"
            : applied.isStalemate
              ? "stalemate"
              : "draw",
        pgn: applied.pgn
      };
      const winnerPlayerId =
        result.winner === "white"
          ? game.white_player_id
          : result.winner === "black"
            ? game.black_player_id
            : "draw";

      const gameRecord = {
        game_id: game.game_id,
        ended_at: new Date().toISOString(),
        room_code: roomCode,
        white_player_id: game.white_player_id,
        black_player_id: game.black_player_id,
        winner: winnerPlayerId,
        result: result.reason,
        total_moves: game.moves.length,
        duration_seconds: Math.floor((Date.now() - game.started_at) / 1000),
        time_white_remaining: Math.floor(game.time_white),
        time_black_remaining: Math.floor(game.time_black),
        pgn_notation: result.pgn || "",
        started_at: new Date(game.started_at).toISOString()
      };

      nextRoom.games_played.push({
        game_id: game.game_id,
        winner: winnerPlayerId,
        result: result.reason,
        ended_at: Date.now()
      });
      nextRoom.active_game = null;

      return {
        room: nextRoom,
        meta: {
          event: {
            type: OutboundEvent.GAME_ENDED,
            gameId: game.game_id,
            winner: winnerPlayerId,
            result: result.reason,
            pgn: result.pgn || ""
          },
          gameRecord,
          whitePlayerId: game.white_player_id,
          blackPlayerId: game.black_player_id,
          winnerPlayerId
        }
      };
    }

    nextRoom.active_game = game;
    return {
      room: nextRoom,
      meta: {
        event: {
          type: OutboundEvent.MOVE_MADE,
          move,
          moveSan: applied.san,
          moves: [...game.moves],
          moveSans: [...(game.move_sans || [])],
          fen: game.board_fen,
          turn: game.turn,
          timeWhite: game.time_white,
          timeBlack: game.time_black,
          serverTimestampMs: Date.now()
        }
      }
    };
  });

  if (!mutation.ok) {
    if (mutation.reason === "aborted" && mutation.error) {
      send(ws, mutation.error);
      return;
    }
    send(ws, {
      ...buildWsError("ROOM_UPDATE_CONFLICT", { message: "Concurrent room update detected. Please retry your move." }),
      context: { roomCode, move }
    });
    return;
  }

  if (mutation.meta.gameRecord) {
    await saveGameAndUpdateStats(
      mutation.meta.gameRecord,
      mutation.meta.whitePlayerId,
      mutation.meta.blackPlayerId,
      mutation.meta.winnerPlayerId
    );
  }

  broadcastToRoom(mutation.room, mutation.meta.event);
}

async function handleResign(ws, roomCode) {
  const room = await getRoom(roomCode);
  if (!room?.active_game) {
    return;
  }

  const game = room.active_game;
  const winner = ws.userId === game.white_player_id ? "black" : "white";
  await endGame(roomCode, { winner, reason: "resign", pgn: "" });
}

async function handleRequestRematch(ws, roomCode) {
  const mutation = await mutateRoom(roomCode, (nextRoom) => {
    if (nextRoom.active_game) {
      return {
        error: { type: OutboundEvent.ERROR, code: "GAME_ALREADY_ACTIVE", message: "Game already in progress." }
      };
    }

    const connectedIds = connectedParticipantIds(nextRoom);
    if (connectedIds.length < 2) {
      return {
        error: { type: OutboundEvent.ERROR, code: "WAITING_FOR_PLAYER", message: "Waiting for second player." }
      };
    }

    if (nextRoom.rematch_requested_by) {
      return {
        error: {
          type: OutboundEvent.ERROR,
          code: "REMATCH_ALREADY_REQUESTED",
          message: "Rematch has already been requested."
        }
      };
    }

    nextRoom.rematch_requested_by = ws.userId;
    return {
      room: nextRoom,
      meta: {
        event: {
          type: OutboundEvent.REMATCH_REQUESTED,
          roomCode,
          requestedBy: ws.userId
        }
      }
    };
  });

  if (!mutation.ok) {
    if (mutation.reason === "aborted" && mutation.error) {
      send(ws, mutation.error);
      return;
    }
    send(ws, buildWsError("ROOM_UPDATE_CONFLICT", { context: { roomCode } }));
    return;
  }

  broadcastToRoom(mutation.room, mutation.meta.event);
}

async function handleRespondRematch(ws, roomCode, accept) {
  const mutation = await mutateRoom(roomCode, (nextRoom) => {
    if (typeof accept !== "boolean") {
      return {
        error: {
          type: OutboundEvent.ERROR,
          code: "INVALID_REMATCH_RESPONSE",
          message: "Invalid rematch response."
        }
      };
    }

    if (!nextRoom.rematch_requested_by) {
      return {
        error: { type: OutboundEvent.ERROR, code: "REMATCH_NOT_PENDING", message: "No pending rematch request." }
      };
    }

    if (nextRoom.rematch_requested_by === ws.userId) {
      return {
        error: { type: OutboundEvent.ERROR, code: "REMATCH_NOT_PENDING", message: "No pending rematch request." }
      };
    }

    const requestedBy = nextRoom.rematch_requested_by;

    if (!accept) {
      nextRoom.rematch_requested_by = null;
      return {
        room: nextRoom,
        meta: {
          event: {
            type: OutboundEvent.REMATCH_DECLINED,
            roomCode,
            requestedBy,
            declinedBy: ws.userId
          }
        }
      };
    }

    const players = Object.keys(nextRoom.participants);
    const [whitePlayerId, blackPlayerId] =
      Math.random() < 0.5 ? [players[0], players[1]] : [players[1], players[0]];
    nextRoom.active_game = startNewGame(roomCode, whitePlayerId, blackPlayerId, config.app.gameDurationSeconds);
    nextRoom.active_game.disconnect_deadline_ms = null;
    nextRoom.active_game.disconnected_user_id = null;
    nextRoom.rematch_requested_by = null;

    return {
      room: nextRoom,
      meta: {
        rematchAcceptedEvent: {
          type: OutboundEvent.REMATCH_ACCEPTED,
          roomCode,
          requestedBy,
          acceptedBy: ws.userId
        },
        gameStartedEvent: {
          type: OutboundEvent.GAME_STARTED,
          gameId: nextRoom.active_game.game_id,
          whitePlayerId,
          blackPlayerId,
          fen: nextRoom.active_game.board_fen,
          moves: [...nextRoom.active_game.moves],
          turn: nextRoom.active_game.turn,
          timeWhite: nextRoom.active_game.time_white,
          timeBlack: nextRoom.active_game.time_black,
          serverTimestampMs: Date.now()
        }
      }
    };
  });

  if (!mutation.ok) {
    if (mutation.reason === "aborted" && mutation.error) {
      send(ws, mutation.error);
      return;
    }
    send(ws, buildWsError("ROOM_UPDATE_CONFLICT", { context: { roomCode } }));
    return;
  }

  if (mutation.meta.rematchAcceptedEvent) {
    broadcastToRoom(mutation.room, mutation.meta.rematchAcceptedEvent);
  } else {
    broadcastToRoom(mutation.room, mutation.meta.event);
  }

  if (mutation.meta.gameStartedEvent) {
    broadcastToRoom(mutation.room, mutation.meta.gameStartedEvent);
  }
}

async function handleLeaveRoom(ws) {
  const connection = await getConnection(ws.connectionId);
  if (!connection) {
    return;
  }

  const room = await getRoom(connection.roomCode);
  if (!room) {
    await deleteConnection(ws.connectionId);
    return;
  }

  const mutation = await mutateRoom(connection.roomCode, (nextRoom) => {
    if (!nextRoom.participants[ws.userId]) {
      return { error: { code: "PARTICIPANT_NOT_FOUND" } };
    }

    nextRoom.participants[ws.userId].connected = false;
    nextRoom.participants[ws.userId].connectionId = null;
    const connectedIds = connectedParticipantIds(nextRoom);
    nextRoom.status = connectedIds.length === 2 ? "both_connected" : "waiting";

    let reconnectEvent = null;
    let reconnectDeadlineMs = null;
    if (nextRoom.active_game && connectedIds.length === 1) {
      reconnectDeadlineMs = Date.now() + config.app.reconnectGraceSeconds * 1000;
      nextRoom.active_game.disconnect_deadline_ms = reconnectDeadlineMs;
      nextRoom.active_game.disconnected_user_id = ws.userId;
      reconnectEvent = {
        type: OutboundEvent.RECONNECT_STATE,
        roomCode: connection.roomCode,
        status: "paused",
        disconnectedUserId: ws.userId,
        graceEndsAt: reconnectDeadlineMs
      };
    }

    return {
      room: nextRoom,
      meta: {
        reconnectEvent,
        reconnectDeadlineMs
      }
    };
  });

  if (mutation.ok) {
    if (mutation.meta?.reconnectDeadlineMs) {
      await setReconnectDeadline(connection.roomCode, mutation.meta.reconnectDeadlineMs);
    } else {
      await clearReconnectDeadline(connection.roomCode);
    }

    broadcastToRoom(mutation.room, {
      type: OutboundEvent.PARTICIPANT_LEFT,
      userId: ws.userId,
      roomCode: connection.roomCode,
      participants: participantPresence(mutation.room)
    });

    broadcastToRoom(mutation.room, roomJoinedPayload(mutation.room, connection.roomCode));

    if (mutation.meta?.reconnectEvent) {
      broadcastToRoom(mutation.room, mutation.meta.reconnectEvent);
    }
  }

  await deleteConnection(ws.connectionId);
}

async function handleRoomExpiry(roomCode) {
  const room = await getRoom(roomCode);
  if (!room) {
    await removeRoomFromExpiryIndex(roomCode);
    return;
  }

  if (room.active_game) {
    await endGame(roomCode, { winner: "draw", reason: "room_expired", pgn: "" });
  }

  if (room.chime_meeting?.meetingId) {
    await deleteMeeting(room.chime_meeting.meetingId).catch(() => null);
  }

  await deleteRoom(roomCode);
}

async function handleReconnectTimeout(roomCode) {
  const room = await getRoom(roomCode);
  if (!room?.active_game || !room.active_game.disconnect_deadline_ms) {
    await clearReconnectDeadline(roomCode);
    return;
  }

  if (Date.now() < room.active_game.disconnect_deadline_ms) {
    return;
  }

  const disconnectedUserId = room.active_game.disconnected_user_id;
  if (!disconnectedUserId) {
    await clearReconnectDeadline(roomCode);
    return;
  }

  const winner =
    disconnectedUserId === room.active_game.white_player_id
      ? "black"
      : disconnectedUserId === room.active_game.black_player_id
        ? "white"
        : "draw";

  await endGame(roomCode, { winner, reason: "forfeit_disconnect", pgn: "" });
}

export function installWebSocketServer(wss) {
  wss.on("connection", async (ws, req) => {
    const requestUrl = new URL(req.url, "https://placeholder");
    const token = requestUrl.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Unauthorized");
      return;
    }

    let auth;
    try {
      auth = await verifyAccessToken(token);
    } catch {
      ws.close(4001, "Unauthorized");
      return;
    }

    ws.connectionId = uuidv4();
    ws.userId = auth.sub;
    ws.isAlive = true;

    registerSocket(ws.connectionId, ws);

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        send(ws, buildWsError("BAD_JSON"));
        return;
      }

      try {
        const roomCode = normalizeRoomCode(message.roomCode);
        switch (message.type) {
          case InboundEvent.JOIN_ROOM:
            await handleJoinRoom(ws, roomCode);
            break;
          case InboundEvent.LEAVE_ROOM:
            await handleLeaveRoom(ws);
            break;
          case InboundEvent.START_GAME:
            await handleStartGame(ws, roomCode);
            break;
          case InboundEvent.MAKE_MOVE:
            await handleMakeMove(ws, roomCode, message.move);
            break;
          case InboundEvent.RESIGN:
            await handleResign(ws, roomCode);
            break;
          case InboundEvent.REQUEST_REMATCH:
            await handleRequestRematch(ws, roomCode);
            break;
          case InboundEvent.RESPOND_REMATCH:
            await handleRespondRematch(ws, roomCode, message.accept);
            break;
          case InboundEvent.HEARTBEAT:
            send(ws, { type: OutboundEvent.HEARTBEAT_ACK });
            break;
          default:
            send(ws, buildWsError("UNKNOWN_EVENT", { context: { eventType: message.type } }));
        }
      } catch (error) {
        log("error", "websocket_message_handler_failed", {
          connectionId: ws.connectionId,
          userId: ws.userId,
          error: error.message
        });
        send(ws, buildWsError("INTERNAL_ERROR"));
      }
    });

    ws.on("close", async () => {
      await handleLeaveRoom(ws).catch(() => null);
      unregisterSocket(ws.connectionId);
    });
  });

  setInterval(async () => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });

    const expiringRoomCodes = await getExpiringRooms(Date.now() + 60_000);
    const reconnectDeadlineRooms = await getExpiredReconnectDeadlines(Date.now());
    await Promise.all(expiringRoomCodes.map((roomCode) => handleRoomExpiry(roomCode)));
    await Promise.all(reconnectDeadlineRooms.map((roomCode) => handleReconnectTimeout(roomCode)));
  }, config.app.heartbeatIntervalMs);
}
