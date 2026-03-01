# MONITORING module

This module owns CHESSCHAT baseline observability resources.

## Purpose
Create:
- SNS alert topic + email subscriptions
- CloudWatch alarms for ECS, ALB, Redis, and DynamoDB
  - Includes `UnHealthyHostCount` and `HealthyHostCount < 1` coverage for target availability
- CloudWatch dashboard for app operations
- AWS Budgets monthly cost alerting

## Inputs
- `project` (string): project identifier used for naming/tagging.
- `environment` (string): deployment environment.
- `aws_region` (string): region for dashboard widgets.
- `enabled` (bool): toggle for monitoring resources.
- `tags` (map(string)): common resource tags.
- workload metadata (ECS service/cluster, ALB suffixes, Redis replication group, DynamoDB table names)
- alert configuration (emails, alarm thresholds, evaluation periods)
- budget configuration (`monthly_budget_limit_usd`, `budget_alert_thresholds`)

## Outputs
- `monitoring_module_status`
- `sns_topic_arn`
- `dashboard_name`
- `alarm_names`
- `alarm_arns`
- `budget_name`
