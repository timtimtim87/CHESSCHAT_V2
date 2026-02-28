variable "project" {
  description = "Short project identifier (used for naming/tagging)."
  type        = string
}

variable "environment" {
  description = "Deployment environment identifier (dev, staging, prod)."
  type        = string
}

variable "enabled" {
  description = "Whether to create Route53 resources."
  type        = bool
  default     = false
}

variable "create_hosted_zone" {
  description = "Whether to create a new public hosted zone."
  type        = bool
  default     = false
}

variable "root_domain_name" {
  description = "Root public DNS domain used by CHESSCHAT."
  type        = string
  default     = null
}

variable "route53_zone_id" {
  description = "Optional existing hosted zone ID."
  type        = string
  default     = null
}

variable "app_subdomain" {
  description = "Subdomain label for app endpoint."
  type        = string
  default     = "app"
}

variable "alb_dns_name" {
  description = "ALB DNS name used for alias target."
  type        = string
  default     = null
}

variable "alb_zone_id" {
  description = "ALB canonical hosted zone ID for alias target."
  type        = string
  default     = null
}

variable "evaluate_target_health" {
  description = "Whether Route53 alias should evaluate target health."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Map of common tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
