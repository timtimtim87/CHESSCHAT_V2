# AGENTS.md

Project-level guidance for Claude Code working in this repository.

---

## Working Objective

Help Tim build CHESSCHAT as an AWS Solutions Architect portfolio project.
Emphasise AWS, Terraform, security, observability, HA tradeoffs, and interview-ready rationale.
Keep the work practical and avoid unnecessary complexity.

---

## Collaboration Style

- Teach while doing: explain choices and tradeoffs in plain language.
- Prefer incremental delivery — one focused PR per topic.
- Before edits, summarise intent and expected impact.
- Keep naming consistent with `chesschat` unless explicitly changed.
- Never push directly to `main`. Always work on a branch and open a PR.

---

## Mandatory Reads at Session Start

1. `DOCS/PORTFOLIO_BUILD_PLAYBOOK.md` — current architecture goals and roadmap
2. `infra/RESOURCE_REGISTRY.md` — actual resource IDs, ARNs, and current infra state
3. `DOCS/UI_DESIGN_GUIDE.md` — UI/UX direction and design decisions

---

## Git Workflow

```sh
git fetch origin
git checkout main && git pull --ff-only origin main
git checkout -b <topic>          # e.g. fix/auth-cookie, feat/delete-account
```

- One branch per topic. Merge before starting the next.
- Commit messages: imperative present tense, explain *why* not just *what*.
- Delete branches after merge (local and remote).

---

## Naming Conventions

| Thing | Pattern | Example |
|-------|---------|---------|
| Branches | `<type>/<topic>` | `fix/auth-cookie`, `feat/delete-account` |
| Terraform resources | `chesschat-<env>-<resource>` | `chesschat-dev-ecs-cluster` |
| AWS Secrets Manager | `chesschat/<env>/<service>/<key>` | `chesschat/dev/google/oauth` |
| ADR files | `DOCS/ADRS/NNNN-<slug>.md` | `DOCS/ADRS/0006-token-refresh.md` |
| Portfolio diary | `portfolio diary/YYYY-MM-DD.md` | `portfolio diary/2026-03-14.md` |

---

## Documentation Rule

When major decisions are made, update:
- `DOCS/PORTFOLIO_BUILD_PLAYBOOK.md` — strategy-level decisions
- `DOCS/UI_DESIGN_GUIDE.md` — UI/UX decisions and visual system changes
- `infra/RESOURCE_REGISTRY.md` — concrete IDs/ARNs after every Terraform apply
- `portfolio diary/YYYY-MM-DD.md` — day-by-day build log

---

## Terraform Workflow

After any `terraform apply`:
```sh
terraform -chdir=terraform output -json
terraform -chdir=terraform state list
```
Then update `infra/RESOURCE_REGISTRY.md` with changed values, and sync any GitHub Actions variables:
```sh
gh variable set <NAME> --body '<value>'
gh variable list
```

---

## Architecture Preference Baseline

- Single environment (`dev`), production-style design choices.
- Multi-AZ architecture.
- Cost-aware defaults — tradeoffs should be explicit and documented.

---

## Pre-PR Checklist

- [ ] Started from latest `main` on a fresh branch
- [ ] Only topic-scoped changes included
- [ ] Tests pass: `npm run test`, `npm run build`, `terraform validate`
- [ ] `infra/RESOURCE_REGISTRY.md` updated if Terraform was applied
- [ ] Portfolio diary entry written for today
