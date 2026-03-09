# CHESSCHAT Triage Runbook (Correlation-ID First)

## Goal
Trace one failed user session end-to-end using correlation IDs and app-level metrics.

## Preconditions
- Backend emits `x-correlation-id` on HTTP responses.
- WebSocket sessions log `sessionId` and `connectionId`.
- App metrics are published to CloudWatch namespace `Chesschat/Dev`.

## Example Scenario
User reports reconnect failure and room teardown during a live game.

## Steps
1. Capture the request correlation ID from browser/network logs (or API response header).
2. Search ECS service logs in CloudWatch for:
   - `correlationId=<value>` for HTTP path timeline.
   - `sessionId=<value>` for WebSocket message timeline.
3. Confirm event chain:
   - `ws_connected`
   - inbound `join_room` / `make_move` / `resign`
   - reconnect transition logs (`paused`, `restored`, `forfeit_disconnect`)
   - any `websocket_message_handler_failed` or normalized `error` emissions
   - `ws_disconnected` (if present)
4. Check app counters on operations dashboard:
   - `AppErrors`
   - `WsConnectionsOpened` / `WsConnectionsClosed`
   - `GamesStarted` / `GamesEnded`
5. If `AppErrors` spike correlates with reconnect events:
   - inspect payload shape mismatches first (`INVALID_PAYLOAD`, `INVALID_ROOM_CODE`)
   - then inspect room mutation conflicts (`ROOM_UPDATE_CONFLICT`)
   - inspect lifecycle terminal errors (`ROOM_CODE_CONSUMED`, `ROOM_TERMINATED`, `RECONNECT_WINDOW_EXPIRED`)
6. Record incident summary with:
   - correlation ID / session ID
   - root cause code
   - mitigation and follow-up action

## Fast Queries
- Filter ECS logs by `sessionId` for WS-only trace.
- Filter ECS logs by `correlationId` for HTTP request trace.
- Graph `AppErrors` + `WsConnectionsClosed` over incident window.
