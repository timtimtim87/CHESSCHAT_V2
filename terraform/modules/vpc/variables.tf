variable "project" {
  description = "Short project identifier (used for naming/tagging)."
  type        = string
}

variable "environment" {
  description = "Deployment environment identifier (dev, staging, prod)."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
}

variable "az_count" {
  description = "Number of Availability Zones to use."
  type        = number
}

variable "nat_gateway_mode" {
  description = "NAT gateway strategy: single or per_az."
  type        = string
}

variable "enable_vpc_endpoints" {
  description = "Whether to create VPC endpoints."
  type        = bool
}

variable "enable_flow_logs" {
  description = "Whether to create VPC flow logs."
  type        = bool
}

variable "tags" {
  description = "Map of common tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
