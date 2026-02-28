# CHESSCHAT Portfolio Build Playbook

Purpose: keep one practical, interview-ready plan for building CHESSCHAT as an AWS Solutions Architect portfolio project.

## 1) Project North Star
- Product: real-time video chat app with chess gameplay.
- Goal: demonstrate strong AWS/Terraform/cloud systems design, not overengineer.
- Standard: production-style architecture decisions with clear cost/risk tradeoffs.
- Priority order:
  1. Reliability and clear architecture story
  2. Security and operational visibility
  3. Cost awareness
  4. Feature completeness

## 2) Architecture Targets (Middle Ground)
- Availability target: 99.9% monthly service availability.
- Region strategy: single region (`us-east-1`) with multi-AZ design.
- Recovery targets:
  - RTO: 2 hours
  - RPO: 15 minutes for persistent game/session data
- Security posture:
  - Least-privilege IAM roles
  - Secrets in Secrets Manager
  - TLS for all public ingress
  - Encryption at rest on data stores
  - Private subnets for app/data planes
- Cost target (portfolio mode): roughly `$150-$350/month` while active.
- Scaling assumptions:
  - Baseline: low steady traffic with bursts during demos/interviews
  - Concurrent active users: 50-300 (initial portfolio range)
  - Stateless app tier scales horizontally via ECS/Fargate

## 3) Network/NAT Decision
- Keep 3 AZ subnet layout (strong architecture signal).
- Use **1 NAT Gateway** initially to reduce cost.
- Design Terraform variables so NAT strategy can be changed later:
  - `nat_gateway_mode = "single" | "per_az"`
- Interview talking point:
  - "Single NAT in portfolio phase balances cost and resilience. In production-critical workloads, switch to per-AZ NAT to avoid single-AZ egress dependency."

## 4) Deployment Model Recommendation
- Recommendation for this repository: **single root with staged toggles** first.
- Why:
  - Faster progress for one-person project
  - Easier for learning Terraform graph/dependencies
  - Lower operational overhead while modules are still being built
- How:
  - Keep current root module wiring.
  - Add module enable flags (for staged rollout), e.g.:
    - `enable_network`, `enable_data`, `enable_identity`, `enable_edge`, `enable_compute`, `enable_observability`
- Future evolution:
  - If project grows, split into layered stacks with remote-state data sharing.

## 5) Build Roadmap (Execution Order)
- Phase A: Network foundation
  - VPC, subnets (3 public / 3 private app / 3 private data), IGW, route tables
  - NAT mode variable (start single NAT)
  - VPC endpoints (S3, DynamoDB gateway; ECR/Logs/Secrets interface)
  - Flow logs
- Phase B: Data layer
  - DynamoDB tables + GSIs + PITR + TTL where needed
  - ElastiCache Redis in private data subnets
  - Secrets Manager integration for Redis auth
- Phase C: Identity and edge
  - Cognito user pool/client/domain
  - Route53 + ACM + ALB with HTTPS and HTTP->HTTPS redirect
- Phase D: Compute
  - ECR repos
  - ECS cluster, task definitions, services, autoscaling policies
  - App services connected to ALB target groups
- Phase E: Observability and operations
  - CloudWatch dashboards/alarms/log retention
  - SNS notifications
  - Budgets/cost alerts
- Phase F: App validation then full chess functionality
  - Deploy thin signaling + frontend first
  - Validate end-to-end infra
  - Add chess logic after infra is stable
- Phase G: Hardening
  - WAF, stricter IAM, backup/recovery validation, runbooks, architecture docs

## 5.1) Implementation Snapshot (2026-02-15)
- Completed:
  - Terraform backend bootstrap (S3 remote state + lockfile mode)
  - Phase A baseline applied in AWS:
    - VPC + 3 public / 3 private-app / 3 private-data subnets
    - IGW + route tables + route associations
    - NAT gateway mode implemented (`single` active in dev)
    - VPC endpoints (S3, DynamoDB, ECR API/DKR, Logs, Secrets Manager)
    - VPC Flow Logs to CloudWatch Logs
- Completed in Terraform code (2026-02-28, not applied yet):
  - Phase B1 DynamoDB module implementation:
    - Users table with `username-index`
    - Games table with `white-player-index` and `black-player-index`
    - PITR + deletion protection + SSE defaults
  - Phase B2 ElastiCache module implementation:
    - Redis replication group (default 1 primary + 1 replica)
    - Multi-AZ/failover-ready settings
    - Private data subnet group + dedicated Redis security group
    - Redis auth token generated and stored in Secrets Manager
    - Parameter group baseline (`allkeys-lru`, `timeout=300`)
- Completed in AWS (2026-02-28):
  - DynamoDB tables provisioned in `dev`:
    - `chesschat-dev-users`
    - `chesschat-dev-games`
  - ElastiCache Redis provisioned in `dev`:
    - Replication group `chesschat-dev` (`1 primary + 1 replica`)
    - Primary endpoint `master.chesschat-dev.zu5wgj.use1.cache.amazonaws.com`
    - Reader endpoint `replica.chesschat-dev.zu5wgj.use1.cache.amazonaws.com`
    - Auth token secret `chesschat/dev/redis/auth-token`
- Completed in AWS (2026-02-28, Phase 4):
  - Cognito user pool and app client provisioned:
    - User pool `us-east-1_AWq14lBGV` (`chesschat-dev-user-pool`)
    - App client `5numi4223d3jnebrlfqboseu42`
    - Hosted UI domain `chesschat-dev-6c96bb.auth.us-east-1.amazoncognito.com`
  - ECS IAM roles provisioned for Phase 5 task definitions:
    - Task execution role `arn:aws:iam::723580627470:role/chesschat-dev-ecs-task-execution-role`
    - Task role `arn:aws:iam::723580627470:role/chesschat-dev-ecs-task-role`
- Completed in Terraform code (2026-02-28, not applied yet):
  - Phase 5 compute skeleton:
    - Split ECS into `ecs` (identity) and `ecs_compute` (runtime) to prevent Redis SG dependency cycles
    - ECR repository, ECS cluster, ECS task definition, ECS service, and ECS task SG
    - Optional ECS<->ALB integration wiring without circular dependencies
    - Redis SG allow-list auto-wired to ECS service SG output
  - Phase 6 edge module implementation:
    - ALB security group, ALB, target group, HTTP listener (redirect)
    - ACM certificate request + DNS validation records + certificate validation
    - HTTPS listener creation gated on ACM DNS validation inputs
  - Phase 7 DNS prep:
    - Route53 module supports existing zone ID, zone lookup, or new hosted zone creation
    - App alias record wiring to ALB outputs
    - Root-level Cognito callback/logout URL derivation from app domain (toggle-controlled)
- Next immediate move:
  - Apply sequence (when ready):
    - Push bootstrap image to ECR (`bootstrap` tag) before ECS service apply
    - Apply compute and validate ECS tasks reach steady state
    - Enable/apply edge (`enable_edge=true`) once domain + zone are set
    - Enable/apply DNS + Cognito domain callbacks (`enable_dns=true`, `use_app_domain_for_cognito_urls=true`)

## 6) GitHub Actions Learning Guide
Goal: implement CI/CD in small, understandable steps.

### Step 1: Terraform CI (validate + plan)
- Trigger on PRs touching `terraform/**`.
- Jobs:
  - `terraform fmt -check -recursive`
  - `terraform init -backend=false`
  - `terraform validate`
  - optional: `terraform plan` for changed stacks/modules
- Auth:
  - Use GitHub OIDC + AWS role assumption (no long-lived AWS keys).

### Step 2: Container CI (build + scan)
- Trigger on app code changes.
- Jobs:
  - Build Docker image
  - Run unit tests
  - Run image vulnerability scan
  - Push to ECR on main branch only

### Step 3: Deploy workflow
- Manual workflow dispatch initially.
- Inputs: image tag/environment.
- Actions:
  - Update ECS task definition image
  - Roll ECS service deployment
  - Wait for steady state

### Step 4: Quality gates
- Require PR checks before merge:
  - Terraform lint/validate
  - Tests pass
  - Security scan threshold enforced

## 7) Portfolio Deliverables (for interviews)
- High-level architecture diagram with trust boundaries.
- 1-page ADRs for key tradeoffs:
  - Single NAT first, per-AZ later
  - ECS/Fargate over EKS
  - DynamoDB + Redis roles
- Runbook snippets:
  - deploy rollback
  - alarm triage
  - degraded dependency handling
- Cost summary and optimization choices.
- Diagram tooling decision (2026-02-15):
  - Use SaaS-native diagramming (for example, Miro/Brainboard) for polished presentation quality.
  - Keep repo free of code-first diagram generators and generated diagram artifacts.

## 8) How Tim Likes to Work (Collaboration Notes)
- Explain recommendations and tradeoffs clearly.
- Keep scope practical; avoid overengineering.
- Teach while implementing (learning-first collaboration).
- Prefer step-by-step guidance with concrete commands and rationale.
- Make architecture decisions explicit so Tim can explain them in interviews.

## 9) Session Start Checklist for AI Agent
At the beginning of each session:
1. Read this file: `DOCS/PORTFOLIO_BUILD_PLAYBOOK.md`
2. Read current infra status: `infra/RESOURCE_REGISTRY.md`
3. Read current Terraform baseline: `terraform/backend.tf`, `terraform/main.tf`, `terraform/README.md`
4. Propose next smallest high-impact step and explain why.
5. Include learning notes for Tim while making changes.
