# ADR 0003: V1 JS-Managed Cross-Subdomain Session Cookie

## Status
Accepted (2026-03-09)

## Context
Split-host auth requires a session handoff from apex static auth to app host. A backend-issued HttpOnly token exchange endpoint was not yet implemented.

## Decision
For v1, use JS-managed cookie handoff on `.chess-chat.com`:
- `cc_session` for auth session bootstrap.
- `cc_pending_room` for short-lived pending room handoff.

## Consequences
Positive:
- Fast implementation of split-host handoff.
- No additional backend auth exchange endpoint required in this iteration.

Negative:
- Cookie is XSS-sensitive because it is JS-managed and not HttpOnly.
- Requires explicit hardening follow-up.

## Alternatives Considered
1. Delay split-host until HttpOnly endpoint exists.
- Rejected: slows delivery and portfolio momentum.

2. Keep all auth state in query params.
- Rejected: poor security posture and brittle UX.

## Follow-up
Implement backend-issued HttpOnly session token exchange and retire JS-managed session cookie.
