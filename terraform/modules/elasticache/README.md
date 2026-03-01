# ELASTICACHE module

## Purpose
Own resources for the Redis-based live session cache layer.

## Resources
- `aws_security_group.redis`
- `aws_vpc_security_group_ingress_rule.from_app` (only for provided app SG IDs)
- `aws_elasticache_subnet_group.redis` (private data subnets)
- `aws_elasticache_parameter_group.redis` (`maxmemory-policy=allkeys-lru`, `timeout=300`)
- `random_password.redis_auth_token`
- `aws_secretsmanager_secret.redis_auth_token`
- `aws_secretsmanager_secret_version.redis_auth_token`
- `aws_elasticache_replication_group.redis`
  - Engine: Redis
  - 1 primary + replicas (default 2 nodes total)
  - Multi-AZ and automatic failover (when replicas exist)
  - In-transit and at-rest encryption enabled
  - AUTH token enabled (stored in Secrets Manager)

## Key Inputs
- `project` (string)
- `environment` (string)
- `vpc_id` (string)
- `private_data_subnet_ids` (list(string))
- `allowed_security_group_ids` (list(string), default `[]`)
- `ecs_service_security_group_id` (string, default `null`)
- `enable_ecs_service_ingress` (bool, default `false`)
- `node_type` (string, default `cache.t4g.micro`)
- `engine_version` (string, default `7.0`)
- `num_cache_clusters` (number, default `2`)
- `automatic_failover_enabled` (bool, default `true`)
- `multi_az_enabled` (bool, default `true`)
- `transit_encryption_enabled` (bool, default `true`)
- `at_rest_encryption_enabled` (bool, default `true`)
- `snapshot_retention_limit` (number, default `1`)
- `tags` (map(string))

## Outputs
- `elasticache_module_status`
- `redis_replication_group_id`
- `redis_primary_endpoint_address`
- `redis_reader_endpoint_address`
- `redis_port`
- `redis_security_group_id`
- `redis_auth_secret_arn`
