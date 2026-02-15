# CHESSCHAT_V2 Resource Registry

Purpose: single source of truth for human-readable names, IDs, and ARNs as infrastructure is provisioned.

## Project Context
- Project: `chesschat`
- AWS account name: `CHESSCHAT_V2`
- AWS account ID: `723580627470`
- AWS region: `us-east-1`
- Standard tag: `Project=chesschat`
- AWS CLI default IAM user ARN: `arn:aws:iam::723580627470:user/CHESSCHAT_IAM_USER`
- AWS CLI named profile retained: `CHESSCHAT_IAM_USER` (mirrors `default`)

## Status
- Last updated: 2026-02-15
- Provisioning state: bootstrap backend configured and Terraform initialized

## Naming Convention
- Pattern: `chesschat-<env>-<service>-<purpose>`
- Examples:
  - `chesschat-dev-vpc-main`
  - `chesschat-dev-ddb-users`
  - `chesschat-dev-ecs-cluster`

## Resources

| Layer | Service | Logical Name | AWS Name/ID | ARN | Region | Managed By | Tags | Created On | Notes |
|---|---|---|---|---|---|---|---|---|---|
| bootstrap | s3 | terraform_state_bucket | `chesschat-tfstate-723580627470-us-east-1` | `arn:aws:s3:::chesschat-tfstate-723580627470-us-east-1` | us-east-1 | Terraform backend | Project=chesschat | 2026-02-14 | State object key prefix: `dev/terraform.tfstate` |
| bootstrap | dynamodb | terraform_lock_table | `chesschat-tfstate-locks` | `arn:aws:dynamodb:us-east-1:723580627470:table/chesschat-tfstate-locks` | us-east-1 | Bootstrap artifact | Project=chesschat | 2026-02-14 | Legacy lock table retained; backend now uses S3 `use_lockfile` |

## Auth Baseline
- Keep only these AWS CLI profiles: `default`, `CHESSCHAT_IAM_USER`.
- Required active identity for Terraform and AWS CLI: `arn:aws:iam::723580627470:user/CHESSCHAT_IAM_USER`.
- Quick verification:
  - `aws sts get-caller-identity --query Arn --output text`
  - `aws s3api head-bucket --bucket chesschat-tfstate-723580627470-us-east-1`

## Update Rule
- After creating any resource, update this file in the same session with exact name, ARN, and command context.
