# Terraform Workspace

## Layout
- `backend.tf`: configure remote state (S3 bucket + `use_lockfile` state locking).
- `providers.tf` / `versions.tf`: pin providers and Terraform core version.
- `variables.tf`: define global inputs consumed across modules.
- `main.tf`: wires all reusable modules together with shared tags.
- `outputs.tf`: expose simple signals confirming each module is included.
- `modules/*`: single-responsibility modules (vpc, networking, compute, data, identity, DNS, monitoring).
  - Implemented: `modules/vpc`, `modules/dynamodb`, `modules/elasticache`, `modules/cognito`, `modules/ecs` (identity), `modules/ecs_compute`, `modules/alb`, `modules/static_edge`, `modules/route53`, `modules/monitoring`, `modules/github_actions_oidc`
- `terraform.tfvars.example`: start point for environment-specific values.
- `environments/`: consume the shared modules with `-var-file` or a dedicated workspace for each environment.

## Next steps
1. Copy `terraform.tfvars.example` to `terraform.tfvars` and customize per environment.
2. Mirror the `environments/dev` folder for staging/prod with environment-specific overrides.
3. In GitHub repository settings, create Actions secrets/vars expected by workflows:
   - Secret: `AWS_GHA_DEPLOY_ROLE_ARN` (value from `terraform output github_actions_deploy_role_arn`)
   - Vars: `ECR_REPOSITORY_URL`, `ECS_CLUSTER_NAME`, `ECS_SERVICE_NAME`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `STATIC_SITE_BUCKET`, `STATIC_CLOUDFRONT_DISTRIBUTION_ID`, `COGNITO_HOSTED_UI_BASE_URL`, `APP_HOST`
4. Keep ECS deploy ownership split:
   - Terraform owns infrastructure shape.
   - CI deploy workflow owns ECS task definition revision updates (`ignore_changes = [task_definition]` in ECS service).
