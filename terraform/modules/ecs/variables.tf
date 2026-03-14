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

variable "ecr_repository_arns" {
  description = "ECR repository ARNs for task execution image pull access."
  type        = list(string)
  default     = []
}

variable "cognito_user_pool_arn" {
  description = "Cognito user pool ARN — grants the task role AdminDeleteUser for account deletion."
  type        = string
  default     = null
}

variable "tags" {
  description = "Map of common tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
