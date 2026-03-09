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

variable "enable_google_identity_provider" {
  description = "Whether to create the Google federated identity provider in Cognito."
  type        = bool
  default     = false
}

variable "google_client_id" {
  description = "Google OAuth client ID used by Cognito IdP."
  type        = string
  default     = null
}

variable "google_client_secret" {
  description = "Google OAuth client secret used by Cognito IdP."
  type        = string
  default     = null
  sensitive   = true
}

variable "apple_service_id" {
  description = "Apple Service ID placeholder for future Apple Sign In integration."
  type        = string
  default     = null
}

variable "apple_team_id" {
  description = "Apple Team ID placeholder for future Apple Sign In integration."
  type        = string
  default     = null
}

variable "apple_key_id" {
  description = "Apple key ID placeholder for future Apple Sign In integration."
  type        = string
  default     = null
}

variable "apple_private_key" {
  description = "Apple private key placeholder for future Apple Sign In integration."
  type        = string
  default     = null
  sensitive   = true
}

variable "tags" {
  description = "Map of common tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
