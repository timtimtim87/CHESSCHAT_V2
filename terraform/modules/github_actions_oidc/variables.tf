variable "enabled" {
  description = "Whether to create GitHub OIDC provider and deployment role."
  type        = bool
  default     = true
}

variable "project" {
  description = "Short project identifier for naming."
  type        = string
}

variable "environment" {
  description = "Environment identifier used for naming."
  type        = string
}

variable "github_repository" {
  description = "GitHub repository in owner/repo format."
  type        = string
}

variable "github_branch" {
  description = "Git branch allowed to assume deployment role."
  type        = string
  default     = "main"
}

variable "oidc_thumbprints" {
  description = "Thumbprints for the GitHub OIDC root certificate chain."
  type        = list(string)
  default     = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

variable "ecr_repository_arn" {
  description = "ECR repository ARN used for build push permissions."
  type        = string
}

variable "ecs_cluster_name" {
  description = "ECS cluster name for deployment permissions."
  type        = string
}

variable "ecs_service_name" {
  description = "ECS service name for deployment permissions."
  type        = string
}

variable "task_execution_role_arn" {
  description = "ECS task execution role ARN to allow iam:PassRole."
  type        = string
}

variable "task_role_arn" {
  description = "ECS task role ARN to allow iam:PassRole."
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "Cognito user pool ARN for E2E admin user lifecycle actions."
  type        = string
}

variable "static_site_bucket_name" {
  description = "Optional static site S3 bucket name for deploy workflow publish permissions."
  type        = string
  default     = null
}

variable "static_cloudfront_distribution_id" {
  description = "Optional CloudFront distribution ID for static site invalidation permissions."
  type        = string
  default     = null
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
