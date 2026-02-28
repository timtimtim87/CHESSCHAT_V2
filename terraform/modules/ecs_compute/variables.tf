variable "project" {
  description = "Short project identifier (used for naming/tagging)."
  type        = string
}

variable "environment" {
  description = "Deployment environment identifier (dev, staging, prod)."
  type        = string
}

variable "enabled" {
  description = "Whether to create ECS compute resources."
  type        = bool
  default     = true
}

variable "vpc_id" {
  description = "VPC ID used for the ECS service security group."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private app subnet IDs where ECS tasks run."
  type        = list(string)
}

variable "execution_role_arn" {
  description = "IAM execution role ARN for ECS task startup operations."
  type        = string
}

variable "task_role_arn" {
  description = "IAM task role ARN for application AWS API access."
  type        = string
}

variable "ecr_repository_name" {
  description = "Optional explicit ECR repository name for the app container image."
  type        = string
  default     = null
}

variable "image_tag" {
  description = "Container image tag in ECR used by the task definition."
  type        = string
  default     = "bootstrap"
}

variable "container_name" {
  description = "Primary application container name."
  type        = string
  default     = "app"
}

variable "container_port" {
  description = "TCP port exposed by the application container."
  type        = number
  default     = 8080
}

variable "task_cpu" {
  description = "Fargate task CPU units."
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Fargate task memory in MiB."
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired number of tasks for the ECS service."
  type        = number
  default     = 1
}

variable "enable_alb_integration" {
  description = "Whether ECS service should register tasks with an ALB target group."
  type        = bool
  default     = false
}

variable "alb_target_group_arn" {
  description = "Optional ALB target group ARN used for ECS service registration."
  type        = string
  default     = null
}

variable "alb_security_group_id" {
  description = "Optional ALB security group ID allowed to reach ECS tasks."
  type        = string
  default     = null
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention for ECS application logs."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Map of common tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
