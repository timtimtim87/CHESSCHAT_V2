# ECS Compute module

## Purpose
Own the compute-plane resources for the CHESSCHAT app runtime.

## Resources
- `aws_ecr_repository.app`
- `aws_cloudwatch_log_group.app`
- `aws_ecs_cluster.this`
- `aws_security_group.service`
- `aws_ecs_task_definition.app`
- `aws_ecs_service.app`

## Key Inputs
- `project` (string)
- `environment` (string)
- `enabled` (bool)
- `vpc_id` (string)
- `private_subnet_ids` (list(string))
- `execution_role_arn` (string)
- `task_role_arn` (string)
- `image_tag` (string)
- `container_name` (string)
- `container_port` (number)
- `task_cpu` (number)
- `task_memory` (number)
- `desired_count` (number)
- `enable_alb_integration` (bool)
- `alb_target_group_arn` (string)
- `alb_security_group_id` (string)

## Outputs
- `ecr_repository_arn`
- `ecr_repository_url`
- `cluster_arn`
- `cluster_name`
- `task_definition_arn`
- `service_name`
- `service_security_group_id`

## Notes
- This module intentionally does not depend on ElastiCache resources so Redis SG allow-listing can reference the ECS SG without a Terraform cycle.
- ALB integration is optional and one-way (`ecs_compute` depends on ALB outputs), which avoids ALB/ECS circular dependencies.
- Push a bootstrap container image tag to ECR before applying ECS service resources to avoid startup image-pull failures.
