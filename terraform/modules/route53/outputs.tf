output "route53_module_status" {
  value       = "route53 module active"
  description = "Indicates that the route53 module has concrete resources configured."
}

output "effective_zone_id" {
  value       = local.effective_zone_id
  description = "Effective hosted zone ID used for CHESSCHAT DNS resources."
}

output "app_fqdn" {
  value       = try(var.alias_records[0], null)
  description = "Primary DNS name aliasing to the app ALB."
}

output "app_alias_fqdn" {
  value       = [for record in aws_route53_record.app_alias : record.fqdn]
  description = "FQDNs of Route53 app alias records."
}

output "name_servers" {
  value       = try(aws_route53_zone.this[0].name_servers, null)
  description = "Authoritative nameservers when this module creates a hosted zone."
}
