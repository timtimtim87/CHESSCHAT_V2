# Handover: Codex -> Claude
Date: 2026-03-10
PR: (to be created) — stage-5: username policy/docs closure
Branch merged: codex/stage-5-username-docs

## State of main after this merge

- No AWS/Terraform apply in this block.
- No GitHub variable updates in this block.
- Stage 5 closure completed as docs/policy verification update.

## What was done in this block

- Verified username policy consistency across required app surfaces:
  - backend username validation (`setUsername`) uses `^[a-z0-9._-]{3,24}$`
  - frontend lobby username validation uses `^[a-z0-9._-]{3,24}$`
  - static-auth signup username validation uses `^[a-z0-9._-]{3,24}$`
- Verified required ADR set already exists and remains current:
  - `DOCS/ADRS/0002-split-host-static-auth-and-app-host.md`
  - `DOCS/ADRS/0003-v1-js-managed-cross-subdomain-cookie.md`
  - `DOCS/ADRS/0004-phone-call-room-lifecycle-and-reconnect-grace.md`
  - `DOCS/ADRS/0005-apple-sign-in-deferred.md`
- Updated stage-governance docs:
  - `DOCS/PORTFOLIO_BUILD_PLAYBOOK.md`
  - `DOCS/UI_DESIGN_GUIDE.md`
  - `infra/RESOURCE_REGISTRY.md`
  - `DOCS/AGENT_HANDOVER_PROTOCOL.md` latest pointer
  - `portfolio diary/2026-03-10.md`

## Hard constraints carried forward

No changes to constraints — see `DOCS/SPLIT_HOST_STAGE_HANDOVER_GUIDE.md`.

## What comes next

- Split-host staged program is complete through Stage 5.
- Next focus returns to remaining non-staged backlog items:
  - tracking/marketing implementation work gated on Tim-provided IDs/verification (GTM/GA4/Meta/Search Console),
  - or next product/runtime reliability priorities selected by Tim.

## Anything the next agent must do first

1. `git fetch origin`
2. `git checkout main`
3. `git pull --ff-only origin main`
4. Confirm which post-stage backlog item Tim wants next before creating a new branch.

## Known issues / watch-outs

- Local untracked `.claude/` directory remains present and is intentionally excluded from commits.
- Previous environment-specific Terraform provider plugin startup/schema issue may recur on `terraform validate` in this workspace.
