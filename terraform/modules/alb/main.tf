locals {
  module_name       = "alb"
  name_prefix       = "${var.project}-${var.environment}"
  alb_name          = "${local.name_prefix}-alb"
  alb_sg_name       = "${local.name_prefix}-alb-sg"
  target_group_name = substr("${local.name_prefix}-app-tg", 0, 32)
  canonical_host    = var.canonical_host
  redirect_hosts    = local.canonical_host == null ? [] : [for host in var.redirect_hosts : host if host != local.canonical_host]
  certificate_ready = var.enabled && var.route53_zone_id != null && length(var.certificate_domains) > 0
  certificate_validation = local.certificate_ready ? {
    for dvo in aws_acm_certificate.app[0].domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  } : {}
}

resource "aws_security_group" "alb" {
  count = var.enabled ? 1 : 0

  name        = local.alb_sg_name
  description = "Internet-facing ALB security group for CHESSCHAT."
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = local.alb_sg_name
  })
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  count = var.enabled ? 1 : 0

  security_group_id = aws_security_group.alb[0].id
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
  description       = "Allow HTTP ingress for redirect to HTTPS."
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  count = var.enabled ? 1 : 0

  security_group_id = aws_security_group.alb[0].id
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
  description       = "Allow HTTPS ingress from the internet."
}

resource "aws_vpc_security_group_egress_rule" "alb_all" {
  count = var.enabled ? 1 : 0

  security_group_id = aws_security_group.alb[0].id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
  description       = "Allow ALB egress to registered targets."
}

resource "aws_lb" "this" {
  count = var.enabled ? 1 : 0

  name               = local.alb_name
  load_balancer_type = "application"
  internal           = false
  subnets            = var.public_subnet_ids
  security_groups    = [aws_security_group.alb[0].id]

  tags = merge(var.tags, {
    Name = local.alb_name
  })
}

resource "aws_lb_target_group" "app" {
  count = var.enabled ? 1 : 0

  name        = local.target_group_name
  port        = var.target_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = var.health_check_path
    matcher             = "200-399"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }

  tags = merge(var.tags, {
    Name = local.target_group_name
  })
}

resource "aws_lb_listener" "http" {
  count = var.enabled ? 1 : 0

  load_balancer_arn = aws_lb.this[0].arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_acm_certificate" "app" {
  count = var.enabled && length(var.certificate_domains) > 0 ? 1 : 0

  domain_name               = var.certificate_domains[0]
  subject_alternative_names = slice(var.certificate_domains, 1, length(var.certificate_domains))
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-app-cert"
  })
}

resource "aws_route53_record" "cert_validation" {
  for_each = local.certificate_validation

  allow_overwrite = true
  zone_id         = var.route53_zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.value]
  ttl             = 60
}

resource "aws_acm_certificate_validation" "app" {
  count = local.certificate_ready ? 1 : 0

  certificate_arn         = aws_acm_certificate.app[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

resource "aws_lb_listener" "https" {
  count = local.certificate_ready ? 1 : 0

  load_balancer_arn = aws_lb.this[0].arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate_validation.app[0].certificate_arn
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }
}

resource "aws_lb_listener_rule" "redirect_to_canonical" {
  for_each = local.certificate_ready ? toset(local.redirect_hosts) : toset([])

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 100 + index(sort(local.redirect_hosts), each.key)

  action {
    type = "redirect"

    redirect {
      host        = local.canonical_host
      path        = "/#{path}"
      query       = "#{query}"
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  condition {
    host_header {
      values = [each.key]
    }
  }
}

resource "aws_lb_listener_rule" "forward_canonical" {
  count = local.certificate_ready && local.canonical_host != null ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app[0].arn
  }

  condition {
    host_header {
      values = [local.canonical_host]
    }
  }
}
