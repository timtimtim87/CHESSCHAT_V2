# ADR 0004: Phone-Call Room Lifecycle with Short Reconnect Grace

## Status
Accepted (2026-03-09)

## Context
Persistent room/rejoin/rematch behavior created ambiguous lifecycle states and stale room/code reuse risk.

## Decision
Use phone-call room lifecycle semantics:
- Room is active only during live participation.
- Reconnect grace is short (default 12 seconds).
- If grace expires, final teardown occurs and room code is consumed (single-use policy).
- Rematch protocol is removed; users create a new room.

## Consequences
Positive:
- Deterministic lifecycle and simpler reconnect policy.
- Lower stale-room risk and cleaner teardown model.

Negative:
- Less forgiving reconnect window for unstable networks.
- Requires users to create a new room after game/session end.

## Alternatives Considered
1. Keep long reconnect windows and rematch in same room.
- Rejected: higher state complexity and stale-room risk.

2. Keep room code reusable after teardown.
- Rejected: weaker lifecycle guarantees and race risk.
