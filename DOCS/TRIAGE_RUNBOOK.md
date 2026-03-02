# CHESSCHAT Triage Runbook (Correlation-ID First)

## Goal
Trace one failed user session end-to-end using correlation IDs and app-level metrics.

## Preconditions
- Backend emits `x-correlation-id` on HTTP responses.
- WebSocket sessions log `sessionId` and `connectionId`.
- App metrics are published to CloudWatch namespace `Chesschat/Dev`.

## Example Scenario
User reports a failed rematch response during reconnect turbulence.

## Steps
1. Capture the request correlation ID from browser/network logs (or API response header).
2. Search ECS service logs in CloudWatch for:
   - `correlationId=<value>` for HTTP path timeline.
   - `sessionId=<value>` for WebSocket message timeline.
3. Confirm event chain:
   - `ws_connected`
   - inbound `request_rematch` or `respond_rematch`
   - any `websocket_message_handler_failed` or normalized `error` emissions
   - `ws_disconnected` (if present)
4. Check app counters on operations dashboard:
   - `AppErrors`
   - `WsConnectionsOpened` / `WsConnectionsClosed`
   - `GamesStarted` / `GamesEnded`
5. If `AppErrors` spike correlates with reconnect events:
   - inspect payload shape mismatches first (`INVALID_PAYLOAD`, `INVALID_ROOM_CODE`, `INVALID_REMATCH_RESPONSE`)
   - then inspect room mutation conflicts (`ROOM_UPDATE_CONFLICT`)
6. Record incident summary with:
   - correlation ID / session ID
   - root cause code
   - mitigation and follow-up action

## Fast Queries
- Filter ECS logs by `sessionId` for WS-only trace.
- Filter ECS logs by `correlationId` for HTTP request trace.
- Graph `AppErrors` + `WsConnectionsClosed` over incident window.
