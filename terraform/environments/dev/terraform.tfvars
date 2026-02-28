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

enable_ecs_compute        = true
ecr_repository_name       = "chesschat-dev-app"
ecs_image_tag             = "bootstrap"
ecs_container_name        = "app"
ecs_container_port        = 8080
ecs_task_cpu              = 256
ecs_task_memory           = 512
ecs_service_desired_count = 1
ecs_log_retention_days    = 30

# Keep edge and DNS off until domain details are ready.
enable_edge         = false
enable_dns          = false
create_route53_zone = false
route53_zone_id     = null
root_domain_name    = null
app_subdomain       = "app"

# Placeholder callback/logout URLs until Route53 + ALB are live.
cognito_callback_urls           = ["https://app.chesschat.example.com/auth/callback"]
cognito_logout_urls             = ["https://app.chesschat.example.com/logout"]
use_app_domain_for_cognito_urls = false
