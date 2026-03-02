# CHESSCHAT API + WebSocket Contract Freeze

Last updated: 2026-03-02  
Status: Frozen for Milestone 5 baseline

This document is the single source of truth for HTTP and WebSocket payload contracts used by CHESSCHAT runtime.

## Error Contract (Normalized)

### HTTP Error Shape
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human-readable message",
    "retryable": false,
    "context": null
  }
}
```

### WebSocket Error Shape
```json
{
  "type": "error",
  "code": "STRING_CODE",
  "message": "Human-readable message",
  "retryable": false,
  "context": null
}
```

Unknown event types, malformed JSON, malformed payload envelopes, and invalid room codes must always return the normalized WebSocket error shape.

## HTTP Contract

### `GET /healthz` (Public)
- Auth: none
- Success `200`
```json
{
  "status": "ok",
  "ts": 1700000000000
}
```
- Degraded `503`
```json
{
  "status": "degraded",
  "ts": 1700000000000
}
```

### `GET /api/public-config` (Public)
- Auth: none
- Success `200`
```json
{
  "appDomain": "https://app.chess-chat.com",
  "cognito": {
    "hostedUiBaseUrl": "https://example.auth.us-east-1.amazoncognito.com",
    "clientId": "abc123",
    "redirectUri": "https://app.chess-chat.com/auth/callback",
    "logoutUri": "https://app.chess-chat.com/"
  }
}
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
  }
}
```
- Errors: normalized HTTP error contract (`401`, `500`)

### `GET /api/history` (Authenticated)
- Auth: Cognito access token bearer
- Success `200`
```json
{
  "games": [
    {
      "game_id": "ABCDE-1700000000000",
      "room_code": "ABCDE",
      "white_player_id": "user-a",
      "black_player_id": "user-b",
      "winner": "user-a",
      "result": "checkmate",
      "ended_at": "2026-03-02T00:00:00.000Z"
    }
  ]
}
```
- Errors: normalized HTTP error contract (`401`, `500`)

## WebSocket Contract

## Connection
- Endpoint: `GET /ws?token=<cognito_access_token>`
- Auth failure: close code `4001` with reason `"Unauthorized"`

## Inbound Events (Client -> Server)

### `join_room`
```json
{ "type": "join_room", "roomCode": "ABCDE" }
```

### `leave_room`
```json
{ "type": "leave_room", "roomCode": "ABCDE" }
```
`roomCode` is accepted from client but server disconnect logic uses connection mapping as source-of-truth.

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

### `request_rematch`
```json
{ "type": "request_rematch", "roomCode": "ABCDE" }
```

### `respond_rematch`
```json
{ "type": "respond_rematch", "roomCode": "ABCDE", "accept": true }
```
`accept` must be a boolean; non-boolean values return `INVALID_REMATCH_RESPONSE`.

## Outbound Events (Server -> Client)

### Room + Presence
### `room_joined`
```json
{
  "type": "room_joined",
  "roomCode": "ABCDE",
  "participants": [{ "userId": "user-a", "connected": true }],
  "expiresAt": 1700003600000,
  "activeGame": null,
  "rematchRequestedBy": null
}
```

### `participant_joined`
```json
{
  "type": "participant_joined",
  "roomCode": "ABCDE",
  "userId": "user-b",
  "participants": [
    { "userId": "user-a", "connected": true },
    { "userId": "user-b", "connected": true }
  ]
}
```

### `participant_left`
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

### Reconnect
### `reconnect_state`
```json
{
  "type": "reconnect_state",
  "roomCode": "ABCDE",
  "status": "paused",
  "disconnectedUserId": "user-b",
  "graceEndsAt": 1700000060000
}
```

```json
{
  "type": "reconnect_state",
  "roomCode": "ABCDE",
  "status": "restored",
  "disconnectedUserId": null,
  "graceEndsAt": null
}
```

### Game
### `game_started`
```json
{
  "type": "game_started",
  "gameId": "ABCDE-1700000000000",
  "whitePlayerId": "user-a",
  "blackPlayerId": "user-b",
  "fen": "start",
  "moves": [],
  "moveSans": [],
  "turn": "white",
  "timeWhite": 300,
  "timeBlack": 300,
  "serverTimestampMs": 1700000000000
}
```

### `move_made`
```json
{
  "type": "move_made",
  "move": "e2e4",
  "moveSan": "e4",
  "moves": ["e2e4"],
  "moveSans": ["e4"],
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "turn": "black",
  "timeWhite": 298,
  "timeBlack": 300,
  "serverTimestampMs": 1700000001000
}
```

### `game_ended`
```json
{
  "type": "game_ended",
  "gameId": "ABCDE-1700000000000",
  "winner": "user-a",
  "result": "checkmate",
  "pgn": "1. e4 e5 2. ..."
}
```

### Rematch
### `rematch_requested`
```json
{
  "type": "rematch_requested",
  "roomCode": "ABCDE",
  "requestedBy": "user-a"
}
```

### `rematch_accepted`
```json
{
  "type": "rematch_accepted",
  "roomCode": "ABCDE",
  "requestedBy": "user-a",
  "acceptedBy": "user-b"
}
```

### `rematch_declined`
```json
{
  "type": "rematch_declined",
  "roomCode": "ABCDE",
  "requestedBy": "user-a",
  "declinedBy": "user-b"
}
```

### Supplemental Runtime Events (Active)
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
{
  "type": "heartbeat_ack"
}
```

### Error
### `error`
```json
{
  "type": "error",
  "code": "INVALID_ROOM_CODE",
  "message": "Room code must be 5 characters.",
  "retryable": false,
  "context": {
    "roomCode": "BAD!",
    "eventType": "make_move"
  }
}
```

## Validation Rules
- Room-bound events (`join_room`, `start_game`, `make_move`, `resign`, `request_rematch`, `respond_rematch`) require valid 5-character alphanumeric room code.
- Unknown `type` returns `UNKNOWN_EVENT`.
- Non-object or missing `type` payload returns `INVALID_PAYLOAD`.
- Invalid JSON returns `BAD_JSON`.

## Notes
- Event and route names are frozen by this milestone.
- `video_ready` and `heartbeat_ack` are active documented events and not deprecated.
