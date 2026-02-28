# ECS Identity module

## Purpose
Own ECS IAM identity resources required before task/service deployment.

## Resources
- `aws_iam_role.task_execution`
- `aws_iam_role_policy.task_execution`
  - Pull images from ECR
  - Write CloudWatch Logs
  - Read runtime secrets (Redis auth token)
- `aws_iam_role.task`
- `aws_iam_role_policy.task`
  - Read/write DynamoDB users/games tables (+ indexes)
  - Read Redis auth secret
  - Describe ElastiCache replication group
  - Create/get/delete Chime meetings/attendees
  - Publish CloudWatch custom metrics

## Key Inputs
- `project` (string)
- `environment` (string)
- `dynamodb_table_arns` (list(string))
- `ecr_repository_arns` (list(string), optional)
- `tags` (map(string))

## Outputs
- `ecs_module_status`
- `task_execution_role_name`
- `task_execution_role_arn`
- `task_role_name`
- `task_role_arn`

## Notes
- Some AWS APIs require wildcard resources (`ecr:GetAuthorizationToken`, Chime create calls, `cloudwatch:PutMetricData`).
- Wildcards are restricted only to those API limitations; data-access permissions are scoped to concrete ARNs.
- Redis permissions are scoped by deterministic naming conventions (`${project}/${environment}/redis/auth-token*` and replication group `${project}-${environment}`), avoiding cross-module dependency cycles.
- ECS compute resources (ECR/cluster/task/service/SG) are intentionally implemented in `modules/ecs_compute` to avoid dependency cycles with ElastiCache SG allow-listing.
