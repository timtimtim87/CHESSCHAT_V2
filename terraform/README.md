# Terraform Workspace

## Layout
- `backend.tf`: configure remote state (S3 bucket + `use_lockfile` state locking).
- `providers.tf` / `versions.tf`: pin providers and Terraform core version.
- `variables.tf`: define global inputs consumed across modules.
- `main.tf`: wires all reusable modules together with shared tags.
- `outputs.tf`: expose simple signals confirming each module is included.
- `modules/*`: single-responsibility modules (vpc, networking, compute, data, identity, DNS, monitoring).
  - Implemented: `modules/vpc`, `modules/dynamodb`, `modules/elasticache`, `modules/cognito`, `modules/ecs` (identity), `modules/ecs_compute`, `modules/alb`, `modules/route53`, `modules/monitoring`
- `terraform.tfvars.example`: start point for environment-specific values.
- `environments/`: consume the shared modules with `-var-file` or a dedicated workspace for each environment.

## Next steps
1. Copy `terraform.tfvars.example` to `terraform.tfvars` and customize per environment.
2. Mirror the `environments/dev` folder for staging/prod with environment-specific overrides.
3. Push a bootstrap container image to ECR before applying ECS service resources.
4. Implement monitoring resources once edge/compute are running.
