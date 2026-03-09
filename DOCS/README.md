# Docs Index (Source of Truth)

Use this page to know which docs are authoritative for active implementation.

## Authoritative (Use First)
- `AGENT_HANDOVER_PROTOCOL.md`
  - **Start here if you are an AI agent.** Defines the two-agent handover model (Claude Code + Codex) and links to the latest handover document in `handovers/`.
- `handovers/`
  - Per-PR handover documents. Always read the most recently dated file before starting any work.
- `PORTFOLIO_BUILD_PLAYBOOK.md`
  - Current architecture goals, tradeoffs, roadmap, and collaboration style.
- `UI_DESIGN_GUIDE.md`
  - Current UI/UX direction, MVP control inventory, and design decision logging process.
- `../infra/RESOURCE_REGISTRY.md`
  - Actual account IDs, backend resources, ARNs, and current state.
- `NEXT_AGENT_HANDOVER_YYYY-MM-DD.md` and active stage handover guides
  - Session continuity contract for whichever agent (Codex or Claude Code) works next.
- `ADRS/`
  - Canonical location for Architecture Decision Records (ADRs).
- `terraform-guide.md`
  - Current Terraform workflow for this repository/backend configuration.

## Reference / Legacy Templates (Use With Adaptation)
- `chess-platform-architecture-guide.md`
- `chess-platform-implementation-guide.md`
- `diagram-guide.md`

These guides contain valuable concepts and interview material, but include historical placeholder values (for example `chess-platform`) and earlier assumptions. Always reconcile with the authoritative docs above before applying commands/config.

## Quick Safety Rule
Before executing any command from docs, verify:
1. Account ID matches `723580627470`
2. Naming aligns with `chesschat` strategy unless intentionally overridden
3. Terraform backend assumptions match `terraform/backend.tf`
