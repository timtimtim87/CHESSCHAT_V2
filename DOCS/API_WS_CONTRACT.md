# CHESSCHAT API + WebSocket Contract

Last updated: 2026-03-09  
Status: Active

## HTTP Contract

### `GET /healthz` (Public)
- Auth: none
- Success `200`
```json
{ "status": "ok", "ts": 1700000000000 }
```

### `GET /api/me` (Authenticated)
- Auth: Cognito access token bearer
- Success `200`
```json
{
  "user": {
    "user_id": "cognito-sub",
    "username": "tim",
    "display_name": "tim",
    "wins": 3,
    "losses": 1,
    "draws": 2
  },
  "needs_username": false
}
```

### `POST /api/profile` (Authenticated)
- Auth: Cognito access token bearer
- Payload
```json
{ "username": "tim.player" }
```
- Username regex: `^[a-z0-9._-]{3,24}$`

### `GET /api/history` (Authenticated)
- Auth: Cognito access token bearer
- Success `200`
```json
{ "games": [] }
```

## WebSocket Contract

## Connection
- Endpoint: `GET /ws?token=<cognito_access_token>`
- Auth failure: close code `4001` with reason `Unauthorized`
- Token must be present for connect and reconnect attempts.

## Inbound Events

### `join_room`
```json
{ "type": "join_room", "roomCode": "ABCDE" }
```

### `leave_room`
```json
{ "type": "leave_room", "roomCode": "ABCDE" }
```

### `start_game`
```json
{ "type": "start_game", "roomCode": "ABCDE" }
```

### `make_move`
```json
{ "type": "make_move", "roomCode": "ABCDE", "move": "e2e4" }
```

### `resign`
```json
{ "type": "resign", "roomCode": "ABCDE" }
```

### `heartbeat`
```json
{ "type": "heartbeat" }
```

## Outbound Events

### `room_joined`
```json
{
  "type": "room_joined",
  "roomCode": "ABCDE",
  "participants": [{ "userId": "user-a", "connected": true }],
  "expiresAt": 1700003600000,
  "activeGame": null
}
```

### `participant_joined` / `participant_left`
```json
{
  "type": "participant_left",
  "roomCode": "ABCDE",
  "userId": "user-b",
  "participants": [
    { "userId": "user-a", "connected": true },
    { "userId": "user-b", "connected": false }
  ]
}
```

### `reconnect_state`
```json
{
  "type": "reconnect_state",
  "roomCode": "ABCDE",
  "status": "paused",
  "disconnectedUserId": "user-b",
  "graceEndsAt": 1700000012000,
  "reconnectVersion": 3
}
```

### `game_started` / `move_made` / `game_ended`
- Payloads include board state, move metadata, clocks, and winner/result fields.

### `video_ready`
```json
{
  "type": "video_ready",
  "meetingData": { "MeetingId": "..." },
  "attendeeData": { "AttendeeId": "..." }
}
```

### `heartbeat_ack`
```json
{ "type": "heartbeat_ack" }
```

### `error`
```json
{
  "type": "error",
  "code": "ROOM_CODE_CONSUMED",
  "message": "Room code has already been used.",
  "retryable": false,
  "context": null
}
```

## Validation Rules
- Room-bound events (`join_room`, `start_game`, `make_move`, `resign`) require 5-char alphanumeric room code.
- Reconnect is accepted only for the same authenticated user and only within active grace window.
- Rematch protocol is removed.
- Room codes are single-use after final teardown.
