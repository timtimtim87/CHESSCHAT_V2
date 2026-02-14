output "modules_active" {
  value       = [
    module.vpc.vpc_module_status,
    module.ecs.ecs_module_status,
    module.alb.alb_module_status,
    module.elasticache.elasticache_module_status,
    module.dynamodb.dynamodb_module_status,
    module.cognito.cognito_module_status,
    module.route53.route53_module_status,
    module.monitoring.monitoring_module_status,
  ]
  description = "Keeps a simple list of module placeholders to verify the configuration links all modules."
}
