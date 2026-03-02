# CHESSCHAT Next-Agent Handover (2026-03-02)

## Current State
- Branch: `main`
- Latest implementation commit: `b4aec29`
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
1. Confirm first green run of manual E2E workflow in GitHub Actions.
2. Confirm first green run of `deploy-main` from a tiny `main` commit.
3. Capture deployment metadata artifact and ECS service event screenshot/log snippet for portfolio evidence.
4. Update docs/diary with actual workflow run IDs and timestamps.

## Known Constraints / Notes
- Local `app/frontend/dist/` is now ignored in `.gitignore` and should not be committed.
- Terraform validate still reports existing DynamoDB deprecation warnings (`hash_key`), pre-existing and non-blocking.
- Keep naming convention `chesschat-*` intact unless explicitly changed.
