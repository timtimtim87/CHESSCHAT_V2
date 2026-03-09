variable "project" {
  description = "Short project identifier (used for naming/tagging)."
  type        = string
}

variable "environment" {
  description = "Deployment environment identifier (dev, staging, prod)."
  type        = string
}

variable "enabled" {
  description = "Whether to create static edge resources (S3 + CloudFront + apex DNS)."
  type        = bool
  default     = false
}

variable "root_domain_name" {
  description = "Apex/root public DNS domain (for example, chess-chat.com)."
  type        = string
  default     = null
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID used for certificate validation and apex alias."
  type        = string
  default     = null
}

variable "auth_no_cache_paths" {
  description = "CloudFront path patterns that must not be cached."
  type        = list(string)
  default = [
    "/login*",
    "/signup*",
    "/verify-email*",
    "/forgot-password*",
    "/reset-password*",
    "/auth/callback*"
  ]
}

variable "tags" {
  description = "Map of common tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
