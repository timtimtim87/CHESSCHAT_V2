# Root configuration that stitches together the reusable modules.
moved {
  from = module.ecs
  to   = module.ecs_identity
}

locals {
  common_tags = merge({
    Project     = var.project
    Environment = var.environment
  }, var.tags)

  primary_app_domain_name   = var.root_domain_name
  secondary_app_domain_name = var.root_domain_name == null ? null : "${var.app_subdomain}.${var.root_domain_name}"
  canonical_app_domain_name = local.secondary_app_domain_name != null ? local.secondary_app_domain_name : local.primary_app_domain_name
  app_endpoint_domains = distinct(compact([
    local.primary_app_domain_name,
    local.secondary_app_domain_name
  ]))
  redirect_app_domains = [
    for domain in local.app_endpoint_domains : domain if domain != local.canonical_app_domain_name
  ]
  cognito_callback_urls_effective = var.use_app_domain_for_cognito_urls && local.primary_app_domain_name != null ? [
    "https://${local.canonical_app_domain_name}/auth/callback"
  ] : var.cognito_callback_urls
  cognito_logout_urls_effective = var.use_app_domain_for_cognito_urls && local.primary_app_domain_name != null ? [
    "https://${local.canonical_app_domain_name}/"
  ] : var.cognito_logout_urls
  ecs_container_secrets_effective = concat(
    var.ecs_container_secrets,
    [{
      name      = "REDIS_AUTH_TOKEN"
      valueFrom = "${module.elasticache.redis_auth_secret_arn}:auth_token::"
    }]
  )
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

module "ecs_identity" {
  source              = "./modules/ecs"
  project             = var.project
  environment         = var.environment
  dynamodb_table_arns = [module.dynamodb.users_table_arn, module.dynamodb.games_table_arn]
  ecr_repository_arns = var.ecr_repository_arns
  tags                = local.common_tags
}

module "alb" {
  source              = "./modules/alb"
  project             = var.project
  environment         = var.environment
  enabled             = var.enable_edge
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  target_port         = var.ecs_container_port
  certificate_domains = local.app_endpoint_domains
  canonical_host      = local.canonical_app_domain_name
  redirect_hosts      = local.redirect_app_domains
  route53_zone_id     = var.route53_zone_id
  health_check_path   = var.alb_health_check_path
  tags                = local.common_tags
}

module "ecs_compute" {
  source                 = "./modules/ecs_compute"
  project                = var.project
  environment            = var.environment
  enabled                = var.enable_ecs_compute
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_app_subnet_ids
  execution_role_arn     = module.ecs_identity.task_execution_role_arn
  task_role_arn          = module.ecs_identity.task_role_arn
  ecr_repository_name    = var.ecr_repository_name
  image_tag              = var.ecs_image_tag
  container_name         = var.ecs_container_name
  container_port         = var.ecs_container_port
  container_environment  = var.ecs_container_environment
  container_secrets      = local.ecs_container_secrets_effective
  task_cpu               = var.ecs_task_cpu
  task_memory            = var.ecs_task_memory
  desired_count          = var.ecs_service_desired_count
  enable_alb_integration = var.enable_edge
  alb_target_group_arn   = module.alb.target_group_arn
  alb_security_group_id  = module.alb.alb_security_group_id
  log_retention_days     = var.ecs_log_retention_days
  tags                   = local.common_tags
}

module "github_actions_oidc" {
  source                  = "./modules/github_actions_oidc"
  enabled                 = var.enable_github_actions_oidc && var.enable_ecs_compute
  project                 = var.project
  environment             = var.environment
  github_repository       = var.github_actions_repository
  github_branch           = var.github_actions_branch
  oidc_thumbprints        = var.github_actions_oidc_thumbprints
  ecr_repository_arn      = module.ecs_compute.ecr_repository_arn
  ecs_cluster_name        = module.ecs_compute.cluster_name
  ecs_service_name        = module.ecs_compute.service_name
  task_execution_role_arn = module.ecs_identity.task_execution_role_arn
  task_role_arn           = module.ecs_identity.task_role_arn
  cognito_user_pool_arn   = module.cognito.user_pool_arn
  tags                    = local.common_tags
}

module "elasticache" {
  source                        = "./modules/elasticache"
  project                       = var.project
  environment                   = var.environment
  vpc_id                        = module.vpc.vpc_id
  private_data_subnet_ids       = module.vpc.private_data_subnet_ids
  allowed_security_group_ids    = var.redis_allowed_security_group_ids
  ecs_service_security_group_id = module.ecs_compute.service_security_group_id
  enable_ecs_service_ingress    = var.enable_ecs_compute
  node_type                     = var.redis_node_type
  num_cache_clusters            = var.redis_num_cache_clusters
  tags                          = local.common_tags
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
  callback_urls         = local.cognito_callback_urls_effective
  logout_urls           = local.cognito_logout_urls_effective
  tags                  = local.common_tags
}

module "route53" {
  source             = "./modules/route53"
  project            = var.project
  environment        = var.environment
  enabled            = var.enable_dns
  enable_app_alias   = var.enable_edge
  create_hosted_zone = var.create_route53_zone
  root_domain_name   = var.root_domain_name
  route53_zone_id    = var.route53_zone_id
  alias_records      = local.app_endpoint_domains
  alb_dns_name       = module.alb.alb_dns_name
  alb_zone_id        = module.alb.alb_zone_id
  tags               = local.common_tags
}

module "monitoring" {
  source                           = "./modules/monitoring"
  project                          = var.project
  environment                      = var.environment
  aws_region                       = var.aws_region
  enabled                          = var.enable_monitoring
  ecs_cluster_name                 = module.ecs_compute.cluster_name
  ecs_service_name                 = module.ecs_compute.service_name
  alb_arn_suffix                   = module.alb.alb_arn == null ? null : replace(join(":", slice(split(":", module.alb.alb_arn), 5, length(split(":", module.alb.alb_arn)))), "loadbalancer/", "")
  target_group_arn_suffix          = module.alb.target_group_arn == null ? null : join(":", slice(split(":", module.alb.target_group_arn), 5, length(split(":", module.alb.target_group_arn))))
  redis_replication_group_id       = module.elasticache.redis_replication_group_id
  dynamodb_users_table_name        = module.dynamodb.users_table_name
  dynamodb_games_table_name        = module.dynamodb.games_table_name
  alarm_email_endpoints            = var.monitoring_alarm_email_endpoints
  alarm_period_seconds             = var.monitoring_alarm_period_seconds
  alarm_evaluation_periods         = var.monitoring_alarm_evaluation_periods
  alarm_datapoints_to_alarm        = var.monitoring_alarm_datapoints_to_alarm
  ecs_cpu_utilization_threshold    = var.monitoring_ecs_cpu_utilization_threshold
  ecs_memory_utilization_threshold = var.monitoring_ecs_memory_utilization_threshold
  alb_5xx_count_threshold          = var.monitoring_alb_5xx_count_threshold
  alb_min_healthy_hosts_threshold  = var.monitoring_alb_min_healthy_hosts_threshold
  redis_engine_cpu_threshold       = var.monitoring_redis_engine_cpu_threshold
  monthly_budget_limit_usd         = var.monitoring_monthly_budget_limit_usd
  budget_alert_thresholds          = var.monitoring_budget_alert_thresholds
  tags                             = local.common_tags
}
