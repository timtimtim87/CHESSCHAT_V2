# VPC module

Creates the CHESSCHAT network foundation in a single region with a multi-AZ layout.

## Purpose
Own resources for the VPC/network layer only.

## Inputs
- `project` (string): project identifier used for naming/tagging.
- `environment` (string): environment identifier used in naming.
- `vpc_cidr` (string): CIDR for the VPC (default from root is `10.20.0.0/16`).
- `az_count` (number): number of AZs to use (`2` or `3`).
- `nat_gateway_mode` (string): `single` or `per_az`.
- `enable_vpc_endpoints` (bool): create S3/DynamoDB gateway + ECR/Logs/Secrets interface endpoints.
- `enable_flow_logs` (bool): enable VPC Flow Logs to CloudWatch Logs.
- `tags` (map(string)): common resource tags.

## Outputs
- `vpc_id`, `vpc_cidr_block`, `availability_zones`
- `public_subnet_ids`, `private_app_subnet_ids`, `private_data_subnet_ids`
- `public_route_table_id`, `private_app_route_table_ids`, `private_data_route_table_ids`
- `nat_gateway_ids`
- `vpc_endpoint_ids`, `vpc_endpoint_security_group_id`
- `flow_log_id`
