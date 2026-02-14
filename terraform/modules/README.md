# Terraform Modules

Each subdirectory here should encapsulate an AWS service or layer (networking, compute, load balancing, data, identity, DNS, monitoring).

Prefer:
- explicit inputs (`variables.tf`) and outputs (`outputs.tf`)
- single responsibility per module
- no hard-coded values; consume values such as `var.project`, `var.region`, and shared `tags`
- module-level documentation explaining required IAM, dependencies, and expected resources
