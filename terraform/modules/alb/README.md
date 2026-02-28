# ALB module

## Purpose
Own the edge ingress resources for CHESSCHAT HTTPS entry.

## Resources
- `aws_lb.this`
- `aws_lb_target_group.app`
- `aws_lb_listener.http`
- `aws_acm_certificate.app`
- `aws_route53_record.cert_validation` (optional)
- `aws_acm_certificate_validation.app` (optional)
- `aws_lb_listener.https` (optional)

## Key Inputs
- `enabled` (bool)
- `vpc_id` (string)
- `public_subnet_ids` (list(string))
- `target_port` (number)
- `root_domain_name` (string)
- `app_subdomain` (string)
- `route53_zone_id` (string)

## Notes
- HTTPS listener is created only when `route53_zone_id` is provided and ACM DNS validation can complete.
- ECS-side ingress and ECS service target group attachment are managed in `ecs_compute` to avoid ALB/ECS dependency cycles.
