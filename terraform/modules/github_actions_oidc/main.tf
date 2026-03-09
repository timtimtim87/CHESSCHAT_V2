locals {
  name_prefix = "${var.project}-${var.environment}"
  role_name   = "${local.name_prefix}-github-actions-deploy-role"
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.enabled ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = var.oidc_thumbprints

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-github-oidc-provider"
  })
}

data "aws_iam_policy_document" "assume_role" {
  count = var.enabled ? 1 : 0

  statement {
    sid     = "GithubActionsOIDCAssumeRole"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github[0].arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:ref:refs/heads/${var.github_branch}"]
    }
  }
}

resource "aws_iam_role" "github_actions_deploy" {
  count = var.enabled ? 1 : 0

  name               = local.role_name
  assume_role_policy = data.aws_iam_policy_document.assume_role[0].json

  tags = merge(var.tags, {
    Name = local.role_name
  })
}

data "aws_iam_policy_document" "deploy_permissions" {
  count = var.enabled ? 1 : 0

  statement {
    sid    = "ECRAuthorization"
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken"
    ]
    resources = ["*"]
  }

  statement {
    sid    = "ECRPushPull"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart"
    ]
    resources = [var.ecr_repository_arn]
  }

  statement {
    sid    = "ECSDescribeAndUpdate"
    effect = "Allow"
    actions = [
      "ecs:DescribeClusters",
      "ecs:DescribeServices",
      "ecs:DescribeTaskDefinition",
      "ecs:RegisterTaskDefinition",
      "ecs:UpdateService"
    ]
    resources = ["*"]
  }

  statement {
    sid    = "IAMPassRoleForECSTasks"
    effect = "Allow"
    actions = [
      "iam:PassRole"
    ]
    resources = [
      var.task_execution_role_arn,
      var.task_role_arn
    ]

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }

  statement {
    sid    = "CognitoE2EUserLifecycle"
    effect = "Allow"
    actions = [
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminDeleteUser",
      "cognito-idp:AdminGetUser",
      "cognito-idp:AdminSetUserPassword"
    ]
    resources = [var.cognito_user_pool_arn]
  }

  dynamic "statement" {
    for_each = var.static_site_bucket_name != null && trimspace(var.static_site_bucket_name) != "" ? [1] : []
    content {
      sid    = "StaticSiteBucketList"
      effect = "Allow"
      actions = [
        "s3:ListBucket"
      ]
      resources = [
        "arn:aws:s3:::${var.static_site_bucket_name}"
      ]
    }
  }

  dynamic "statement" {
    for_each = var.static_site_bucket_name != null && trimspace(var.static_site_bucket_name) != "" ? [1] : []
    content {
      sid    = "StaticSiteObjectWrite"
      effect = "Allow"
      actions = [
        "s3:DeleteObject",
        "s3:GetObject",
        "s3:PutObject"
      ]
      resources = [
        "arn:aws:s3:::${var.static_site_bucket_name}/*"
      ]
    }
  }

  dynamic "statement" {
    for_each = var.static_cloudfront_distribution_id != null && trimspace(var.static_cloudfront_distribution_id) != "" ? [1] : []
    content {
      sid    = "StaticSiteCloudFrontInvalidation"
      effect = "Allow"
      actions = [
        "cloudfront:CreateInvalidation"
      ]
      resources = [
        "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${var.static_cloudfront_distribution_id}"
      ]
    }
  }
}

resource "aws_iam_role_policy" "deploy_permissions" {
  count = var.enabled ? 1 : 0

  name   = "${local.role_name}-policy"
  role   = aws_iam_role.github_actions_deploy[0].id
  policy = data.aws_iam_policy_document.deploy_permissions[0].json
}
