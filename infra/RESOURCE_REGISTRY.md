# CHESSCHAT_V2 Resource Registry

Purpose: single source of truth for human-readable names, IDs, and ARNs as infrastructure is provisioned.

## Project Context
- Project: `chesschat`
- AWS account name: `CHESSCHAT_V2`
- AWS account ID: `723580627470`
- AWS region: `us-east-1`
- Standard tag: `Project=chesschat`

## Status
- Last updated: 2026-02-14
- Provisioning state: bootstrap not started (no AWS resources recorded yet)

## Naming Convention
- Pattern: `chesschat-<env>-<service>-<purpose>`
- Examples:
  - `chesschat-dev-vpc-main`
  - `chesschat-dev-ddb-users`
  - `chesschat-dev-ecs-cluster`

## Resources

| Layer | Service | Logical Name | AWS Name/ID | ARN | Region | Managed By | Tags | Created On | Notes |
|---|---|---|---|---|---|---|---|---|---|
| bootstrap | s3 | terraform_state_bucket | TBD | TBD | us-east-1 | Terraform bootstrap CLI | Project=chesschat | TBD | Remote state bucket |
| bootstrap | dynamodb | terraform_lock_table | TBD | TBD | us-east-1 | Terraform bootstrap CLI | Project=chesschat | TBD | State lock table |

## Update Rule
- After creating any resource, update this file in the same session with exact name, ARN, and command context.
