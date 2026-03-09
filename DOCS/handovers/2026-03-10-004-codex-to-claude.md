# Handover: Codex -> Claude
Date: 2026-03-10
PR: (to be created) — stage-4: enforce atomic room teardown ordering
Branch merged: codex/stage-4-room-lifecycle

## State of main after this merge

- No AWS/Terraform apply in this block.
- No GitHub variable updates in this block.
- Backend room lifecycle ordering correction prepared in code for Stage 4 merge.

## What was done in this block

- Stage 4 backend/WebSocket teardown fix in `app/backend/src/websocket/handler.js`:
  - Replaced split teardown flow (`deleteRoom` then `markRoomCodeConsumed`) with atomic `teardownRoomAndConsumeCode(...)`.
  - Moved tombstone + room delete to execute before Chime meeting deletion path.
  - Updated Redis imports to remove `deleteRoom` / `markRoomCodeConsumed` and use `teardownRoomAndConsumeCode`.
- Preserved required ordering:
  1. terminal state gate via `beginRoomTerminalState(...)`
  2. atomic Redis teardown + tombstone write
  3. Chime delete with retry/log behavior unchanged

## Hard constraints carried forward

No changes to constraints — see `DOCS/SPLIT_HOST_STAGE_HANDOVER_GUIDE.md`.

## What comes next

- Next required stage: Stage 5 username policy + docs/ADR consolidation.
- Branch: `codex/stage-5-username-docs`.
- Scope:
  - Verify/enforce username policy `^[a-z0-9._-]{3,24}$` consistently across app surfaces.
  - Complete required docs/ADR updates listed in stage guide.

## Anything the next agent must do first

1. `git fetch origin`
2. `git checkout main`
3. `git pull --ff-only origin main`
4. `gh pr list` (confirm Stage 4 PR state before starting Stage 5 branch)

## Known issues / watch-outs

- `terraform -chdir=terraform validate` failed in this local environment due Terraform provider plugin startup/schema loading error (aws/random plugins), not due Terraform code edits in this branch.
- Frontend build still reports existing large bundle warning and `eval` warning in protobuf dependency; unchanged in this stage.
- Local untracked `.claude/` directory remains present and is not part of this PR.
