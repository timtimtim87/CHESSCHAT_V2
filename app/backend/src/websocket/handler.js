import { v4 as uuidv4 } from "uuid";
import { InboundEvent, OutboundEvent } from "./events.js";
import { config } from "../config.js";
import { verifyAccessToken } from "../middleware/auth.js";
import {
  createRoomIfAbsent,
  deleteConnection,
  deleteRoom,
  getConnection,
  getExpiringRooms,
  getRoom,
  mutateRoom,
  removeRoomFromExpiryIndex,
  setConnection
} from "../services/redis.js";
import { createAttendee, createMeeting, deleteMeeting } from "../services/chime.js";
import { applyMove, startNewGame } from "../services/chess.js";
import { saveGameAndUpdateStats } from "../services/dynamodb.js";
import { log } from "../utils/logger.js";
import { registerSocket, sendToConnection, unregisterSocket } from "./state.js";

function send(ws, payload) {
  ws.send(JSON.stringify(payload));
}

function normalizeRoomCode(raw) {
  return String(raw || "").toUpperCase().trim();
}

function isValidRoomCode(code) {
  return /^[A-Z0-9]{5}$/.test(code);
}

function broadcastToRoom(room, payload) {
  Object.values(room.participants).forEach((participant) => {
    sendToConnection(participant.connectionId, payload);
  });
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
  broadcastToRoom(mutation.room, event);
}

async function handleJoinRoom(ws, roomCode) {
  if (!isValidRoomCode(roomCode)) {
    send(ws, { type: OutboundEvent.ERROR, code: "INVALID_ROOM_CODE", message: "Room code must be 5 characters." });
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
        chime_meeting: null
      };

      const created = await createRoomIfAbsent(roomCode, initialRoom);
      if (!created) {
        continue;
      }

      await setConnection(ws.connectionId, { userId: ws.userId, roomCode });
      send(ws, {
        type: OutboundEvent.ROOM_JOINED,
        roomCode,
        participants: Object.keys(initialRoom.participants),
        expiresAt: initialRoom.expiresAt
      });
      return;
    }

    const joinMutation = await mutateRoom(roomCode, (nextRoom) => {
      const participantIds = Object.keys(nextRoom.participants);
      if (!nextRoom.participants[ws.userId] && participantIds.length >= 2) {
        return {
          error: { type: OutboundEvent.ERROR, code: "ROOM_FULL", message: "Room already has two players." }
        };
      }

      nextRoom.participants[ws.userId] = {
        userId: ws.userId,
        connectionId: ws.connectionId,
        joinedAt: nextRoom.participants[ws.userId]?.joinedAt || Date.now(),
        connected: true
      };
      nextRoom.status = Object.keys(nextRoom.participants).length === 2 ? "both_connected" : "waiting";

      return { room: nextRoom };
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
    broadcastToRoom(joinedRoom, {
      type: OutboundEvent.ROOM_JOINED,
      roomCode,
      participants: Object.keys(joinedRoom.participants),
      expiresAt: joinedRoom.expiresAt
    });

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
    type: OutboundEvent.ERROR,
    code: "ROOM_UPDATE_CONFLICT",
    message: "Concurrent room update detected. Please try joining again."
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

    return {
      room: nextRoom,
      meta: {
        type: OutboundEvent.GAME_STARTED,
        gameId: nextRoom.active_game.game_id,
        whitePlayerId,
        blackPlayerId,
        fen: nextRoom.active_game.board_fen,
        turn: nextRoom.active_game.turn,
        timeWhite: nextRoom.active_game.time_white,
        timeBlack: nextRoom.active_game.time_black
      }
    };
  });

  if (!mutation.ok) {
    if (mutation.reason === "not_found") {
      send(ws, { type: OutboundEvent.ERROR, code: "ROOM_NOT_FOUND", message: "Room does not exist." });
      return;
    }
    if (mutation.reason === "aborted" && mutation.error) {
      send(ws, mutation.error);
      return;
    }
    send(ws, {
      type: OutboundEvent.ERROR,
      code: "ROOM_UPDATE_CONFLICT",
      message: "Concurrent room update detected. Please retry."
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
          fen: game.board_fen,
          turn: game.turn,
          timeWhite: game.time_white,
          timeBlack: game.time_black
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
      type: OutboundEvent.ERROR,
      code: "ROOM_UPDATE_CONFLICT",
      message: "Concurrent room update detected. Please retry your move."
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
    return { room: nextRoom };
  });

  if (mutation.ok) {
    broadcastToRoom(mutation.room, {
      type: OutboundEvent.PARTICIPANT_LEFT,
      userId: ws.userId
    });
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
        send(ws, { type: OutboundEvent.ERROR, code: "BAD_JSON", message: "Invalid JSON payload." });
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
          case InboundEvent.HEARTBEAT:
            send(ws, { type: OutboundEvent.HEARTBEAT_ACK });
            break;
          default:
            send(ws, { type: OutboundEvent.ERROR, code: "UNKNOWN_EVENT", message: "Unknown event type." });
        }
      } catch (error) {
        log("error", "websocket_message_handler_failed", {
          connectionId: ws.connectionId,
          userId: ws.userId,
          error: error.message
        });
        send(ws, {
          type: OutboundEvent.ERROR,
          code: "INTERNAL_ERROR",
          message: "Unexpected error handling request."
        });
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
    await Promise.all(expiringRoomCodes.map((roomCode) => handleRoomExpiry(roomCode)));
  }, config.app.heartbeatIntervalMs);
}
