output "alb_module_status" {
  value       = "alb module active"
  description = "Indicates that the alb module has concrete resources configured."
}

output "alb_arn" {
  value       = try(aws_lb.this[0].arn, null)
  description = "Application Load Balancer ARN."
}

output "alb_dns_name" {
  value       = try(aws_lb.this[0].dns_name, null)
  description = "DNS name of the Application Load Balancer."
}

output "alb_zone_id" {
  value       = try(aws_lb.this[0].zone_id, null)
  description = "Canonical hosted zone ID of the Application Load Balancer."
}

output "alb_security_group_id" {
  value       = try(aws_security_group.alb[0].id, null)
  description = "ALB security group ID."
}

output "target_group_arn" {
  value       = try(aws_lb_target_group.app[0].arn, null)
  description = "ALB target group ARN for ECS service registration."
}

output "app_domain_name" {
  value       = try(var.certificate_domains[0], null)
  description = "Primary app domain name used as ACM common name."
}

output "app_domain_names" {
  value       = var.certificate_domains
  description = "All domain names covered by ACM for app ingress."
}

output "acm_certificate_arn" {
  value       = try(aws_acm_certificate.app[0].arn, null)
  description = "ACM certificate ARN for the app domain."
}

output "https_listener_arn" {
  value       = try(aws_lb_listener.https[0].arn, null)
  description = "HTTPS listener ARN when certificate validation is complete."
}
