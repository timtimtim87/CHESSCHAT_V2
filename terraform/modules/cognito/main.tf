data "aws_region" "current" {}

resource "random_id" "domain_suffix" {
  byte_length = 3
}

locals {
  module_name           = "cognito"
  generated_domain      = "${var.project}-${var.environment}-${random_id.domain_suffix.hex}"
  effective_domain      = coalesce(var.cognito_domain_prefix, local.generated_domain)
  user_pool_name        = "${var.project}-${var.environment}-user-pool"
  user_pool_client_name = "${var.project}-${var.environment}-app-client"
}

resource "aws_cognito_user_pool" "this" {
  name = local.user_pool_name

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  tags = merge(var.tags, {
    Name = local.user_pool_name
  })
}

resource "aws_cognito_user_pool_client" "app" {
  name         = local.user_pool_client_name
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = var.supported_identity_providers

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}

resource "aws_cognito_user_pool_domain" "this" {
  domain       = local.effective_domain
  user_pool_id = aws_cognito_user_pool.this.id
}
