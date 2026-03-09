# AGENTS.md (Project-Level)

This file defines project-specific operating guidance for AI agents working in this repository.

## Mandatory First Reads Each Session
1. `DOCS/PORTFOLIO_BUILD_PLAYBOOK.md`
2. `infra/RESOURCE_REGISTRY.md`
3. `DOCS/UI_DESIGN_GUIDE.md`
4. `terraform/backend.tf`
5. `terraform/main.tf`
6. `terraform/README.md`

## Working Objective
- Help Tim build CHESSCHAT as an AWS Solutions Architect portfolio project.
- Emphasize AWS, Terraform, security, observability, HA tradeoffs, and interview-ready rationale.
- Keep the work practical and avoid unnecessary complexity.

## Collaboration Expectations
- Teach while doing: explain choices and tradeoffs in plain language.
- Prefer incremental delivery with clear next steps.
- Before edits, summarize intent and expected impact.
- Keep naming consistent with `chesschat` unless explicitly changed.

## Architecture Preference Baseline
- Single final environment with production-style design choices.
- Multi-AZ architecture.
- Cost-aware defaults where tradeoffs are explicit and documented.

## Documentation Rule
- When major decisions are made, update:
  - `DOCS/PORTFOLIO_BUILD_PLAYBOOK.md` (strategy-level decisions)
  - `DOCS/UI_DESIGN_GUIDE.md` (UI/UX decisions, component behavior, visual system changes)
  - `infra/RESOURCE_REGISTRY.md` (concrete IDs/ARNs/state)
  - `portfolio diary/` (day-by-day build log with what was built, how it was built, and decision/thought process)

## UI/UX Decision Rule
- Any substantial UI change must document:
  - What changed (layout, controls, copy, motion, color/typography)
  - Why it changed (usability, clarity, consistency, performance, accessibility)
  - Validation method (manual playtest and/or automated tests)
- Keep MVP UI simple, minimal, and clear unless explicitly overridden.
- Preserve chessboard-first hierarchy in game room layouts unless explicitly changed.

## Portfolio Diary Rule
- Keep daily notes under `portfolio diary/` using one file per day: `YYYY-MM-DD.md`.
- Every substantial session should append or create that day's file with:
  - What changed (infra, code, docs)
  - How it was done (commands, Terraform actions, validation checks)
  - Why decisions were made (tradeoffs, risks, interview-ready rationale)

## Git Workflow Rule
- For any change that requires testing/verification, agents must:
  - Create a branch (prefix with `codex/`)
  - Commit all related changes
  - Push branch to `origin`
  - Open a PR against `main`
- Do not leave stale branches:
  - After a PR is merged, delete the merged branch locally and on remote.
  - Keep only active branches needed for in-flight work.
