# CHESSCHAT Next-Agent Handover (2026-03-02)

## Current State
- Branch: `main`
- Latest implementation commit: `1dc7278`
- Core milestone status:
  - Phase 9 functional completion delivered (frontend Chime media wiring live in code).
  - Phase 10 baseline delivered (GitHub OIDC IAM, auto deploy workflow, manual E2E workflow, E2E user cleanup).

## What Is Already Implemented
- Frontend media wiring:
  - `app/frontend/src/services/chime.js`
  - `app/frontend/src/pages/RoomPage.jsx`
  - `app/frontend/src/components/VideoPanel.jsx`
- CI/CD workflows:
  - `.github/workflows/deploy-main.yml`
  - `.github/workflows/e2e-post-deploy.yml`
- Terraform OIDC/IAM:
  - `terraform/modules/github_actions_oidc/*`
  - Root wiring in `terraform/main.tf`, `terraform/variables.tf`, `terraform/outputs.tf`
- ECS drift guard for CI-owned task revisions:
  - `terraform/modules/ecs_compute/main.tf` (`ignore_changes = [task_definition]`)
- E2E script cleanup + env config:
  - `scripts/e2e-live.mjs`

## Applied Infrastructure Outputs (authoritative values)
- GitHub deploy role ARN:
  - `arn:aws:iam::723580627470:role/chesschat-dev-github-actions-deploy-role`
- ECR repo URL:
  - `723580627470.dkr.ecr.us-east-1.amazonaws.com/chesschat-dev-app`
- ECS cluster/service:
  - `chesschat-dev-ecs-cluster`
  - `chesschat-dev-ecs-service`
- Cognito:
  - User pool: `us-east-1_AWq14lBGV`
  - Client ID: `5numi4223d3jnebrlfqboseu42`

## GitHub Settings Prereq (already instructed to user)
Repository Actions settings should have:
- Secret:
  - `AWS_GHA_DEPLOY_ROLE_ARN`
- Variables:
  - `ECR_REPOSITORY_URL`
  - `ECS_CLUSTER_NAME`
  - `ECS_SERVICE_NAME`
  - `COGNITO_USER_POOL_ID`
  - `COGNITO_CLIENT_ID`

## Recommended First Checks for Next Session
1. Restore GitHub CLI auth (`gh auth login`) to unblock PR-evidence and branch-protection automation.
2. Create one intentional failing PR check run and capture screenshot/log as portfolio gate evidence.
3. Enforce required-check branch protection on `main` for:
   - PR Backend Quality
   - PR Frontend Quality
   - PR Terraform Quality
4. Keep post-deploy manual E2E (`e2e-post-deploy`) evidence current with run IDs/timestamps.

## Known Constraints / Notes
- Local `app/frontend/dist/` is now ignored in `.gitignore` and should not be committed.
- Terraform validate still reports existing DynamoDB deprecation warnings (`hash_key`), pre-existing and non-blocking.
- Keep naming convention `chesschat-*` intact unless explicitly changed.
- Milestone 8 runtime evidence now exists under:
  - `/tmp/chesschat-evidence/m8-2026-03-02/`
- ECS service currently runs:
  - `arn:aws:ecs:us-east-1:723580627470:task-definition/chesschat-dev-task:9`
  - Includes `APP_METRICS_NAMESPACE=Chesschat/Dev`.
