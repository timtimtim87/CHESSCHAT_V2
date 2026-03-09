output "static_edge_module_status" {
  value       = "static_edge module active"
  description = "Indicates static edge resources are wired in the root stack."
}

output "bucket_name" {
  value       = try(aws_s3_bucket.site[0].bucket, null)
  description = "S3 bucket storing static site assets for apex host."
}

output "cloudfront_distribution_id" {
  value       = try(aws_cloudfront_distribution.site[0].id, null)
  description = "CloudFront distribution ID for apex static host."
}

output "cloudfront_distribution_domain_name" {
  value       = try(aws_cloudfront_distribution.site[0].domain_name, null)
  description = "CloudFront distribution domain name for apex static host."
}

output "apex_fqdn" {
  value       = try(aws_route53_record.apex_alias[0].fqdn, null)
  description = "Apex DNS FQDN aliasing to CloudFront."
}
