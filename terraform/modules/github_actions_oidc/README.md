# GitHub Actions OIDC module

Purpose: provision a least-privilege IAM role for GitHub Actions deployments without long-lived AWS keys.

## Resources
- IAM OIDC provider for `https://token.actions.githubusercontent.com`
- IAM role trusted for one repository/branch subject
- Inline role policy for:
  - ECR push/pull actions
  - ECS deploy actions (describe/register/update)
  - `iam:PassRole` scoped to ECS task execution/task roles

## Inputs
- `github_repository` (`owner/repo`)
- `github_branch` (default `main`)
- `ecr_repository_arn`
- `ecs_cluster_name`
- `ecs_service_name`
- `task_execution_role_arn`
- `task_role_arn`

## Outputs
- `deploy_role_arn`
- `oidc_provider_arn`
