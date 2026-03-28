export const InboundEvent = {
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  START_GAME: "start_game",
  MAKE_MOVE: "make_move",
  RESIGN: "resign",
  REQUEST_TAKEBACK: "request_takeback",
  OFFER_DRAW: "offer_draw",
  ACCEPT_DRAW: "accept_draw",
  HEARTBEAT: "heartbeat"
};

export const OutboundEvent = {
  ROOM_JOINED: "room_joined",
  PARTICIPANT_JOINED: "participant_joined",
  PARTICIPANT_LEFT: "participant_left",
  RECONNECT_STATE: "reconnect_state",
  VIDEO_READY: "video_ready",
  GAME_STARTED: "game_started",
  MOVE_MADE: "move_made",
  TAKEBACK_APPLIED: "takeback_applied",
  DRAW_OFFER_PENDING: "draw_offer_pending",
  DRAW_ACCEPTED: "draw_accepted",
  DRAW_OFFER_STATE: "draw_offer_state",
  GAME_ENDED: "game_ended",
  HEARTBEAT_ACK: "heartbeat_ack",
  ERROR: "error"
};
