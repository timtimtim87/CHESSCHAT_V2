# STATIC_EDGE module

## Purpose
Provision static-edge hosting for the apex domain using private S3 + CloudFront + Route53 alias.

## Resources
- Private S3 bucket for static/auth frontend assets.
- S3 public access block + SSE.
- CloudFront Origin Access Control (OAC).
- CloudFront distribution with:
  - default optimized caching for static assets,
  - explicit no-cache auth route behaviors.
- ACM certificate (DNS validation) for apex domain.
- Route53 apex alias to CloudFront.
- S3 bucket policy restricted to CloudFront distribution ARN.

## Key Inputs
- `enabled`
- `root_domain_name`
- `route53_zone_id`
- `auth_no_cache_paths`

## Outputs
- `bucket_name`
- `cloudfront_distribution_id`
- `cloudfront_distribution_domain_name`
- `apex_fqdn`
