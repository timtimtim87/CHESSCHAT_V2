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

# Populate with ECS/service security groups once compute is implemented.
redis_allowed_security_group_ids = []

# Placeholder callback/logout URLs until Route53 + ALB are live.
cognito_callback_urls = ["https://app.chesschat.example.com/auth/callback"]
cognito_logout_urls   = ["https://app.chesschat.example.com/logout"]
