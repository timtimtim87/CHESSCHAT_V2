# Terraform Guide

This project favors a modular, environment-aware Terraform layout that enforces best practices around remote state, reusable modules, and documented workflows.

## Directory structure
- `terraform/`
  - `backend.tf` – sample remote S3 backend with DynamoDB locking. Copy this file and replace the bucket/table names before running `terraform init`.
  - `providers.tf` / `versions.tf` – pins `hashicorp/aws` and Terraform 1.5+ so everyone uses the same toolchain.
  - `variables.tf` / `outputs.tf` – global inputs (project, environment, region, tags) and helper outputs that signal module wiring.
  - `main.tf` – stitches the reusable modules (`modules/vpc`, `modules/ecs`, `modules/alb`, `modules/elasticache`, `modules/dynamodb`, `modules/cognito`, `modules/route53`, `modules/monitoring`). Each module currently exposes a placeholder output and expects `project` + `tags` inputs.
  - `modules/*` – skeleton modules, one per subsystem. Update `main.tf` inside each module to declare real resources, keep inputs explicit, and document usage in each module's `README.md`.
  - `environments/` – environment-specific variable files (e.g., `environments/dev/terraform.tfvars`). Run Terraform from `terraform/` while referencing these per-environment files to keep configs DRY.
  - `terraform.tfvars.example` – safe example values to copy/rename before running.
- `terraform-guide.md` (this file) – explains the workflow, file meanings, and commands.

## Recommended workflow (bash commands)
1. **Bootstrap remote state (one-time)**
   ```bash
   cd terraform
   terraform init \
     -backend-config="bucket=your-bucket-name" \
     -backend-config="key=envs/dev/terraform.tfstate" \
     -backend-config="region=us-east-1" \
     -backend-config="dynamodb_table=terraform-state-lock"
   ```
   Replace placeholders with your real S3 bucket/DynamoDB table names. Backend configs can be stored in `*.auto.tfvars` if you prefer, but keep secrets out of Git.

2. **Set workspace / environment**
   ```bash
   terraform workspace new dev || terraform workspace select dev
   ```
   Workspaces allow you to track `dev`, `staging`, `prod`, etc. You can also maintain separate directories under `environments/` and call `terraform apply -var-file=environments/prod/terraform.tfvars`.

3. **Check formatting and linting**
   ```bash
   terraform fmt -recursive
   terraform validate
   ```
   Run these before every plan to catch syntax issues and enforce style.

4. **Plan changes**
   ```bash
   terraform plan -var-file=environments/dev/terraform.tfvars
   ```
   Always supply the `-var-file` that matches the environment; it keeps secrets/config separated from the shared module logic.

5. **Apply safely**
   ```bash
   terraform apply -var-file=environments/dev/terraform.tfvars
   ```
   Review the plan output carefully. Consider piping the plan to a file (`terraform plan -out=tfplan`) and using `terraform apply tfplan` in teams to prevent drift.

6. **Destroy when no longer needed**
   ```bash
   terraform destroy -var-file=environments/dev/terraform.tfvars
   ```
   Use with caution; Terraform will remove all managed resources for that environment.

## Supporting commands
- `terraform workspace list` – see available workspaces.
- `terraform state list` / `terraform state show <resource>` – inspect current state.
- `terraform output -json` – export outputs for automation.
- `terraform plan -target=module.vpc` – target a subset when isolating changes.
- `terraform graph` – generate DOT graph for visualization.

## Best practices reminders
- Keep resource definitions in modules and expose only necessary inputs/outputs. Modules in `terraform/modules/` serve as templates for each AWS service/layer.
- Never commit actual `terraform.tfstate` or `.terraform/` directories; the `.gitignore` entry already excludes them but double-check during reviews.
- Use consistent tags (`project`, `environment`, `team`, etc.) so Cost Explorer and AWS Config can group resources.
- Split staging/production by environment directories or Terraform Cloud workspaces, not by copying the entire repo.
- Document each module's purpose and required permissions in its `README.md` so future contributors know how to extend it.

## Next steps
1. Copy `terraform/terraform.tfvars.example` → `terraform/terraform.tfvars` and adjust values.
2. Update `terraform/backend.tf` with your S3 bucket/table before running `terraform init`.
3. Replace module placeholders with concrete resource definitions as you implement each AWS service.
4. Keep this guide synced with real workflow changes so it stays correct when you add new modules or environments.
