variable "project" {
  description = "Short identifier used in resource names and tags."
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod, etc.)."
  type        = string
}

variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
}

variable "tags" {
  description = "Additional tags to apply to every resource."
  type        = map(string)
  default     = {}
}

variable "vpc_cidr" {
  description = "CIDR block for the CHESSCHAT VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "az_count" {
  description = "Number of Availability Zones to use for subnet tiers."
  type        = number
  default     = 3

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "Az_count must be 2 or 3 for the portfolio multi-AZ baseline."
  }
}

variable "nat_gateway_mode" {
  description = "NAT gateway strategy: single (cost optimized) or per_az (higher availability)."
  type        = string
  default     = "single"

  validation {
    condition     = contains(["single", "per_az"], var.nat_gateway_mode)
    error_message = "Nat_gateway_mode must be either single or per_az."
  }
}

variable "enable_vpc_endpoints" {
  description = "Whether to create VPC endpoints for AWS services used by private workloads."
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Whether to enable VPC Flow Logs to CloudWatch Logs."
  type        = bool
  default     = true
}

variable "dynamodb_users_table_name" {
  description = "Optional explicit DynamoDB users table name override."
  type        = string
  default     = null
}

variable "dynamodb_games_table_name" {
  description = "Optional explicit DynamoDB games table name override."
  type        = string
  default     = null
}

variable "dynamodb_pair_rooms_table_name" {
  description = "Optional explicit DynamoDB pair rooms table name override."
  type        = string
  default     = null
}

variable "dynamodb_friendships_table_name" {
  description = "Optional explicit DynamoDB friendships table name override."
  type        = string
  default     = null
}

variable "dynamodb_friend_requests_table_name" {
  description = "Optional explicit DynamoDB friend requests table name override."
  type        = string
  default     = null
}

variable "dynamodb_challenges_table_name" {
  description = "Optional explicit DynamoDB challenges table name override."
  type        = string
  default     = null
}

variable "dynamodb_notifications_table_name" {
  description = "Optional explicit DynamoDB notifications table name override."
  type        = string
  default     = null
}

variable "redis_allowed_security_group_ids" {
  description = "Security groups allowed to access Redis on 6379 (for example, ECS service SGs)."
  type        = list(string)
  default     = []
}

variable "redis_node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_num_cache_clusters" {
  description = "Number of cache nodes in the Redis replication group."
  type        = number
  default     = 2
}

variable "cognito_domain_prefix" {
  description = "Optional explicit Cognito hosted UI domain prefix."
  type        = string
  default     = null
}

variable "cognito_callback_urls" {
  description = "OAuth callback URLs for Cognito app client."
  type        = list(string)
  default = [
    "https://chesschat.example.com/auth/callback"
  ]
}

variable "cognito_logout_urls" {
  description = "OAuth logout URLs for Cognito app client."
  type        = list(string)
  default = [
    "https://chesschat.example.com/"
  ]
}

variable "ecr_repository_arns" {
  description = "ECR repository ARNs for ECS task execution role image pull access."
  type        = list(string)
  default     = []
}

variable "enable_ecs_compute" {
  description = "Whether to create ECR, ECS cluster, task definition, and ECS service resources."
  type        = bool
  default     = true
}

variable "ecr_repository_name" {
  description = "Optional explicit ECR repository name for the ECS app image."
  type        = string
  default     = null
}

variable "ecs_image_tag" {
  description = "Container image tag used in the ECS task definition."
  type        = string
  default     = "bootstrap"
}

variable "ecs_container_name" {
  description = "Primary container name in the ECS task definition."
  type        = string
  default     = "app"
}

variable "ecs_container_port" {
  description = "Container port exposed by the ECS task."
  type        = number
  default     = 8080
}

variable "ecs_container_environment" {
  description = "Additional environment variables passed to the ECS app container."
  type        = map(string)
  default     = {}
}

variable "ecs_container_secrets" {
  description = "Optional list of container secrets (name/valueFrom) passed to ECS app container."
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

variable "ecs_task_cpu" {
  description = "Fargate task CPU units."
  type        = number
  default     = 256
}

variable "ecs_task_memory" {
  description = "Fargate task memory in MiB."
  type        = number
  default     = 512
}

variable "ecs_service_desired_count" {
  description = "Desired number of running ECS tasks."
  type        = number
  default     = 1
}

variable "ecs_log_retention_days" {
  description = "CloudWatch log retention period for ECS task logs."
  type        = number
  default     = 30
}

variable "enable_edge" {
  description = "Whether to create ACM and ALB resources for HTTPS ingress."
  type        = bool
  default     = false
}

variable "enable_static_edge" {
  description = "Whether to create static apex hosting resources (S3 + CloudFront + apex alias)."
  type        = bool
  default     = false
}

variable "enable_dns" {
  description = "Whether to create Route53 records for the application domain."
  type        = bool
  default     = false
}

variable "create_route53_zone" {
  description = "Whether to create a new public Route53 hosted zone."
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "Optional existing Route53 hosted zone ID. If null, lookup/create behavior is used."
  type        = string
  default     = null
}

variable "root_domain_name" {
  description = "Root public DNS domain (for example, chesschat.example.com)."
  type        = string
  default     = null
}

variable "app_subdomain" {
  description = "Subdomain label for the frontend/app endpoint."
  type        = string
  default     = "app"
}

variable "alb_health_check_path" {
  description = "HTTP health check path used by the ALB target group."
  type        = string
  default     = "/healthz"
}

variable "use_app_domain_for_cognito_urls" {
  description = "Whether to derive Cognito callback/logout URLs from root_domain_name."
  type        = bool
  default     = false
}

variable "static_auth_no_cache_paths" {
  description = "CloudFront path patterns on apex host where caching should be disabled."
  type        = list(string)
  default = [
    "/login*",
    "/signup*",
    "/verify-email*",
    "/forgot-password*",
    "/reset-password*",
    "/auth/callback*",
  ]
}

variable "cognito_enable_google_identity_provider" {
  description = "Whether to provision Google as a Cognito federated identity provider."
  type        = bool
  default     = false
}

variable "cognito_google_client_id" {
  description = "Google OAuth client ID used for Cognito Google IdP."
  type        = string
  default     = null
}

variable "cognito_google_client_secret" {
  description = "Google OAuth client secret used for Cognito Google IdP."
  type        = string
  default     = null
  sensitive   = true
}

variable "cognito_apple_service_id" {
  description = "Apple Service ID placeholder for future Apple Sign In integration."
  type        = string
  default     = null
}

variable "cognito_apple_team_id" {
  description = "Apple Team ID placeholder for future Apple Sign In integration."
  type        = string
  default     = null
}

variable "cognito_apple_key_id" {
  description = "Apple Key ID placeholder for future Apple Sign In integration."
  type        = string
  default     = null
}

variable "cognito_apple_private_key" {
  description = "Apple private key placeholder for future Apple Sign In integration."
  type        = string
  default     = null
  sensitive   = true
}

variable "enable_monitoring" {
  description = "Whether to create CloudWatch/SNS/Budget monitoring resources."
  type        = bool
  default     = true
}

variable "monitoring_alarm_email_endpoints" {
  description = "Email endpoints subscribed to monitoring SNS notifications."
  type        = list(string)
  default     = []
}

variable "monitoring_alarm_period_seconds" {
  description = "CloudWatch alarm period in seconds for baseline monitoring alarms."
  type        = number
  default     = 300
}

variable "monitoring_alarm_evaluation_periods" {
  description = "CloudWatch alarm evaluation periods for threshold-based alarms."
  type        = number
  default     = 2
}

variable "monitoring_alarm_datapoints_to_alarm" {
  description = "Number of breaching datapoints needed to trigger threshold-based alarms."
  type        = number
  default     = 2
}

variable "monitoring_ecs_cpu_utilization_threshold" {
  description = "ECS CPU utilization alarm threshold percentage."
  type        = number
  default     = 75
}

variable "monitoring_ecs_memory_utilization_threshold" {
  description = "ECS memory utilization alarm threshold percentage."
  type        = number
  default     = 80
}

variable "monitoring_alb_5xx_count_threshold" {
  description = "ALB 5xx count threshold per period."
  type        = number
  default     = 5
}

variable "monitoring_alb_min_healthy_hosts_threshold" {
  description = "Minimum healthy host count expected for ALB target group."
  type        = number
  default     = 1
}

variable "monitoring_redis_engine_cpu_threshold" {
  description = "Redis engine CPU utilization threshold percentage."
  type        = number
  default     = 75
}

variable "monitoring_monthly_budget_limit_usd" {
  description = "Monthly AWS budget threshold in USD."
  type        = number
  default     = 250
}

variable "monitoring_budget_alert_thresholds" {
  description = "Budget alert thresholds as percentages."
  type        = list(number)
  default     = [80, 90, 100]
}

variable "enable_github_actions_oidc" {
  description = "Whether to provision IAM OIDC trust and deploy role for GitHub Actions."
  type        = bool
  default     = true
}

variable "github_actions_repository" {
  description = "GitHub repository (owner/repo) allowed to assume deploy role."
  type        = string
  default     = "timtimtim87/CHESSCHAT_V2"
}

variable "github_actions_branch" {
  description = "Git branch permitted in GitHub OIDC trust policy."
  type        = string
  default     = "main"
}

variable "github_actions_oidc_thumbprints" {
  description = "Root certificate thumbprints for token.actions.githubusercontent.com."
  type        = list(string)
  default     = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}
