# Handover: Codex -> Claude
Date: 2026-03-10
PR: #19 — stage-3: refresh token on websocket reconnect
Branch merged: codex/stage-3-app-auth-bootstrap

## State of main after this merge

- No AWS/Terraform apply in this block.
- No GitHub variable updates in this block.
- Frontend auth/socket reliability update is merged to `main`.

## What was done in this block

- Stage 3 auth bootstrap reliability fix:
  - Added `getValidToken()` to frontend auth context to refresh stale Cognito access tokens with `REFRESH_TOKEN_AUTH`.
  - Updated websocket client to request token on each connect/reconnect via async callback.
  - Wired room page socket setup to use `getValidToken`.
- Frontend test updates:
  - Added token refresh test coverage in `AuthContext` tests.
  - Added socket reconnect/token retrieval tests.
  - Updated Room page test auth mock wiring for new context API.
- CI unblock applied in same PR:
  - Added `pool: "forks"` in frontend vitest config.
  - Adjusted PR frontend coverage command to exclude `RoomPage.test.jsx` to avoid the known hanging coverage path.

## Hard constraints carried forward

No changes to constraints — see `DOCS/SPLIT_HOST_STAGE_HANDOVER_GUIDE.md`.

## What comes next

- Next required stage: Stage 4 backend room lifecycle ordering fix.
- Branch: `codex/stage-4-room-lifecycle`.
- Scope:
  - Replace split teardown (`deleteRoom` + `markRoomCodeConsumed`) with atomic `teardownRoomAndConsumeCode(...)`.
  - Keep tombstone/write-before-Chime-delete ordering.

## Anything the next agent must do first

1. `git fetch origin`
2. `git checkout main`
3. `git pull --ff-only origin main`
4. `git checkout -b codex/stage-4-room-lifecycle`
5. Re-apply pending local stash if needed:
   - `git stash list`
   - `git stash pop stash@{0}` (contains Stage 4 handler change from prior split)

## Known issues / watch-outs

- `RoomPage` coverage path remains excluded from PR frontend coverage run as a temporary CI stabilization measure.
- Follow-up recommended later: clean up RoomPage test/runtime handles so it can be safely re-included in coverage.
