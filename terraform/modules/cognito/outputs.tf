output "cognito_module_status" {
  value       = "cognito module active"
  description = "Indicates that the cognito module has concrete resources configured."
}

output "user_pool_id" {
  value       = aws_cognito_user_pool.this.id
  description = "Cognito user pool ID."
}

output "user_pool_arn" {
  value       = aws_cognito_user_pool.this.arn
  description = "Cognito user pool ARN."
}

output "app_client_id" {
  value       = aws_cognito_user_pool_client.app.id
  description = "Cognito app client ID."
}

output "domain_prefix" {
  value       = aws_cognito_user_pool_domain.this.domain
  description = "Cognito hosted UI domain prefix."
}

output "hosted_ui_base_url" {
  value       = "https://${aws_cognito_user_pool_domain.this.domain}.auth.${data.aws_region.current.region}.amazoncognito.com"
  description = "Base URL for Cognito hosted UI."
}
