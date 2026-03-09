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
- Only one AI agent should actively work on the repo at a time (no parallel agent sessions).

## Cross-Agent Continuity Rule (Codex <-> Claude Code)
- Codex and Claude Code must follow the same workflow and leave a clean handoff after each substantial session.
- At session end, the active agent must:
  1. Update handover context for the next agent:
     - Add/update `DOCS/NEXT_AGENT_HANDOVER_YYYY-MM-DD.md` for broad session handoff, and/or
     - Add/update stage-specific handoff docs when a staged program is active (for example split-host guides).
  2. Update required decision/state docs when applicable:
     - `DOCS/PORTFOLIO_BUILD_PLAYBOOK.md`
     - `DOCS/UI_DESIGN_GUIDE.md`
     - `infra/RESOURCE_REGISTRY.md`
  3. Append the day log in `portfolio diary/YYYY-MM-DD.md` with what/how/why and validation evidence.
  4. Commit, push, and open a PR to `main` so the next agent starts from merge-ready context.
- Handoffs must include concrete identifiers where relevant (branch name, commit SHA, run IDs, resource IDs/ARNs, pending risks, and exact next step).

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
