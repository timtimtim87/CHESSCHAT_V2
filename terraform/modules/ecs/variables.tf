variable "project" {
  description = "Short project identifier (used for naming/tagging)."
  type        = string
}

variable "environment" {
  description = "Deployment environment identifier (dev, staging, prod)."
  type        = string
}

variable "dynamodb_table_arns" {
  description = "DynamoDB table ARNs the ECS task role can access."
  type        = list(string)
  default     = []
}

variable "redis_auth_secret_arn" {
  description = "Secrets Manager ARN for Redis auth token."
  type        = string
}

variable "redis_replication_group_arn" {
  description = "ElastiCache replication group ARN for scoped describe permissions."
  type        = string
}

variable "ecr_repository_arns" {
  description = "ECR repository ARNs for task execution image pull access."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Map of common tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
