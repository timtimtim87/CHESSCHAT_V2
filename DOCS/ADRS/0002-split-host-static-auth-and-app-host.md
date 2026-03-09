# ADR 0002: Split Host Architecture (Apex Static Auth + App Gameplay Host)

## Status
Accepted (2026-03-09)

## Context
CHESSCHAT needs a clear architecture story for portfolio interviews while keeping implementation practical. The prior single-host runtime mixed auth UX and gameplay runtime behind the same app ingress.

## Decision
Adopt split-host architecture:
- `chess-chat.com`: static auth/landing frontend on CloudFront + private S3 (OAC).
- `app.chess-chat.com`: ECS/ALB gameplay runtime.

## Consequences
Positive:
- Clear separation of concerns for edge caching and runtime behavior.
- Strong AWS architecture narrative (CloudFront static edge + ALB app runtime).
- Independent delivery/deploy surface for auth UI.

Negative:
- Added Terraform/module complexity.
- Cross-subdomain session handoff is required.

## Alternatives Considered
1. Keep single app host for auth + gameplay.
- Rejected: weaker architecture separation and less explicit edge strategy.

2. Host auth directly from backend routes only.
- Rejected: does not showcase static edge split and cache control strategy.
