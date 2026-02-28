output "route53_module_status" {
  value       = "route53 module active"
  description = "Indicates that the route53 module has concrete resources configured."
}

output "effective_zone_id" {
  value       = local.effective_zone_id
  description = "Effective hosted zone ID used for CHESSCHAT DNS resources."
}

output "app_fqdn" {
  value       = local.app_fqdn
  description = "Fully qualified app DNS name."
}

output "app_alias_fqdn" {
  value       = try(aws_route53_record.app_alias[0].fqdn, null)
  description = "FQDN of the Route53 app alias record."
}

output "name_servers" {
  value       = try(aws_route53_zone.this[0].name_servers, null)
  description = "Authoritative nameservers when this module creates a hosted zone."
}
