output "modules_active" {
  value = [
    module.vpc.vpc_module_status,
    module.ecs_identity.ecs_module_status,
    module.ecs_compute.ecs_compute_module_status,
    module.alb.alb_module_status,
    module.elasticache.elasticache_module_status,
    module.dynamodb.dynamodb_module_status,
    module.cognito.cognito_module_status,
    module.route53.route53_module_status,
    module.monitoring.monitoring_module_status,
  ]
  description = "Keeps a simple list of module placeholders to verify the configuration links all modules."
}

output "dynamodb_users_table_name" {
  value       = module.dynamodb.users_table_name
  description = "DynamoDB users table name."
}

output "dynamodb_games_table_name" {
  value       = module.dynamodb.games_table_name
  description = "DynamoDB games table name."
}

output "redis_replication_group_id" {
  value       = module.elasticache.redis_replication_group_id
  description = "ElastiCache replication group ID."
}

output "redis_replication_group_arn" {
  value       = module.elasticache.redis_replication_group_arn
  description = "ElastiCache replication group ARN."
}

output "redis_primary_endpoint_address" {
  value       = module.elasticache.redis_primary_endpoint_address
  description = "Primary Redis endpoint for write operations."
}

output "redis_reader_endpoint_address" {
  value       = module.elasticache.redis_reader_endpoint_address
  description = "Reader Redis endpoint for read operations."
}

output "redis_auth_secret_arn" {
  value       = module.elasticache.redis_auth_secret_arn
  description = "Secrets Manager ARN containing Redis auth token."
}

output "ecs_task_execution_role_arn" {
  value       = module.ecs_identity.task_execution_role_arn
  description = "ECS task execution role ARN."
}

output "ecs_task_role_arn" {
  value       = module.ecs_identity.task_role_arn
  description = "ECS task role ARN."
}

output "ecr_repository_arn" {
  value       = module.ecs_compute.ecr_repository_arn
  description = "ECR repository ARN for the ECS app image."
}

output "ecr_repository_url" {
  value       = module.ecs_compute.ecr_repository_url
  description = "ECR repository URL for pushing the ECS app image."
}

output "ecs_cluster_arn" {
  value       = module.ecs_compute.cluster_arn
  description = "ECS cluster ARN."
}

output "ecs_service_name" {
  value       = module.ecs_compute.service_name
  description = "ECS service name."
}

output "ecs_service_security_group_id" {
  value       = module.ecs_compute.service_security_group_id
  description = "Security group ID attached to ECS tasks."
}

output "cognito_user_pool_id" {
  value       = module.cognito.user_pool_id
  description = "Cognito user pool ID."
}

output "cognito_user_pool_arn" {
  value       = module.cognito.user_pool_arn
  description = "Cognito user pool ARN."
}

output "cognito_app_client_id" {
  value       = module.cognito.app_client_id
  description = "Cognito app client ID."
}

output "cognito_hosted_ui_base_url" {
  value       = module.cognito.hosted_ui_base_url
  description = "Cognito hosted UI base URL."
}

output "alb_dns_name" {
  value       = module.alb.alb_dns_name
  description = "ALB DNS name."
}

output "alb_zone_id" {
  value       = module.alb.alb_zone_id
  description = "Route53 hosted zone ID associated with the ALB."
}

output "alb_app_domain_name" {
  value       = module.alb.app_domain_name
  description = "Fully qualified app domain used for ACM certificate."
}

output "route53_effective_zone_id" {
  value       = module.route53.effective_zone_id
  description = "Effective public hosted zone ID used for app DNS."
}

output "route53_app_fqdn" {
  value       = module.route53.app_fqdn
  description = "Fully qualified DNS name of the app alias record."
}

output "monitoring_sns_topic_arn" {
  value       = module.monitoring.sns_topic_arn
  description = "SNS topic ARN used for monitoring and budget notifications."
}

output "monitoring_dashboard_name" {
  value       = module.monitoring.dashboard_name
  description = "CloudWatch dashboard name for operational visibility."
}

output "monitoring_alarm_names" {
  value       = module.monitoring.alarm_names
  description = "List of baseline CloudWatch alarm names."
}

output "monitoring_budget_name" {
  value       = module.monitoring.budget_name
  description = "Name of the monthly AWS budget."
}
