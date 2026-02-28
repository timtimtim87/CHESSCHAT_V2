variable "project" {
  description = "Short project identifier (used for naming/tagging)."
  type        = string
}

variable "environment" {
  description = "Deployment environment identifier (dev, staging, prod)."
  type        = string
}

variable "enabled" {
  description = "Whether to create ALB and ACM resources."
  type        = bool
  default     = false
}

variable "vpc_id" {
  description = "VPC ID where the ALB and target group are deployed."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB nodes."
  type        = list(string)
}

variable "target_port" {
  description = "Target port forwarded from ALB to ECS tasks."
  type        = number
  default     = 8080
}

variable "root_domain_name" {
  description = "Root DNS domain for ACM certificate and app endpoint."
  type        = string
  default     = null
}

variable "app_subdomain" {
  description = "Subdomain label for app endpoint."
  type        = string
  default     = "app"
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID used for ACM DNS validation records."
  type        = string
  default     = null
}

variable "health_check_path" {
  description = "HTTP path used by ALB target group health checks."
  type        = string
  default     = "/healthz"
}

variable "tags" {
  description = "Map of common tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
