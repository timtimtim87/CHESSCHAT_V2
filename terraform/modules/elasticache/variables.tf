variable "project" {
  description = "Short project identifier (used for naming/tagging)."
  type        = string
}

variable "environment" {
  description = "Deployment environment identifier (dev, staging, prod)."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where ElastiCache resources are deployed."
  type        = string
}

variable "private_data_subnet_ids" {
  description = "Private data subnet IDs used by the ElastiCache subnet group."
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security groups allowed to connect to Redis on 6379 (for example, ECS service SGs)."
  type        = list(string)
  default     = []
}

variable "node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "engine_version" {
  description = "Redis/Valkey engine version."
  type        = string
  default     = "7.0"
}

variable "port" {
  description = "Redis port."
  type        = number
  default     = 6379
}

variable "num_cache_clusters" {
  description = "Number of cache nodes in the replication group (1 primary + replicas)."
  type        = number
  default     = 2
}

variable "automatic_failover_enabled" {
  description = "Whether automatic failover is enabled."
  type        = bool
  default     = true
}

variable "multi_az_enabled" {
  description = "Whether Multi-AZ is enabled for the replication group."
  type        = bool
  default     = true
}

variable "transit_encryption_enabled" {
  description = "Whether in-transit encryption is enabled."
  type        = bool
  default     = true
}

variable "at_rest_encryption_enabled" {
  description = "Whether at-rest encryption is enabled."
  type        = bool
  default     = true
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain automatic snapshots."
  type        = number
  default     = 1
}

variable "tags" {
  description = "Map of common tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
