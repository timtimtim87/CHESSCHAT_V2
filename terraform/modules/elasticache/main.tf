resource "random_password" "redis_auth_token" {
  length           = 48
  special          = true
  override_special = "!&#$^<>-"
}

locals {
  module_name             = "elasticache"
  name_prefix             = "${var.project}-${var.environment}-redis"
  replication_group_id    = "${var.project}-${var.environment}"
  subnet_group_name       = "${local.name_prefix}-subnets"
  security_group_name     = "${local.name_prefix}-sg"
  parameter_group_name    = "${local.name_prefix}-params"
  auth_secret_name        = "${var.project}/${var.environment}/redis/auth-token"
  needs_failover_for_ha   = var.num_cache_clusters > 1
  automatic_failover_mode = local.needs_failover_for_ha ? var.automatic_failover_enabled : false
  multi_az_mode           = local.needs_failover_for_ha ? var.multi_az_enabled : false
}

resource "aws_security_group" "redis" {
  name        = local.security_group_name
  description = "Controls access to CHESSCHAT Redis."
  vpc_id      = var.vpc_id

  egress {
    description = "Allow all outbound traffic."
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = local.security_group_name
  })
}

resource "aws_vpc_security_group_ingress_rule" "from_app" {
  for_each = toset(var.allowed_security_group_ids)

  security_group_id            = aws_security_group.redis.id
  referenced_security_group_id = each.value
  from_port                    = var.port
  to_port                      = var.port
  ip_protocol                  = "tcp"
  description                  = "Redis access from approved application security group."
}

resource "aws_vpc_security_group_ingress_rule" "from_ecs_service" {
  count = var.enable_ecs_service_ingress ? 1 : 0

  security_group_id            = aws_security_group.redis.id
  referenced_security_group_id = var.ecs_service_security_group_id
  from_port                    = var.port
  to_port                      = var.port
  ip_protocol                  = "tcp"
  description                  = "Redis access from ECS service security group."
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = local.subnet_group_name
  subnet_ids = var.private_data_subnet_ids

  tags = merge(var.tags, {
    Name = local.subnet_group_name
  })
}

resource "aws_elasticache_parameter_group" "redis" {
  name   = local.parameter_group_name
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }
}

resource "aws_secretsmanager_secret" "redis_auth_token" {
  name                    = local.auth_secret_name
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = local.auth_secret_name
  })
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id = aws_secretsmanager_secret.redis_auth_token.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token.result
  })
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = local.replication_group_id
  description                = "CHESSCHAT live session cache."
  engine                     = "redis"
  engine_version             = var.engine_version
  node_type                  = var.node_type
  port                       = var.port
  parameter_group_name       = aws_elasticache_parameter_group.redis.name
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]
  num_cache_clusters         = var.num_cache_clusters
  automatic_failover_enabled = local.automatic_failover_mode
  multi_az_enabled           = local.multi_az_mode
  at_rest_encryption_enabled = var.at_rest_encryption_enabled
  transit_encryption_enabled = var.transit_encryption_enabled
  auth_token                 = random_password.redis_auth_token.result
  snapshot_retention_limit   = var.snapshot_retention_limit
  auto_minor_version_upgrade = true

  tags = merge(var.tags, {
    Name = local.name_prefix
  })

  depends_on = [aws_secretsmanager_secret_version.redis_auth_token]
}
