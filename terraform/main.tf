# Root configuration that stitches together the reusable modules.
locals {
  common_tags = merge({
    Project     = var.project
    Environment = var.environment
  }, var.tags)
}

module "vpc" {
  source               = "./modules/vpc"
  project              = var.project
  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  az_count             = var.az_count
  nat_gateway_mode     = var.nat_gateway_mode
  enable_vpc_endpoints = var.enable_vpc_endpoints
  enable_flow_logs     = var.enable_flow_logs
  tags                 = local.common_tags
}

module "ecs" {
  source                      = "./modules/ecs"
  project                     = var.project
  environment                 = var.environment
  dynamodb_table_arns         = [module.dynamodb.users_table_arn, module.dynamodb.games_table_arn]
  redis_auth_secret_arn       = module.elasticache.redis_auth_secret_arn
  redis_replication_group_arn = module.elasticache.redis_replication_group_arn
  ecr_repository_arns         = var.ecr_repository_arns
  tags                        = local.common_tags
}

module "alb" {
  source  = "./modules/alb"
  project = var.project
  tags    = local.common_tags
}

module "elasticache" {
  source                     = "./modules/elasticache"
  project                    = var.project
  environment                = var.environment
  vpc_id                     = module.vpc.vpc_id
  private_data_subnet_ids    = module.vpc.private_data_subnet_ids
  allowed_security_group_ids = var.redis_allowed_security_group_ids
  node_type                  = var.redis_node_type
  num_cache_clusters         = var.redis_num_cache_clusters
  tags                       = local.common_tags
}

module "dynamodb" {
  source           = "./modules/dynamodb"
  project          = var.project
  environment      = var.environment
  users_table_name = var.dynamodb_users_table_name
  games_table_name = var.dynamodb_games_table_name
  tags             = local.common_tags
}

module "cognito" {
  source                = "./modules/cognito"
  project               = var.project
  environment           = var.environment
  cognito_domain_prefix = var.cognito_domain_prefix
  callback_urls         = var.cognito_callback_urls
  logout_urls           = var.cognito_logout_urls
  tags                  = local.common_tags
}

module "route53" {
  source  = "./modules/route53"
  project = var.project
  tags    = local.common_tags
}

module "monitoring" {
  source  = "./modules/monitoring"
  project = var.project
  tags    = local.common_tags
}
