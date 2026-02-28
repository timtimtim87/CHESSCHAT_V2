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
    "https://app.chesschat.example.com/auth/callback"
  ]
}

variable "cognito_logout_urls" {
  description = "OAuth logout URLs for Cognito app client."
  type        = list(string)
  default = [
    "https://app.chesschat.example.com/logout"
  ]
}

variable "ecr_repository_arns" {
  description = "ECR repository ARNs for ECS task execution role image pull access."
  type        = list(string)
  default     = []
}
