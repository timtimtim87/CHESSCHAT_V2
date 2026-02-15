project     = "chesschat"
environment = "dev"
aws_region  = "us-east-1"
vpc_cidr    = "10.20.0.0/16"
az_count    = 3

# single: lower cost, single-AZ egress dependency
# per_az: higher cost, better AZ resilience
nat_gateway_mode     = "single"
enable_vpc_endpoints = true
enable_flow_logs     = true

tags = {
  Project = "chesschat"
}
