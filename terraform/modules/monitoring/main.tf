locals {
  module_name          = "monitoring"
  name_prefix          = "${var.project}-${var.environment}"
  alerts_topic         = "${local.name_prefix}-alerts"
  dashboard_name       = "${local.name_prefix}-operations-dashboard"
  app_metric_namespace = var.app_metric_namespace != null ? var.app_metric_namespace : "${title(var.project)}/${title(var.environment)}"

  alarm_actions = var.enabled ? [aws_sns_topic.alerts[0].arn] : []

  dashboard_widgets = concat(
    var.ecs_cluster_name != null && var.ecs_service_name != null ? [
      {
        "type"   = "metric"
        "x"      = 0
        "y"      = 0
        "width"  = 12
        "height" = 6
        "properties" = {
          "title"  = "ECS Service Utilization"
          "view"   = "timeSeries"
          "region" = var.aws_region
          "stat"   = "Average"
          "period" = var.alarm_period_seconds
          "metrics" = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.ecs_cluster_name, "ServiceName", var.ecs_service_name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
        }
      }
    ] : [],
    var.alb_arn_suffix != null && var.target_group_arn_suffix != null ? [
      {
        "type"   = "metric"
        "x"      = 12
        "y"      = 0
        "width"  = 12
        "height" = 6
        "properties" = {
          "title"  = "ALB Errors and Target Health"
          "view"   = "timeSeries"
          "region" = var.aws_region
          "stat"   = "Sum"
          "period" = var.alarm_period_seconds
          "metrics" = [
            ["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", var.alb_arn_suffix],
            [".", "UnHealthyHostCount", "LoadBalancer", var.alb_arn_suffix, "TargetGroup", var.target_group_arn_suffix]
          ]
        }
      }
    ] : [],
    var.redis_replication_group_id != null ? [
      {
        "type"   = "metric"
        "x"      = 0
        "y"      = 6
        "width"  = 12
        "height" = 6
        "properties" = {
          "title"  = "Redis Engine CPU Utilization"
          "view"   = "timeSeries"
          "region" = var.aws_region
          "stat"   = "Average"
          "period" = var.alarm_period_seconds
          "metrics" = [
            ["AWS/ElastiCache", "EngineCPUUtilization", "ReplicationGroupId", var.redis_replication_group_id]
          ]
        }
      }
    ] : [],
    var.dynamodb_users_table_name != null && var.dynamodb_games_table_name != null ? [
      {
        "type"   = "metric"
        "x"      = 12
        "y"      = 6
        "width"  = 12
        "height" = 6
        "properties" = {
          "title"  = "DynamoDB Throttled Requests"
          "view"   = "timeSeries"
          "region" = var.aws_region
          "stat"   = "Sum"
          "period" = var.alarm_period_seconds
          "metrics" = [
            ["AWS/DynamoDB", "ThrottledRequests", "TableName", var.dynamodb_users_table_name],
            [".", "ThrottledRequests", "TableName", var.dynamodb_games_table_name]
          ]
        }
      }
    ] : [],
    [
      {
        "type"   = "metric"
        "x"      = 0
        "y"      = 12
        "width"  = 24
        "height" = 6
        "properties" = {
          "title"  = "Application Health Counters"
          "view"   = "timeSeries"
          "region" = var.aws_region
          "stat"   = "Sum"
          "period" = var.alarm_period_seconds
          "metrics" = [
            [local.app_metric_namespace, "WsConnectionsOpened"],
            [".", "WsConnectionsClosed"],
            [".", "GamesStarted"],
            [".", "GamesEnded"],
            [".", "AppErrors"]
          ]
        }
      }
    ]
  )
}

data "aws_caller_identity" "current" {}

resource "aws_sns_topic" "alerts" {
  count = var.enabled ? 1 : 0

  name = local.alerts_topic

  tags = merge(var.tags, {
    Name = local.alerts_topic
  })
}

resource "aws_sns_topic_subscription" "email" {
  for_each = var.enabled ? toset(var.alarm_email_endpoints) : toset([])

  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  count = var.enabled && var.ecs_cluster_name != null && var.ecs_service_name != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-ecs-cpu-high"
  alarm_description   = "ECS CPU utilization is above threshold."
  namespace           = "AWS/ECS"
  metric_name         = "CPUUtilization"
  statistic           = "Average"
  period              = var.alarm_period_seconds
  evaluation_periods  = var.alarm_evaluation_periods
  datapoints_to_alarm = var.alarm_datapoints_to_alarm
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = var.ecs_cpu_utilization_threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  count = var.enabled && var.ecs_cluster_name != null && var.ecs_service_name != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-ecs-memory-high"
  alarm_description   = "ECS memory utilization is above threshold."
  namespace           = "AWS/ECS"
  metric_name         = "MemoryUtilization"
  statistic           = "Average"
  period              = var.alarm_period_seconds
  evaluation_periods  = var.alarm_evaluation_periods
  datapoints_to_alarm = var.alarm_datapoints_to_alarm
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = var.ecs_memory_utilization_threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_high" {
  count = var.enabled && var.alb_arn_suffix != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-alb-5xx-high"
  alarm_description   = "ALB generated 5xx responses above threshold."
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_ELB_5XX_Count"
  statistic           = "Sum"
  period              = var.alarm_period_seconds
  evaluation_periods  = var.alarm_evaluation_periods
  datapoints_to_alarm = var.alarm_datapoints_to_alarm
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = var.alb_5xx_count_threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_targets" {
  count = var.enabled && var.alb_arn_suffix != null && var.target_group_arn_suffix != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-alb-unhealthy-targets"
  alarm_description   = "ALB target group has unhealthy targets."
  namespace           = "AWS/ApplicationELB"
  metric_name         = "UnHealthyHostCount"
  statistic           = "Average"
  period              = var.alarm_period_seconds
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  treat_missing_data  = "breaching"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_arn_suffix
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "alb_healthy_hosts_low" {
  count = var.enabled && var.alb_arn_suffix != null && var.target_group_arn_suffix != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-alb-healthy-hosts-low"
  alarm_description   = "ALB target group healthy host count is below minimum."
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HealthyHostCount"
  statistic           = "Average"
  period              = var.alarm_period_seconds
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  comparison_operator = "LessThanThreshold"
  threshold           = var.alb_min_healthy_hosts_threshold
  treat_missing_data  = "breaching"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_arn_suffix
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_engine_cpu_high" {
  count = var.enabled && var.redis_replication_group_id != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-redis-engine-cpu-high"
  alarm_description   = "Redis engine CPU utilization is above threshold."
  namespace           = "AWS/ElastiCache"
  metric_name         = "EngineCPUUtilization"
  statistic           = "Average"
  period              = var.alarm_period_seconds
  evaluation_periods  = var.alarm_evaluation_periods
  datapoints_to_alarm = var.alarm_datapoints_to_alarm
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = var.redis_engine_cpu_threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions

  dimensions = {
    ReplicationGroupId = var.redis_replication_group_id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_users_throttles" {
  count = var.enabled && var.dynamodb_users_table_name != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-ddb-users-throttles"
  alarm_description   = "DynamoDB users table has throttled requests."
  namespace           = "AWS/DynamoDB"
  metric_name         = "ThrottledRequests"
  statistic           = "Sum"
  period              = var.alarm_period_seconds
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions

  dimensions = {
    TableName = var.dynamodb_users_table_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_games_throttles" {
  count = var.enabled && var.dynamodb_games_table_name != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-ddb-games-throttles"
  alarm_description   = "DynamoDB games table has throttled requests."
  namespace           = "AWS/DynamoDB"
  metric_name         = "ThrottledRequests"
  statistic           = "Sum"
  period              = var.alarm_period_seconds
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions

  dimensions = {
    TableName = var.dynamodb_games_table_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_dashboard" "operations" {
  count = var.enabled ? 1 : 0

  dashboard_name = local.dashboard_name
  dashboard_body = jsonencode({
    widgets = local.dashboard_widgets
  })
}

resource "aws_budgets_budget" "monthly_cost" {
  count = var.enabled ? 1 : 0

  account_id   = data.aws_caller_identity.current.account_id
  name         = "${local.name_prefix}-monthly-cost"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_limit_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  dynamic "notification" {
    for_each = toset(var.budget_alert_thresholds)

    content {
      comparison_operator       = "GREATER_THAN"
      threshold                 = notification.value
      threshold_type            = "PERCENTAGE"
      notification_type         = "ACTUAL"
      subscriber_sns_topic_arns = local.alarm_actions
    }
  }
}
