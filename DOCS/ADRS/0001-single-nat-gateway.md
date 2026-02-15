# ADR 0001: Single NAT Gateway In Portfolio Phase

## Status
Accepted (2026-02-15)

## Context
CHESSCHAT is being built as an AWS Solutions Architect portfolio project with production-style patterns, but with explicit cost awareness.

The target architecture is single region (`us-east-1`) with multi-AZ subnets (3 AZs), private app/data tiers, and resilient service design where practical.

NAT gateway strategy presents a direct tradeoff:
- `single`: lower monthly cost, but introduces single-AZ egress dependency.
- `per_az`: better AZ-level egress resilience, but materially higher cost.

For portfolio phase usage (low steady traffic, interview/demo bursts), budget discipline is a primary constraint.

## Decision
Use `nat_gateway_mode = "single"` as the default for the portfolio phase.

Implementation details:
- Keep multi-AZ subnet layout in place.
- Route private-app and private-data subnet outbound internet traffic through one NAT gateway.
- Preserve Terraform support for future change to `nat_gateway_mode = "per_az"` without redesigning the network module.

## Consequences
Positive:
- Reduces baseline infrastructure cost while preserving a strong multi-AZ architecture story.
- Keeps implementation simple and fast for iterative portfolio delivery.
- Retains a clear upgrade path to per-AZ NAT when resilience requirements increase.

Negative:
- Creates a single-AZ dependency for outbound internet egress from private subnets.
- During NAT AZ impairment, private subnet egress can be degraded or unavailable until recovery.

## Alternatives Considered
1. Per-AZ NAT gateways from day one
- Pros: better AZ fault tolerance for egress path.
- Cons: higher recurring cost during early portfolio stages.

2. NAT instances
- Pros: lower direct cost in some patterns.
- Cons: higher operational overhead, less aligned with managed-service portfolio narrative.

## Rationale For Interviews
"For the portfolio phase, I chose a single NAT gateway to control recurring cost while still implementing a multi-AZ VPC with private tiers. I explicitly kept the Terraform interface (`nat_gateway_mode`) so the design can be switched to per-AZ NAT when business criticality or uptime requirements justify the spend."
