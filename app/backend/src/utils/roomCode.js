export const ROOM_CODE_PATTERN = /^[A-Z0-9]{8}$/;

export function normalizeRoomCode(raw) {
  return String(raw || "").toUpperCase().trim();
}

export function isValidRoomCode(code) {
  return ROOM_CODE_PATTERN.test(code);
}
