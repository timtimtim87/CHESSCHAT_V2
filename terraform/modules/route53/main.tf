locals {
  module_name       = "route53"
  create_zone       = var.enabled && var.create_hosted_zone && var.root_domain_name != null
  lookup_zone       = var.enabled && !var.create_hosted_zone && var.route53_zone_id == null && var.root_domain_name != null
  effective_zone_id = var.enabled ? coalesce(var.route53_zone_id, try(aws_route53_zone.this[0].zone_id, null), try(data.aws_route53_zone.existing[0].zone_id, null)) : null
  alias_records     = toset([for record in var.alias_records : trimspace(record)])
  create_app_alias  = var.enabled && var.enable_app_alias && length(local.alias_records) > 0
}

resource "aws_route53_zone" "this" {
  count = local.create_zone ? 1 : 0

  name = var.root_domain_name

  tags = merge(var.tags, {
    Name = "${var.project}-${var.environment}-public-zone"
  })
}

data "aws_route53_zone" "existing" {
  count = local.lookup_zone ? 1 : 0

  name         = "${var.root_domain_name}."
  private_zone = false
}

resource "aws_route53_record" "app_alias" {
  for_each = local.create_app_alias ? local.alias_records : toset([])

  allow_overwrite = true
  zone_id         = local.effective_zone_id
  name            = each.value
  type            = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = var.evaluate_target_health
  }
}
