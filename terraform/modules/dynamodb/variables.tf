variable "project" {
  description = "Short project identifier (used for naming/tagging)."
  type        = string
}

variable "environment" {
  description = "Deployment environment identifier (dev, staging, prod)."
  type        = string
}

variable "users_table_name" {
  description = "DynamoDB table name for persistent user profiles and counters."
  type        = string
  default     = null
}

variable "games_table_name" {
  description = "DynamoDB table name for completed game history."
  type        = string
  default     = null
}

variable "pair_rooms_table_name" {
  description = "DynamoDB table name for persistent player-pair room code mappings."
  type        = string
  default     = null
}

variable "billing_mode" {
  description = "Billing mode for DynamoDB tables."
  type        = string
  default     = "PAY_PER_REQUEST"

  validation {
    condition     = contains(["PAY_PER_REQUEST", "PROVISIONED"], var.billing_mode)
    error_message = "Billing_mode must be PAY_PER_REQUEST or PROVISIONED."
  }
}

variable "enable_pitr" {
  description = "Whether to enable point-in-time recovery for both DynamoDB tables."
  type        = bool
  default     = true
}

variable "deletion_protection_enabled" {
  description = "Whether to enable deletion protection for both DynamoDB tables."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Map of common tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
