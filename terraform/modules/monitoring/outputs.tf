output "monitoring_module_status" {
  value       = "monitoring module active"
  description = "Indicates that the monitoring module has concrete resources configured."
}

output "sns_topic_arn" {
  value       = try(aws_sns_topic.alerts[0].arn, null)
  description = "SNS topic ARN used by monitoring alarms and budget notifications."
}

output "dashboard_name" {
  value       = try(aws_cloudwatch_dashboard.operations[0].dashboard_name, null)
  description = "CloudWatch dashboard name for operations visibility."
}

output "alarm_names" {
  value = compact([
    try(aws_cloudwatch_metric_alarm.ecs_cpu_high[0].alarm_name, null),
    try(aws_cloudwatch_metric_alarm.ecs_memory_high[0].alarm_name, null),
    try(aws_cloudwatch_metric_alarm.alb_5xx_high[0].alarm_name, null),
    try(aws_cloudwatch_metric_alarm.alb_unhealthy_targets[0].alarm_name, null),
    try(aws_cloudwatch_metric_alarm.alb_healthy_hosts_low[0].alarm_name, null),
    try(aws_cloudwatch_metric_alarm.redis_engine_cpu_high[0].alarm_name, null),
    try(aws_cloudwatch_metric_alarm.dynamodb_users_throttles[0].alarm_name, null),
    try(aws_cloudwatch_metric_alarm.dynamodb_games_throttles[0].alarm_name, null)
  ])
  description = "List of CloudWatch alarm names created by this module."
}

output "alarm_arns" {
  value = compact([
    try(aws_cloudwatch_metric_alarm.ecs_cpu_high[0].arn, null),
    try(aws_cloudwatch_metric_alarm.ecs_memory_high[0].arn, null),
    try(aws_cloudwatch_metric_alarm.alb_5xx_high[0].arn, null),
    try(aws_cloudwatch_metric_alarm.alb_unhealthy_targets[0].arn, null),
    try(aws_cloudwatch_metric_alarm.alb_healthy_hosts_low[0].arn, null),
    try(aws_cloudwatch_metric_alarm.redis_engine_cpu_high[0].arn, null),
    try(aws_cloudwatch_metric_alarm.dynamodb_users_throttles[0].arn, null),
    try(aws_cloudwatch_metric_alarm.dynamodb_games_throttles[0].arn, null)
  ])
  description = "List of CloudWatch alarm ARNs created by this module."
}

output "budget_name" {
  value       = try(aws_budgets_budget.monthly_cost[0].name, null)
  description = "Monthly AWS budget name."
}
