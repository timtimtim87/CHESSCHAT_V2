# SSM Parameter Naming Standard

Purpose: consistent Parameter Store keys for infrastructure identifiers and sensitive values.

## Base Path
- `/chesschat/<env>/<domain>/<key>`

## Environments
- `dev`, `staging`, `prod`

## Domains
- `global`: account/region level values
- `bootstrap`: Terraform backend values
- `network`: VPC/subnet/route resources
- `data`: DynamoDB/ElastiCache values
- `identity`: Cognito/IAM values
- `compute`: ECS/ECR/ALB values
- `dns`: Route53/ACM values
- `observability`: logs/alarms/budgets values

## Types
- Non-sensitive values: `String`
- Sensitive values: `SecureString` (KMS key explicit when available)

## Initial Parameter Plan
- `/chesschat/dev/global/account_id` (String)
- `/chesschat/dev/global/region` (String)
- `/chesschat/dev/bootstrap/tf_state_bucket` (String)
- `/chesschat/dev/bootstrap/tf_lock_table` (String)
- `/chesschat/dev/bootstrap/tf_state_key` (String)

## Examples
- `/chesschat/dev/network/vpc_id`
- `/chesschat/dev/data/ddb_users_table_arn`
- `/chesschat/dev/compute/ecs_cluster_arn`
- `/chesschat/dev/identity/cognito_user_pool_id`

## Rules
- Use lowercase and underscores in parameter keys.
- Store ARNs where practical, IDs where ARNs are not available.
- Write/update parameters immediately after provisioning.
- Never store plaintext secrets in files; use `SecureString` in SSM.
