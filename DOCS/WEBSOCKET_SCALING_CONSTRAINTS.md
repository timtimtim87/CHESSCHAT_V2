# WebSocket Scaling Constraints (Current Baseline)

Last updated: 2026-03-28

## Current guardrails
- Realtime connection routing is currently single-task oriented in app memory.
- ECS desired count remains `1` for realtime correctness until cross-task WS fanout/session routing is implemented.

## ALB stickiness requirement for WS
- ALB target group stickiness is enabled with `lb_cookie` (`AWSALB`) and 24h duration (`86400` seconds).
- Operational assumption: websocket upgrade requests reuse same-origin cookies, including `AWSALB`, so the upgraded connection stays pinned to one target.
- If stickiness is disabled or too short-lived, reconnects can land on a different task and break in-memory room/connection routing.

## Verification checklist before horizontal scaling
1. Confirm target group stickiness remains enabled (`lb_cookie`).
2. Confirm `AWSALB` cookie is present on websocket upgrade requests in browser network traces.
3. Confirm stickiness TTL exceeds expected session duration.
4. Implement distributed WS connection routing/state before setting ECS desired count above `1`.
