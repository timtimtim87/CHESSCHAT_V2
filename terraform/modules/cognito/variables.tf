variable "project" {
  description = "Short project identifier (used for naming/tagging)."
  type        = string
}

variable "tags" {
  description = "Map of common tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
