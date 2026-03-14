data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

locals {
  module_name                 = "ecs"
  task_execution_role_name    = "${var.project}-${var.environment}-ecs-task-execution-role"
  task_role_name              = "${var.project}-${var.environment}-ecs-task-role"
  logs_group_arn_prefix       = "arn:aws:logs:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/ecs/${var.project}-${var.environment}*"
  ecr_pull_resources          = length(var.ecr_repository_arns) > 0 ? var.ecr_repository_arns : ["*"]
  dynamodb_index_arns         = [for arn in var.dynamodb_table_arns : "${arn}/index/*"]
  dynamodb_all_resource_arns  = concat(var.dynamodb_table_arns, local.dynamodb_index_arns)
  redis_auth_secret_arn       = "arn:aws:secretsmanager:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:secret:${var.project}/${var.environment}/redis/auth-token*"
  redis_replication_group_arn = "arn:aws:elasticache:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:replicationgroup:${var.project}-${var.environment}"
}

resource "aws_iam_role" "task_execution" {
  name = local.task_execution_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = merge(var.tags, {
    Name = local.task_execution_role_name
  })
}

resource "aws_iam_role_policy" "task_execution" {
  name = "${local.task_execution_role_name}-policy"
  role = aws_iam_role.task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EcrAuthToken"
        Effect = "Allow"
        Action = ["ecr:GetAuthorizationToken"]
        Resource = [
          "*"
        ]
      },
      {
        Sid    = "EcrImagePull"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer"
        ]
        Resource = local.ecr_pull_resources
      },
      {
        Sid    = "CloudWatchLogsWrite"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [local.logs_group_arn_prefix]
      },
      {
        Sid    = "ReadRuntimeSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue"
        ]
        Resource = [local.redis_auth_secret_arn]
      }
    ]
  })
}

resource "aws_iam_role" "task" {
  name = local.task_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = merge(var.tags, {
    Name = local.task_role_name
  })
}

resource "aws_iam_role_policy" "task" {
  name = "${local.task_role_name}-policy"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDbGameAndUserDataAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:BatchGetItem",
          "dynamodb:ConditionCheckItem",
          "dynamodb:DeleteItem",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:TransactWriteItems",
          "dynamodb:UpdateItem"
        ]
        Resource = local.dynamodb_all_resource_arns
      },
      {
        Sid    = "ReadRedisSecret"
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue"
        ]
        Resource = [local.redis_auth_secret_arn]
      },
      {
        Sid    = "DescribeRedisReplicationGroup"
        Effect = "Allow"
        Action = [
          "elasticache:DescribeReplicationGroups"
        ]
        Resource = [local.redis_replication_group_arn]
      },
      {
        Sid    = "CreateChimeMeetings"
        Effect = "Allow"
        Action = [
          "chime:CreateAttendee",
          "chime:CreateMeeting",
          "chime:DeleteMeeting",
          "chime:GetAttendee",
          "chime:GetMeeting"
        ]
        Resource = [
          "*"
        ]
      },
      {
        Sid    = "PublishApplicationMetrics"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = [
          "*"
        ]
        Condition = {
          StringEquals = {
            "cloudwatch:namespace" = "${title(var.project)}/${title(var.environment)}"
          }
        }
      },
      {
        Sid    = "CognitoAdminDeleteUser"
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminDeleteUser"
        ]
        Resource = var.cognito_user_pool_arn != null ? [var.cognito_user_pool_arn] : []
      }
    ]
  })
}
