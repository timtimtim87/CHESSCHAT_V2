# Terraform Workspace

## Layout
- `backend.tf`: configure remote state (copy to your own bucket/lock table before `init`).
- `providers.tf` / `versions.tf`: pin providers and Terraform core version.
- `variables.tf`: define global inputs consumed across modules.
- `main.tf`: wires all reusable modules together with shared tags.
- `outputs.tf`: expose simple signals confirming each module is included.
- `modules/*`: single-responsibility modules (vpc, networking, compute, data, identity, DNS, monitoring).
- `terraform.tfvars.example`: start point for environment-specific values.
- `environments/`: consume the shared modules with `-var-file` or a dedicated workspace for each environment.

## Next steps
1. Copy `terraform.tfvars.example` to `terraform.tfvars` and customize per environment.
2. Mirror the `environments/dev` folder for staging/prod with environment-specific overrides.
3. Replace placeholder module content with real AWS resources as you implement each layer.
