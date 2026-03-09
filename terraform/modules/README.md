# Terraform Modules

Each subdirectory here encapsulates an AWS service or layer (networking, compute, load balancing, data, identity, DNS, monitoring).

Prefer:
- explicit inputs (`variables.tf`) and outputs (`outputs.tf`)
- single responsibility per module
- no hard-coded values; consume values such as `var.project`, `var.region`, and shared `tags`
- module-level documentation explaining required IAM, dependencies, and expected resources

Current split:
- `ecs` handles IAM identity for ECS tasks.
- `ecs_compute` handles ECR and ECS runtime resources.
- This split intentionally prevents dependency cycles with ElastiCache SG allow-list rules.
- `static_edge` handles apex static hosting with private S3 + CloudFront + OAC.
