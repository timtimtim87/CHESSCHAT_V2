variable "project" {
  description = "Short identifier used in resource names and tags."
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod, etc.)."
  type        = string
}

variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
}

variable "tags" {
  description = "Additional tags to apply to every resource."
  type        = map(string)
  default     = {}
}
