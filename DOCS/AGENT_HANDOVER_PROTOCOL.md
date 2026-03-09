# Agent Handover Protocol

This document defines the handover standard for the two-agent model used in CHESSCHAT.
Both Claude Code and Codex must follow this protocol exactly.

---

## Why Handovers Exist

Two agents work on this codebase in sequence, never simultaneously. A handover document
is the contract between them. It ensures the incoming agent knows:
- Exactly what state `main` is in right now
- What was just done and why
- What comes next (and in what order)
- Any hard constraints or gotchas that must not be lost

Handovers live in `DOCS/handovers/`. Each file covers one completed block of work (one merged PR).

---

## Handover File Naming

```
DOCS/handovers/YYYY-MM-DD-NNN-<from>-to-<to>.md
```

- `YYYY-MM-DD` — date the handover was written
- `NNN` — zero-padded sequence number for that day (001, 002, ...)
- `<from>` — agent that did the work: `claude` or `codex`
- `<to>` — agent expected to pick up next: `claude` or `codex`

If the same agent continues without switching, use `<agent>-session` in place of `<from>-to-<to>`:
```
DOCS/handovers/2026-03-09-002-claude-session.md
```

The most recently dated file with the highest sequence number is always the current handover.

---

## When to Write a Handover

Write a handover document **at the end of every PR block**, before the final commit and push.
The handover file must be committed on the same branch as the work, so it merges to `main` with the PR.

This means: write the handover → commit it → push → open PR → merge. Not as a separate PR.

---

## Handover Document Template

```markdown
# Handover: <From Agent> → <To Agent>
Date: YYYY-MM-DD
PR: #<number> — <PR title>
Branch merged: codex/<topic>

## State of main after this merge

- What is live in AWS (if Terraform was applied)
- Current ECS task definition revision
- Any GitHub Actions variables changed

## What was done in this block

Bullet list of concrete changes — files modified, resources created/changed, decisions made.
Be specific enough that the incoming agent does not need to read the PR diff to understand scope.

## Hard constraints carried forward

List any constraints from the master plan or ADRs that the next agent must not violate.
If none are new, write "No changes to constraints — see DOCS/SPLIT_HOST_STAGE_HANDOVER_GUIDE.md".

## What comes next

The next stage/task in order, with branch name and scope.
If this is the last stage, note that explicitly.

## Anything the next agent must do first

- Any manual steps Tim needs to do before the agent can start
- Any validation to confirm before touching code
- Any environment state that needs checking

## Known issues / watch-outs

Anything non-obvious that bit this agent or could bite the next one.
```

---

## Latest Handover

→ `DOCS/handovers/2026-03-10-003-codex-to-claude.md`
