output "module_status" {
  value       = "github_actions_oidc module active"
  description = "Indicates module wiring is active."
}

output "deploy_role_arn" {
  value       = try(aws_iam_role.github_actions_deploy[0].arn, null)
  description = "IAM role ARN assumed by GitHub Actions for deploy workflows."
}

output "oidc_provider_arn" {
  value       = try(aws_iam_openid_connect_provider.github[0].arn, null)
  description = "IAM OIDC provider ARN for GitHub Actions federation."
}
