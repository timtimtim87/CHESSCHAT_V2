output "ecs_compute_module_status" {
  value       = "ecs_compute module active"
  description = "Indicates that the ecs_compute module has concrete resources configured."
}

output "ecr_repository_arn" {
  value       = try(aws_ecr_repository.app[0].arn, null)
  description = "ECR repository ARN for application images."
}

output "ecr_repository_url" {
  value       = try(aws_ecr_repository.app[0].repository_url, null)
  description = "ECR repository URL for image pushes and task definition references."
}

output "cluster_arn" {
  value       = try(aws_ecs_cluster.this[0].arn, null)
  description = "ECS cluster ARN."
}

output "cluster_name" {
  value       = try(aws_ecs_cluster.this[0].name, null)
  description = "ECS cluster name."
}

output "task_definition_arn" {
  value       = try(aws_ecs_task_definition.app[0].arn, null)
  description = "ECS task definition ARN."
}

output "service_name" {
  value       = try(aws_ecs_service.app[0].name, null)
  description = "ECS service name."
}

output "service_security_group_id" {
  value       = try(aws_security_group.service[0].id, null)
  description = "Security group ID used by ECS service tasks."
}
