# Diagrams Approach

CHESSCHAT diagrams are maintained in native Draw.io/diagrams.net formats and can be edited in VS Code with the Draw.io extension or in diagrams.net directly.

## Decision
- Keep architecture diagrams as source-controlled `.drawio` files for clean diffs and iterative edits.
- Avoid code-generated diagram toolchains in this repo (PlantUML/Graphviz/Python diagrams/Inframap scripts).
- Prefer Draw.io-native artifacts and export to SVG/PNG only when needed for docs/presentations.

## Repository Rule
- Do not add PlantUML, Graphviz, Python `diagrams`, or Inframap assets/scripts in this folder.
- Add/edit only Draw.io-native sources (`.drawio`) plus optional exported assets.

## Current Draw.io Artifacts (2026-03-07)
- `diagrams/chesschat-system-context.drawio`
- `diagrams/chesschat-runtime-topology.drawio`
- `diagrams/chesschat-delivery-iam.drawio`
- AWS icon library copies:
  - `diagrams/chesschat-system-context-aws-icons.drawio`
  - `diagrams/chesschat-runtime-topology-aws-icons.drawio`
  - `diagrams/chesschat-delivery-iam-aws-icons.drawio`
- Supporting markdown draft: `diagrams/chesschat-cloud-architecture-draft.md`

## Editing Workflow (VS Code Draw.io Extension)
1. Open any `.drawio` file in VS Code.
2. If prompted, use `View: Reopen Editor With...` and choose Draw.io editor.
3. Save normally; files stay plain XML for readable git diffs.
4. Optional exports:
   - Use Draw.io UI export options, or
   - Use `Draw.io: Convert To...` to generate `.drawio.svg` / `.drawio.png` when needed.

## Notes
- `.drawio` is preferred in this repository because diffs are easier to review than embedded XML in image files.
- `.drawio.svg` is useful when embedding directly into README pages.
- Naming convention:
  - base flowchart versions: `*.drawio`
  - AWS icon-library versions: `*-aws-icons.drawio`

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
