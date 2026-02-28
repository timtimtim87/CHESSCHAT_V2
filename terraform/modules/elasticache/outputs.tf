output "elasticache_module_status" {
  value       = "elasticache module active"
  description = "Indicates that the elasticache module has concrete resources configured."
}

output "redis_replication_group_id" {
  value       = aws_elasticache_replication_group.redis.replication_group_id
  description = "Replication group ID for CHESSCHAT Redis."
}

output "redis_replication_group_arn" {
  value       = aws_elasticache_replication_group.redis.arn
  description = "Replication group ARN for CHESSCHAT Redis."
}

output "redis_primary_endpoint_address" {
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  description = "Primary endpoint address for write traffic."
}

output "redis_reader_endpoint_address" {
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
  description = "Reader endpoint address for read traffic."
}

output "redis_port" {
  value       = aws_elasticache_replication_group.redis.port
  description = "Redis listener port."
}

output "redis_security_group_id" {
  value       = aws_security_group.redis.id
  description = "Security group ID attached to Redis."
}

output "redis_auth_secret_arn" {
  value       = aws_secretsmanager_secret.redis_auth_token.arn
  description = "Secrets Manager ARN containing Redis auth token JSON."
}
