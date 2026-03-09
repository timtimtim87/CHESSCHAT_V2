# AGENTS.md (Project-Level)

This file defines project-specific operating guidance for AI agents working in this repository.
It applies to **all agents** — currently Claude Code and Codex — equally.

---

## Two-Agent Model

This project uses two AI agents. They never work simultaneously. They hand off via merged PRs.

| Agent | Invoked by | Typical strengths |
|-------|-----------|-------------------|
| **Claude Code** | Tim, via Claude desktop | Architecture, Terraform, broad codebase reasoning, guided walkthroughs |
| **Codex** | Tim, via OpenAI | Focused code generation, implementing well-scoped tasks |

**Rules for both agents:**
- One agent works at a time on one branch. The other does not touch code until that PR is merged.
- Every block of work ends with a PR merged to `main`.
- At the start of every session, sync with latest `origin/main` and start from a fresh `codex/<topic>` branch. Never continue work from a branch that is behind `main`.
- Before starting work, **always read the latest handover document** in `DOCS/handovers/`. Read the most recently dated file. This tells you what the previous agent did and what comes next.
- After completing a PR block, **always write a new handover document** before stopping. See `DOCS/AGENT_HANDOVER_PROTOCOL.md` for the exact format.

---

## Mandatory First Reads Each Session

1. `DOCS/AGENT_HANDOVER_PROTOCOL.md` — read the protocol, then read the latest handover file it links to
2. `DOCS/PORTFOLIO_BUILD_PLAYBOOK.md`
3. `infra/RESOURCE_REGISTRY.md`
4. `DOCS/UI_DESIGN_GUIDE.md`
5. `terraform/backend.tf`
6. `terraform/main.tf`

---

## Working Objective

- Help Tim build CHESSCHAT as an AWS Solutions Architect portfolio project.
- Emphasize AWS, Terraform, security, observability, HA tradeoffs, and interview-ready rationale.
- Keep the work practical and avoid unnecessary complexity.

---

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

---

## Architecture Preference Baseline

- Single final environment with production-style design choices.
- Multi-AZ architecture.
- Cost-aware defaults where tradeoffs are explicit and documented.

---

## Git Workflow Rule

Branch prefix: **`codex/`** — used by **both agents**. This is intentional. The prefix denotes
a structured unit of work, not the OpenAI Codex product specifically.

### Session Start Sync Rule (Mandatory)

Before any code changes in every session (Codex and Claude Code):
1. `git fetch origin`
2. `git checkout main`
3. `git pull --ff-only origin main`
4. `git branch --no-merged main` (optional cleanup visibility)
5. `git checkout -b codex/<topic>`

If the current working branch is behind `main`, the agent must not continue on it.
Create a new branch from updated `main` and continue there.

For any change that requires testing/verification:
1. `git checkout -b codex/<stage-or-topic>` — branch off latest `main`
2. Implement only the scoped work for this branch — no cross-stage changes
3. Run validation for all touched surfaces (see Consistency Checklist below)
4. Commit with a descriptive, stage-scoped message
5. Push branch and open PR to `main` — include validation evidence in the PR body
6. Merge only after CI checks pass
7. Delete the branch after merge (locally and on remote)
8. Write a handover document and commit it **before** the final push on this branch (so it merges with the PR)

**Never:**
- Work across multiple stages in a single branch
- Leave stale branches after merge
- Push directly to `main`
- Amend commits that are already pushed (create new commits instead)
- Skip the handover document at the end of a session

---

## Naming Conventions (both agents must follow exactly)

| Thing | Pattern | Example |
|-------|---------|---------|
| Branch | `codex/<topic>` | `codex/stage-3-app-auth-bootstrap` |
| Terraform resources | `chesschat-<env>-<resource>` | `chesschat-dev-ecs-cluster` |
| AWS Secrets Manager paths | `chesschat/<env>/<service>/<key>` | `chesschat/dev/google/oauth` |
| ADR files | `DOCS/ADRS/NNNN-<slug>.md` | `DOCS/ADRS/0006-token-refresh.md` |
| Handover files | `DOCS/handovers/YYYY-MM-DD-NNN-<from>-to-<to>.md` | `DOCS/handovers/2026-03-09-001-claude-to-codex.md` |
| Portfolio diary | `portfolio diary/YYYY-MM-DD.md` | `portfolio diary/2026-03-09.md` |

The `<from>` and `<to>` fields in handover filenames use `claude` or `codex` lowercase. If the
same agent is continuing (no switch), use `<agent>-session` instead of `<from>-to-<to>`.

---

## Documentation Rule

When major decisions are made, update:
- `DOCS/PORTFOLIO_BUILD_PLAYBOOK.md` — strategy-level decisions
- `DOCS/UI_DESIGN_GUIDE.md` — UI/UX decisions, component behavior, visual system changes
- `infra/RESOURCE_REGISTRY.md` — concrete IDs/ARNs/state (always after a Terraform apply)
- `portfolio diary/YYYY-MM-DD.md` — day-by-day build log
- `DOCS/handovers/` — one new handover doc per completed PR block

---

## UI/UX Decision Rule

Any substantial UI change must document:
- What changed (layout, controls, copy, motion, color/typography)
- Why it changed (usability, clarity, consistency, performance, accessibility)
- Validation method (manual playtest and/or automated tests)

Keep MVP UI simple, minimal, and clear unless explicitly overridden.
Preserve chessboard-first hierarchy in game room layouts unless explicitly changed.

---

## Portfolio Diary Rule

Keep daily notes under `portfolio diary/` using one file per day: `YYYY-MM-DD.md`.
Every substantial session should append or create that day's file with:
- What changed (infra, code, docs)
- How it was done (commands, Terraform actions, validation checks)
- Why decisions were made (tradeoffs, risks, interview-ready rationale)

---

## Terraform Workflow Rule

After any `terraform apply`:
```sh
terraform -chdir=terraform output -json
terraform -chdir=terraform state list
```
Then:
- Update `infra/RESOURCE_REGISTRY.md` with any changed values
- Update GitHub repo variables if deploy workflow inputs changed:
  ```sh
  gh variable set <NAME> --body '<value>'
  gh variable list   # verify
  ```

---

## Consistency Checklist (run before opening any PR)

- [ ] Session started by syncing `main` (`fetch` + `pull --ff-only`) and creating a fresh `codex/<topic>` branch
- [ ] Branch name follows `codex/<topic>` pattern
- [ ] Only stage-scoped changes included — no cross-stage drift
- [ ] All touched test surfaces pass (`npm run test`, `npm run build`, `terraform validate`)
- [ ] PR body includes validation evidence (commands run + output or reference)
- [ ] `infra/RESOURCE_REGISTRY.md` updated if Terraform was applied
- [ ] Portfolio diary entry written or appended for today
- [ ] Handover document written and committed on this branch (merges to `main` with the PR)
