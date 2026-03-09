# ROUTE53 module

## Purpose
Own public DNS resources for CHESSCHAT application endpoints.

## Resources
- `aws_route53_zone.this` (optional)
- `aws_route53_record.app_alias` (optional)

## Key Inputs
- `enabled` (bool)
- `create_hosted_zone` (bool)
- `root_domain_name` (string)
- `route53_zone_id` (string)
- `alias_records` (list(string))
- `alb_dns_name` (string)
- `alb_zone_id` (string)

## Notes
- Use `create_hosted_zone=true` when CHESSCHAT should own the zone in this AWS account.
- Use `route53_zone_id` when reusing an existing zone.
- App alias record creation is gated until ALB DNS and zone IDs are provided.
