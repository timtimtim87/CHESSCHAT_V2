output "modules_active" {
  value = [
    module.vpc.vpc_module_status,
    module.ecs.ecs_module_status,
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
  value       = module.ecs.task_execution_role_arn
  description = "ECS task execution role ARN."
}

output "ecs_task_role_arn" {
  value       = module.ecs.task_role_arn
  description = "ECS task role ARN."
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
