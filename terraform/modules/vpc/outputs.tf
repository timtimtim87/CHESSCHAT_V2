output "vpc_module_status" {
  value       = "vpc module active"
  description = "Indicates that the vpc module has concrete resources configured."
}

output "vpc_id" {
  value       = aws_vpc.this.id
  description = "ID of the VPC."
}

output "vpc_cidr_block" {
  value       = aws_vpc.this.cidr_block
  description = "CIDR block assigned to the VPC."
}

output "availability_zones" {
  value       = local.azs
  description = "Availability Zones selected for this deployment."
}

output "public_subnet_ids" {
  value       = [for az in local.azs : aws_subnet.public[az].id]
  description = "IDs of public subnets."
}

output "private_app_subnet_ids" {
  value       = [for az in local.azs : aws_subnet.private_app[az].id]
  description = "IDs of private app subnets."
}

output "private_data_subnet_ids" {
  value       = [for az in local.azs : aws_subnet.private_data[az].id]
  description = "IDs of private data subnets."
}

output "public_route_table_id" {
  value       = aws_route_table.public.id
  description = "ID of the shared public route table."
}

output "private_app_route_table_ids" {
  value       = [for az in local.azs : aws_route_table.private_app[az].id]
  description = "IDs of private app route tables."
}

output "private_data_route_table_ids" {
  value       = [for az in local.azs : aws_route_table.private_data[az].id]
  description = "IDs of private data route tables."
}

output "nat_gateway_ids" {
  value       = aws_nat_gateway.this[*].id
  description = "NAT Gateway IDs created by this module."
}

output "vpc_endpoint_ids" {
  value = merge(
    {
      s3       = try(aws_vpc_endpoint.s3[0].id, null)
      dynamodb = try(aws_vpc_endpoint.dynamodb[0].id, null)
    },
    { for service, endpoint in aws_vpc_endpoint.interface : service => endpoint.id }
  )
  description = "Map of endpoint service names to endpoint IDs."
}

output "vpc_endpoint_security_group_id" {
  value       = try(aws_security_group.interface_endpoints[0].id, null)
  description = "Security group ID used by interface endpoints."
}

output "flow_log_id" {
  value       = try(aws_flow_log.vpc[0].id, null)
  description = "Flow log ID when flow logs are enabled."
}
