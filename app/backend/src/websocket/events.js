export const InboundEvent = {
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  START_GAME: "start_game",
  MAKE_MOVE: "make_move",
  RESIGN: "resign",
  HEARTBEAT: "heartbeat"
};

export const OutboundEvent = {
  ROOM_JOINED: "room_joined",
  PARTICIPANT_JOINED: "participant_joined",
  PARTICIPANT_LEFT: "participant_left",
  VIDEO_READY: "video_ready",
  GAME_STARTED: "game_started",
  MOVE_MADE: "move_made",
  GAME_ENDED: "game_ended",
  HEARTBEAT_ACK: "heartbeat_ack",
  ERROR: "error"
};
