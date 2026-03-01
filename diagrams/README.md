# Diagrams Approach

CHESSCHAT diagrams are maintained in a SaaS diagramming tool (for example, Miro or Brainboard), not with code-first diagram packages.

## Decision
- Code-generated diagram sources and outputs were intentionally removed from this repository.
- Local diagram-specific package environments and helper scripts were removed.
- This folder is kept only to document the diagramming approach and repository policy.

## Repository Rule
- Do not add PlantUML, Graphviz, Python `diagrams`, or Inframap assets/scripts in this folder.
- Keep architecture diagrams in the chosen SaaS platform and export final artifacts to portfolio docs only when needed.

## Current Diagram Update Checklist (2026-03-01)
- Infrastructure diagram:
  - Show ECS tasks in private app subnets with `assign_public_ip = false`.
  - Show SG path: Internet -> ALB SG (`sg-0d04ffe829ce755f0`) -> ECS SG (`sg-0c22505653f5a2167`) -> Redis SG (`sg-0ffc201a5034c25ee`).
  - Include ALB ARN suffix `app/chesschat-dev-alb/3f386d7f443ecbd1` and target group suffix `targetgroup/chesschat-dev-app-tg/ab03b244c7e6560f`.
- Delivery/operations diagram:
  - Add GitHub Actions OIDC federation:
    - OIDC provider `arn:aws:iam::723580627470:oidc-provider/token.actions.githubusercontent.com`
    - Deploy role `arn:aws:iam::723580627470:role/chesschat-dev-github-actions-deploy-role`
  - Show push-to-main flow: Build -> ECR (`chesschat-dev-app`) -> Register task definition -> ECS service update.
  - Show manual `workflow_dispatch` E2E gate calling `scripts/e2e-live.mjs`.
- Application sequence diagram:
  - Update room flow to include real Chime media attach on `video_ready` + user click "Join Media".
