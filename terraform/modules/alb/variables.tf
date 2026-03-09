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

variable "certificate_domains" {
  description = "Ordered list of DNS names for ACM certificate (first entry is primary CN, remainder are SANs)."
  type        = list(string)
  default     = []
}

variable "canonical_host" {
  description = "Canonical hostname that should receive forwarded traffic."
  type        = string
  default     = null
}

variable "redirect_hosts" {
  description = "Hostnames that should be redirected to canonical_host."
  type        = list(string)
  default     = []
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
