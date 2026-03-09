# Handover: Codex -> Claude
Date: 2026-03-10
PR: (to be created) — stage-3 app auth bootstrap (token refresh on reconnect)
Branch merged: codex/stage-3-app-auth-bootstrap

## State of main after this merge

- No AWS/Terraform changes.
- No GitHub Actions variable changes.
- Frontend app-host auth/session bootstrap reliability improved:
  - stale Cognito access tokens now refresh before WS reconnect attempts.

## What was done in this block

- Added `getValidToken()` in frontend auth context:
  - Reads `cc_session`.
  - Applies near-expiry check (`60s` buffer).
  - Calls Cognito `InitiateAuth` with `REFRESH_TOKEN_AUTH` when needed.
  - Returns fresh `access_token` and updates local auth cache.
- Updated socket client to use async token callback:
  - `ChessChatSocket` constructor now takes `getToken`.
  - `connect()` now fetches token per connect/reconnect.
  - Reconnect loop stops when token retrieval fails.
- Updated Room page wiring:
  - passes `getValidToken` to `ChessChatSocket`.
- Added/updated frontend tests for auth refresh and socket reconnect token behavior.

## Hard constraints carried forward

No changes to constraints — see `DOCS/SPLIT_HOST_STAGE_HANDOVER_GUIDE.md`.

## What comes next

- Next stage: Stage 4 — backend/WebSocket room lifecycle correction.
- Branch: `codex/stage-4-room-lifecycle`.
- Required fix: use atomic `teardownRoomAndConsumeCode(...)` before Chime delete path.

## Anything the next agent must do first

1. `git fetch origin`
2. `git checkout main`
3. `git pull --ff-only origin main`
4. `git checkout -b codex/stage-4-room-lifecycle`

## Known issues / watch-outs

- Frontend tests include existing React Router future-flag warnings (non-blocking).
- No backend lifecycle changes are included in this PR; Stage 4 remains outstanding.
