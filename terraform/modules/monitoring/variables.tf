variable "project" {
  description = "Short project identifier (used for naming/tagging)."
  type        = string
}

variable "environment" {
  description = "Deployment environment name (for example, dev)."
  type        = string
}

variable "aws_region" {
  description = "AWS region where CloudWatch resources are created."
  type        = string
}

variable "enabled" {
  description = "Whether to create monitoring resources."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Map of common tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}

variable "ecs_cluster_name" {
  description = "ECS cluster name for ECS service alarms."
  type        = string
  default     = null
}

variable "ecs_service_name" {
  description = "ECS service name for ECS service alarms."
  type        = string
  default     = null
}

variable "alb_arn_suffix" {
  description = "ALB ARN suffix used by CloudWatch ApplicationELB metrics."
  type        = string
  default     = null
}

variable "target_group_arn_suffix" {
  description = "Target group ARN suffix used by CloudWatch ApplicationELB metrics."
  type        = string
  default     = null
}

variable "redis_replication_group_id" {
  description = "ElastiCache replication group ID used by Redis alarms."
  type        = string
  default     = null
}

variable "dynamodb_users_table_name" {
  description = "DynamoDB users table name for throttling alarms."
  type        = string
  default     = null
}

variable "dynamodb_games_table_name" {
  description = "DynamoDB games table name for throttling alarms."
  type        = string
  default     = null
}

variable "alarm_email_endpoints" {
  description = "Email addresses subscribed to SNS monitoring notifications."
  type        = list(string)
  default     = []
}

variable "alarm_period_seconds" {
  description = "CloudWatch alarm period in seconds."
  type        = number
  default     = 300
}

variable "alarm_evaluation_periods" {
  description = "Number of periods evaluated for alarm decisions."
  type        = number
  default     = 2
}

variable "alarm_datapoints_to_alarm" {
  description = "Number of breaching datapoints required to trigger an alarm."
  type        = number
  default     = 2
}

variable "ecs_cpu_utilization_threshold" {
  description = "ECS CPUUtilization alarm threshold percentage."
  type        = number
  default     = 75
}

variable "ecs_memory_utilization_threshold" {
  description = "ECS MemoryUtilization alarm threshold percentage."
  type        = number
  default     = 80
}

variable "alb_5xx_count_threshold" {
  description = "ApplicationELB 5XX count threshold per alarm period."
  type        = number
  default     = 5
}

variable "alb_min_healthy_hosts_threshold" {
  description = "Minimum healthy target count expected behind the ALB target group."
  type        = number
  default     = 1
}

variable "redis_engine_cpu_threshold" {
  description = "Redis EngineCPUUtilization alarm threshold percentage."
  type        = number
  default     = 75
}

variable "monthly_budget_limit_usd" {
  description = "Monthly AWS cost budget in USD."
  type        = number
  default     = 250
}

variable "app_metric_namespace" {
  description = "CloudWatch namespace for app-level custom metrics."
  type        = string
  default     = null
}

variable "budget_alert_thresholds" {
  description = "Budget alert thresholds as percentages."
  type        = list(number)
  default     = [80, 90, 100]
}
