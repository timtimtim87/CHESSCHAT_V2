output "ecs_module_status" {
  value       = "ecs module active"
  description = "Indicates that the ecs module has concrete identity resources configured."
}

output "task_execution_role_name" {
  value       = aws_iam_role.task_execution.name
  description = "ECS task execution role name."
}

output "task_execution_role_arn" {
  value       = aws_iam_role.task_execution.arn
  description = "ECS task execution role ARN."
}

output "task_role_name" {
  value       = aws_iam_role.task.name
  description = "ECS task role name."
}

output "task_role_arn" {
  value       = aws_iam_role.task.arn
  description = "ECS task role ARN."
}
