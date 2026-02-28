variable "project" {
  description = "Short project identifier (used for naming/tagging)."
  type        = string
}

variable "environment" {
  description = "Deployment environment identifier (dev, staging, prod)."
  type        = string
}

variable "cognito_domain_prefix" {
  description = "Optional explicit Cognito domain prefix. If null, a generated one is used."
  type        = string
  default     = null
}

variable "callback_urls" {
  description = "OAuth callback URLs for the app client."
  type        = list(string)
}

variable "logout_urls" {
  description = "OAuth logout URLs for the app client."
  type        = list(string)
}

variable "supported_identity_providers" {
  description = "Identity providers enabled for the app client."
  type        = list(string)
  default     = ["COGNITO"]
}

variable "tags" {
  description = "Map of common tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
