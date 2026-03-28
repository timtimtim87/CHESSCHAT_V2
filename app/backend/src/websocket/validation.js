import { InboundEvent } from "./events.js";
import { buildWsError } from "../utils/errors.js";
import { isValidRoomCode, normalizeRoomCode } from "../utils/roomCode.js";

const ROOM_BOUND_EVENTS = new Set([
  InboundEvent.JOIN_ROOM,
  InboundEvent.START_GAME,
  InboundEvent.MAKE_MOVE,
  InboundEvent.RESIGN,
  InboundEvent.REQUEST_TAKEBACK,
  InboundEvent.OFFER_DRAW,
  InboundEvent.ACCEPT_DRAW
]);

export function requiresRoomCode(eventType) {
  return ROOM_BOUND_EVENTS.has(eventType);
}

export function validateInboundEnvelope(message) {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return { ok: false, error: buildWsError("INVALID_PAYLOAD") };
  }

  if (typeof message.type !== "string" || message.type.length === 0) {
    return { ok: false, error: buildWsError("INVALID_PAYLOAD") };
  }

  return { ok: true };
}

export function validateRoomCodeForEvent(message) {
  if (!requiresRoomCode(message.type)) {
    return { ok: true, roomCode: null };
  }

  const roomCode = normalizeRoomCode(message.roomCode);
  if (!isValidRoomCode(roomCode)) {
    return {
      ok: false,
      error: buildWsError("INVALID_ROOM_CODE", {
        context: { roomCode, eventType: message.type }
      })
    };
  }

  return { ok: true, roomCode };
}

export { isValidRoomCode, normalizeRoomCode };
