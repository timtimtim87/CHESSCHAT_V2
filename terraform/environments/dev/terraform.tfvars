project     = "chesschat"
environment = "dev"
aws_region  = "us-east-1"
vpc_cidr    = "10.20.0.0/16"
az_count    = 3

# single: lower cost, single-AZ egress dependency
# per_az: higher cost, better AZ resilience
nat_gateway_mode     = "single"
enable_vpc_endpoints = true
enable_flow_logs     = true

tags = {
  Project = "chesschat"
}

# ECS SG from ecs_compute is auto-appended to this list.
redis_allowed_security_group_ids = []

enable_ecs_compute  = true
ecr_repository_name = "chesschat-dev-app"
ecs_image_tag       = "v0.1.0"
ecs_container_name  = "app"
ecs_container_port  = 8080
ecs_container_environment = {
  AWS_REGION                     = "us-east-1"
  REDIS_HOST                     = "master.chesschat-dev.zu5wgj.use1.cache.amazonaws.com"
  REDIS_PORT                     = "6379"
  REDIS_TLS                      = "true"
  DYNAMODB_USERS_TABLE           = "chesschat-dev-users"
  DYNAMODB_GAMES_TABLE           = "chesschat-dev-games"
  DYNAMODB_PAIR_ROOMS_TABLE      = "chesschat-dev-pair-rooms"
  DYNAMODB_FRIENDSHIPS_TABLE     = "chesschat-dev-friendships"
  DYNAMODB_FRIEND_REQUESTS_TABLE = "chesschat-dev-friend-requests"
  DYNAMODB_CHALLENGES_TABLE      = "chesschat-dev-challenges"
  DYNAMODB_NOTIFICATIONS_TABLE   = "chesschat-dev-notifications"
  COGNITO_USER_POOL_ID           = "us-east-1_AWq14lBGV"
  COGNITO_CLIENT_ID              = "5numi4223d3jnebrlfqboseu42"
  COGNITO_REGION                 = "us-east-1"
  COGNITO_HOSTED_UI_BASE_URL     = "https://chesschat-dev-6c96bb.auth.us-east-1.amazoncognito.com"
  CHIME_REGION                   = "us-east-1"
  APP_DOMAIN                     = "https://app.chess-chat.com"
  APP_METRICS_NAMESPACE          = "Chesschat/Dev"
  ROOM_TTL_SECONDS               = "3600"
  GAME_DURATION_SECONDS          = "300"
  RECONNECT_GRACE_SECONDS        = "12"
  HEARTBEAT_INTERVAL_MS          = "30000"
}
ecs_task_cpu              = 256
ecs_task_memory           = 512
ecs_service_desired_count = 1
ecs_log_retention_days    = 30

# Enable edge and DNS now that domain + hosted zone are ready.
enable_edge         = true
enable_static_edge  = true
enable_dns          = true
create_route53_zone = false
route53_zone_id     = "Z03927582T9WNB6PUN708"
root_domain_name    = "chess-chat.com"
app_subdomain       = "app"

# Derive callback/logout URLs from root_domain_name (+ optional app_subdomain secondary domain).
cognito_callback_urls           = ["https://app.chess-chat.com/auth/callback"]
cognito_logout_urls             = ["https://app.chess-chat.com/"]
use_app_domain_for_cognito_urls = true

cognito_enable_google_identity_provider = true

enable_monitoring = true

# Add real recipient emails before apply to activate inbox notifications.
monitoring_alarm_email_endpoints            = ["tim.antibes+CHESSCHAT_V2@gmail.com"]
monitoring_alarm_period_seconds             = 300
monitoring_alarm_evaluation_periods         = 2
monitoring_alarm_datapoints_to_alarm        = 2
monitoring_ecs_cpu_utilization_threshold    = 75
monitoring_ecs_memory_utilization_threshold = 80
monitoring_alb_5xx_count_threshold          = 5
monitoring_alb_min_healthy_hosts_threshold  = 1
monitoring_redis_engine_cpu_threshold       = 75
monitoring_monthly_budget_limit_usd         = 100
monitoring_budget_alert_thresholds          = [80, 90, 100]

enable_github_actions_oidc = true
github_actions_repository  = "timtimtim87/CHESSCHAT_V2"
github_actions_branch      = "main"
