# Docs Index (Source of Truth)

Use this page to know which docs are authoritative for active implementation.

## Authoritative (Use First)
- `PORTFOLIO_BUILD_PLAYBOOK.md`
  - Current architecture goals, tradeoffs, roadmap, and collaboration style.
- `../infra/RESOURCE_REGISTRY.md`
  - Actual account IDs, backend resources, ARNs, and current state.
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
