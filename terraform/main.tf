# Root configuration that stitches together the reusable modules.
locals {
  common_tags = merge({
    Project     = var.project
    Environment = var.environment
  }, var.tags)
}

module "vpc" {
  source  = "./modules/vpc"
  project = var.project
  tags    = local.common_tags
}

module "ecs" {
  source  = "./modules/ecs"
  project = var.project
  tags    = local.common_tags
}

module "alb" {
  source  = "./modules/alb"
  project = var.project
  tags    = local.common_tags
}

module "elasticache" {
  source  = "./modules/elasticache"
  project = var.project
  tags    = local.common_tags
}

module "dynamodb" {
  source  = "./modules/dynamodb"
  project = var.project
  tags    = local.common_tags
}

module "cognito" {
  source  = "./modules/cognito"
  project = var.project
  tags    = local.common_tags
}

module "route53" {
  source  = "./modules/route53"
  project = var.project
  tags    = local.common_tags
}

module "monitoring" {
  source  = "./modules/monitoring"
  project = var.project
  tags    = local.common_tags
}
