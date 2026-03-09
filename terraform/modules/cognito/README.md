# COGNITO module

## Purpose
Own resources for Cognito authentication and hosted login.

## Resources
- `aws_cognito_user_pool.this`
  - Email sign-in enabled
  - Email auto-verification
  - Password policy (min length 12, mixed complexity)
- `aws_cognito_user_pool_client.app`
  - OAuth 2.0 Authorization Code Grant
  - Scopes: `openid`, `email`, `profile`
  - Access/ID tokens: 1 hour
  - Refresh token: 30 days
- `aws_cognito_user_pool_domain.this`
  - Hosted UI domain prefix (generated unless explicitly set)

## Key Inputs
- `project` (string)
- `environment` (string)
- `cognito_domain_prefix` (string, optional)
- `callback_urls` (list(string))
- `logout_urls` (list(string))
- `supported_identity_providers` (list(string), default `["COGNITO"]`)
- `enable_google_identity_provider` (bool, default `false`)
- `google_client_id` / `google_client_secret` (string, optional)
- Apple placeholder inputs (for deferred implementation):
  - `apple_service_id`
  - `apple_team_id`
  - `apple_key_id`
  - `apple_private_key`
- `tags` (map(string))

## Outputs
- `cognito_module_status`
- `user_pool_id`
- `user_pool_arn`
- `app_client_id`
- `domain_prefix`
- `hosted_ui_base_url`
