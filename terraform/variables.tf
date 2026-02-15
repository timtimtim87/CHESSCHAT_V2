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

variable "vpc_cidr" {
  description = "CIDR block for the CHESSCHAT VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "az_count" {
  description = "Number of Availability Zones to use for subnet tiers."
  type        = number
  default     = 3

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "Az_count must be 2 or 3 for the portfolio multi-AZ baseline."
  }
}

variable "nat_gateway_mode" {
  description = "NAT gateway strategy: single (cost optimized) or per_az (higher availability)."
  type        = string
  default     = "single"

  validation {
    condition     = contains(["single", "per_az"], var.nat_gateway_mode)
    error_message = "Nat_gateway_mode must be either single or per_az."
  }
}

variable "enable_vpc_endpoints" {
  description = "Whether to create VPC endpoints for AWS services used by private workloads."
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Whether to enable VPC Flow Logs to CloudWatch Logs."
  type        = bool
  default     = true
}
