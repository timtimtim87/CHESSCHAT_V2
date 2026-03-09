# CHESSCHAT_V2 Resource Registry

Purpose: single source of truth for human-readable names, IDs, and ARNs as infrastructure is provisioned.

## Project Context
- Project: `chesschat`
- AWS account name: `CHESSCHAT_V2`
- AWS account ID: `723580627470`
- AWS region: `us-east-1`
- Standard tag: `Project=chesschat`
- AWS CLI default IAM user ARN: `arn:aws:iam::723580627470:user/CHESSCHAT_IAM_USER`
- AWS CLI named profile retained: `CHESSCHAT_IAM_USER` (mirrors `default`)

## Status
- Last updated: 2026-03-09
- Provisioning state: bootstrap backend configured; Phase A network, Phase B data, Phase 4 identity/IAM, Phase 5 compute, Phase 6/7 edge + DNS, Phase E observability/operations, Phase F app MVP deployment validation, and Phase 10 GitHub OIDC deploy IAM baseline applied in `us-east-1`. Phase 10 validation closure completed with first green `e2e-post-deploy` and `deploy-main` runs on 2026-03-02.
- Terraform code status:
  - `ecs` module now serves as ECS identity-only IAM foundation.
  - New `ecs_compute` module implemented (ECR, ECS cluster/task/service, ECS service SG).
  - `alb` module implemented (ACM + ALB + listener + target group + DNS validation wiring).
  - `route53` module implemented (zone lookup/create options + app alias record).
  - `monitoring` module implemented (SNS alert topic, CloudWatch alarms/dashboard, AWS budget alerts).
  - Redis SG allow-list now auto-wires ECS service SG output when compute is enabled.
  - Count-expression dependency fix applied for deterministic planning:
    - `ecs_compute`: ALB ingress and service load balancer gating now uses known booleans.
    - `route53`: alias creation now uses explicit `enable_app_alias` boolean input.
  - App runtime rollout updates:
    - ECS task definition now injects app runtime env vars + Redis auth secret.
    - Redis secret injection fixed to JSON key extraction (`auth_token`) for ECS container runtime.
    - Running app revision validated on ECS task definition `chesschat-dev-task:3` (`v0.1.0` image).
  - CI/CD deployment baseline updates:
    - Added `github_actions_oidc` module (IAM OIDC provider + least-privilege deploy role).
    - ECS service drift guard added (`ignore_changes = [task_definition]`) so CI-driven task definition revisions persist.
    - Terraform apply succeeded with `3 added, 0 changed, 0 destroyed`.
  - Milestones 5-8 implementation updates (2026-03-02, no new AWS resource IDs):
    - Added API/WS contract source-of-truth doc: `DOCS/API_WS_CONTRACT.md`.
    - Added PR quality workflows:
      - `.github/workflows/pr-backend-quality.yml`
      - `.github/workflows/pr-frontend-quality.yml`
      - `.github/workflows/pr-terraform-quality.yml`
    - Added app-level observability plumbing:
      - HTTP correlation IDs (`x-correlation-id`) and request logs.
      - WS session-level logging (`sessionId`, `connectionId`).
      - Custom app metrics emission (`WsConnectionsOpened`, `WsConnectionsClosed`, `GamesStarted`, `GamesEnded`, `AppErrors`).
    - Monitoring dashboard module now includes app-level metric widget using namespace `Chesschat/Dev`.
    - Runtime env update in Terraform desired state:
      - `APP_METRICS_NAMESPACE = "Chesschat/Dev"` in `terraform/environments/dev/terraform.tfvars`.
  - Milestones 7-8 apply/verification closure (2026-03-02):
    - Terraform apply completed:
      - `1 added, 1 changed, 1 destroyed`.
      - ECS task definition advanced to `chesschat-dev-task:9`.
      - CloudWatch dashboard `chesschat-dev-operations-dashboard` updated in-place with app-level widget.
    - Post-apply drift check:
      - `terraform plan` returned `No changes`.
    - Live runtime verification:
      - ECS service active task definition: `arn:aws:ecs:us-east-1:723580627470:task-definition/chesschat-dev-task:9`.
      - Correlation headers verified on public endpoints (`x-correlation-id` present).
      - CloudWatch app metrics emitted in namespace `Chesschat/Dev` (`WsConnectionsOpened`, `WsConnectionsClosed`, `GamesStarted`, `GamesEnded`).
    - Evidence bundle:
      - `/tmp/chesschat-evidence/m8-2026-03-02/`
  - CI governance closure (2026-03-02):
    - Intentional failing PR-check evidence captured:
      - PR `#1` (`codex/pr-check-failure-evidence-20260302` -> `main`) created as draft, failed checks captured, then closed/deleted.
      - Failing run: `PR Backend Quality` run `22566503921` (intentional assertion in backend unit test).
      - Evidence bundle captured locally at `/tmp/chesschat-evidence/m9-2026-03-02/`.
    - Branch protection automation applied and verified via GitHub API on `main`:
      - Required checks (`strict=true`): `backend-quality`, `frontend-quality`, `terraform-quality`.
      - `enforce_admins=true`, `required_conversation_resolution=true`.
      - `allow_force_pushes=false`, `allow_deletions=false`.
    - Required-check trigger alignment:
      - Updated PR workflow triggers to run on all pull requests (removed `pull_request.paths` filters) so required status checks are always produced for protected-branch merges.
- Workflow validation evidence update (2026-03-02):
    - `e2e-post-deploy` run `22556404347` failed at `Run live E2E`.
    - Root cause: `AccessDeniedException` for `cognito-idp:AdminCreateUser` on user pool `us-east-1_AWq14lBGV` when assumed role was `chesschat-dev-github-actions-deploy-role`.
    - Evidence bundle captured locally at `/tmp/chesschat-evidence/e2e-22556404347/`.
    - Secondary failure during remediation validation: `e2e-post-deploy` run `22556582827` failed with `WebSocket is not defined` in GitHub Actions Node 20 runtime.
    - Remediations applied:
      - Added Cognito admin permissions (`AdminCreateUser`, `AdminDeleteUser`, `AdminGetUser`, `AdminSetUserPassword`) to GitHub deploy role policy scoped to user pool ARN `arn:aws:cognito-idp:us-east-1:723580627470:userpool/us-east-1_AWq14lBGV`.
      - Updated E2E workflow runtime invocation to `node --experimental-websocket`.
    - First green validation runs after remediation:
      - `e2e-post-deploy` run `22556628729` (`success`)
      - `deploy-main` run `22556661125` (`success`)
    - Deploy evidence artifacts:
      - `/tmp/chesschat-evidence/e2e-22556628729/`
      - `/tmp/chesschat-evidence/deploy-22556661125/`
      - `/tmp/chesschat-evidence/ecs-service-2026-03-02-post-deploy.json`
  - Baseline drift alignment update (2026-03-02):
    - Accepted console budget preference update as source-of-truth intent:
      - Monthly budget target changed to `$100`.
    - Terraform desired state aligned:
      - `terraform/environments/dev/terraform.tfvars` now sets `monitoring_monthly_budget_limit_usd = 100`.
    - Budget notification model remains `SNS-only`:
      - Budget thresholds publish to SNS topic `chesschat-dev-alerts`.
      - Email routing is handled by SNS subscription `tim.antibes+CHESSCHAT_V2@gmail.com`.
    - Terraform execution evidence:
      - `terraform apply` completed with `0 added, 1 changed, 0 destroyed` (budget config normalization).
      - Follow-up `terraform plan` returned `No changes`.
  - Application reliability update (2026-03-02, no new AWS resources):
    - Added reconnect grace-period behavior in app runtime (`RECONNECT_GRACE_SECONDS=60` in ECS task env config).
    - No infrastructure resource IDs/ARNs changed.
  - Apex domain + auth alignment update (2026-03-09):
    - Applied Terraform DNS/certificate/callback/logout changes for apex + app dual-hostname support.
    - Terraform execution:
      - Initial apply partially succeeded, then failed on `app.chess-chat.com` alias create conflict.
      - Added `allow_overwrite = true` to Route53 alias resource and re-applied successfully.
      - Final drift check: `terraform plan` returned `No changes`.
    - Effective runtime/domain state:
      - `APP_DOMAIN` in ECS task definition now `https://chess-chat.com`.
      - ECS task definition revision advanced to `chesschat-dev-task:18`.
      - Cognito app client callback URLs: `https://chess-chat.com/auth/callback` and `https://app.chess-chat.com/auth/callback`.
      - Cognito logout URLs: `https://chess-chat.com/` and `https://app.chess-chat.com/`.
    - Edge/DNS state:
      - ACM certificate replaced with dual-domain cert for `chess-chat.com` + `app.chess-chat.com`.
      - Route53 aliases active for both apex and app hostnames in zone `Z03927582T9WNB6PUN708`.
  - Gameplay completion update (2026-03-02, no new AWS resources):
    - Added app-layer rematch protocol/events and enhanced chess UX (legal move highlights, move history, result modal, resign confirmation).
    - No infrastructure resource IDs/ARNs changed.

## Naming Convention
- Pattern: `chesschat-<env>-<service>-<purpose>`
- Examples:
  - `chesschat-dev-vpc-main`
  - `chesschat-dev-ddb-users`
  - `chesschat-dev-ecs-cluster`

## Resources

| Layer | Service | Logical Name | AWS Name/ID | ARN | Region | Managed By | Tags | Created On | Notes |
|---|---|---|---|---|---|---|---|---|---|
| bootstrap | s3 | terraform_state_bucket | `chesschat-tfstate-723580627470-us-east-1` | `arn:aws:s3:::chesschat-tfstate-723580627470-us-east-1` | us-east-1 | Terraform backend | Project=chesschat | 2026-02-14 | State object key prefix: `dev/terraform.tfstate` |
| bootstrap | dynamodb | terraform_lock_table | `chesschat-tfstate-locks` | `arn:aws:dynamodb:us-east-1:723580627470:table/chesschat-tfstate-locks` | us-east-1 | Bootstrap artifact | Project=chesschat | 2026-02-14 | Legacy lock table retained; backend now uses S3 `use_lockfile` |
| network | vpc | vpc_main | `vpc-0ea10867c34d63e73` | `arn:aws:ec2:us-east-1:723580627470:vpc/vpc-0ea10867c34d63e73` | us-east-1 | Terraform `module.vpc.aws_vpc.this` | Project=chesschat, Environment=dev | 2026-02-15 | Name tag `chesschat-dev-vpc-main`; created via `terraform apply -auto-approve -var-file=environments/dev/terraform.tfvars` |
| network | internet_gateway | vpc_igw | `igw-08c762aa9e0f534b1` | `arn:aws:ec2:us-east-1:723580627470:internet-gateway/igw-08c762aa9e0f534b1` | us-east-1 | Terraform `module.vpc.aws_internet_gateway.this` | Project=chesschat, Environment=dev | 2026-02-15 | Name tag `chesschat-dev-vpc-igw` |
| network | nat_gateway | nat_primary | `nat-0dee142da7453a5f9` | n/a | us-east-1 | Terraform `module.vpc.aws_nat_gateway.this[0]` | Project=chesschat, Environment=dev | 2026-02-15 | Name tag `chesschat-dev-vpc-nat-1`; `nat_gateway_mode=single` |
| network | elastic_ip | nat_eip_primary | `eipalloc-011ec005d67f13703` | `arn:aws:ec2:us-east-1:723580627470:elastic-ip/eipalloc-011ec005d67f13703` | us-east-1 | Terraform `module.vpc.aws_eip.nat[0]` | Project=chesschat, Environment=dev | 2026-02-15 | Name tag `chesschat-dev-vpc-nat-eip-1` |
| network | route_table | public_route_table | `rtb-0769e0346dce66198` | `arn:aws:ec2:us-east-1:723580627470:route-table/rtb-0769e0346dce66198` | us-east-1 | Terraform `module.vpc.aws_route_table.public` | Project=chesschat, Environment=dev | 2026-02-15 | Name tag `chesschat-dev-vpc-public-rt` |
| network | route_table | private_app_rt_1a | `rtb-05c2a8d8ef55f8e44` | `arn:aws:ec2:us-east-1:723580627470:route-table/rtb-05c2a8d8ef55f8e44` | us-east-1 | Terraform `module.vpc.aws_route_table.private_app["us-east-1a"]` | Project=chesschat, Environment=dev | 2026-02-15 | Name tag `chesschat-dev-vpc-us-east-1a-private-app-rt` |
| network | route_table | private_app_rt_1b | `rtb-0344e2f09e6880252` | `arn:aws:ec2:us-east-1:723580627470:route-table/rtb-0344e2f09e6880252` | us-east-1 | Terraform `module.vpc.aws_route_table.private_app["us-east-1b"]` | Project=chesschat, Environment=dev | 2026-02-15 | Name tag `chesschat-dev-vpc-us-east-1b-private-app-rt` |
| network | route_table | private_app_rt_1c | `rtb-0ee6b3f73ec07e73d` | `arn:aws:ec2:us-east-1:723580627470:route-table/rtb-0ee6b3f73ec07e73d` | us-east-1 | Terraform `module.vpc.aws_route_table.private_app["us-east-1c"]` | Project=chesschat, Environment=dev | 2026-02-15 | Name tag `chesschat-dev-vpc-us-east-1c-private-app-rt` |
| network | route_table | private_data_rt_1a | `rtb-0ca39cb2160302101` | `arn:aws:ec2:us-east-1:723580627470:route-table/rtb-0ca39cb2160302101` | us-east-1 | Terraform `module.vpc.aws_route_table.private_data["us-east-1a"]` | Project=chesschat, Environment=dev | 2026-02-15 | Name tag `chesschat-dev-vpc-us-east-1a-private-data-rt` |
| network | route_table | private_data_rt_1b | `rtb-091d2f66825ec5f4f` | `arn:aws:ec2:us-east-1:723580627470:route-table/rtb-091d2f66825ec5f4f` | us-east-1 | Terraform `module.vpc.aws_route_table.private_data["us-east-1b"]` | Project=chesschat, Environment=dev | 2026-02-15 | Name tag `chesschat-dev-vpc-us-east-1b-private-data-rt` |
| network | route_table | private_data_rt_1c | `rtb-01ba84fa231b06cc2` | `arn:aws:ec2:us-east-1:723580627470:route-table/rtb-01ba84fa231b06cc2` | us-east-1 | Terraform `module.vpc.aws_route_table.private_data["us-east-1c"]` | Project=chesschat, Environment=dev | 2026-02-15 | Name tag `chesschat-dev-vpc-us-east-1c-private-data-rt` |
| network | subnet | public_subnet_1a | `subnet-0102322ec1a5d4ce7` | `arn:aws:ec2:us-east-1:723580627470:subnet/subnet-0102322ec1a5d4ce7` | us-east-1 | Terraform `module.vpc.aws_subnet.public["us-east-1a"]` | Project=chesschat, Environment=dev | 2026-02-15 | CIDR `10.20.0.0/20` |
| network | subnet | public_subnet_1b | `subnet-0b55a203eaabdb3ba` | `arn:aws:ec2:us-east-1:723580627470:subnet/subnet-0b55a203eaabdb3ba` | us-east-1 | Terraform `module.vpc.aws_subnet.public["us-east-1b"]` | Project=chesschat, Environment=dev | 2026-02-15 | CIDR `10.20.16.0/20` |
| network | subnet | public_subnet_1c | `subnet-0327655af3b9ceb99` | `arn:aws:ec2:us-east-1:723580627470:subnet/subnet-0327655af3b9ceb99` | us-east-1 | Terraform `module.vpc.aws_subnet.public["us-east-1c"]` | Project=chesschat, Environment=dev | 2026-02-15 | CIDR `10.20.32.0/20` |
| network | subnet | private_app_subnet_1a | `subnet-092cf10010e8c7ba8` | `arn:aws:ec2:us-east-1:723580627470:subnet/subnet-092cf10010e8c7ba8` | us-east-1 | Terraform `module.vpc.aws_subnet.private_app["us-east-1a"]` | Project=chesschat, Environment=dev | 2026-02-15 | CIDR `10.20.48.0/20` |
| network | subnet | private_app_subnet_1b | `subnet-0b12a9df373102451` | `arn:aws:ec2:us-east-1:723580627470:subnet/subnet-0b12a9df373102451` | us-east-1 | Terraform `module.vpc.aws_subnet.private_app["us-east-1b"]` | Project=chesschat, Environment=dev | 2026-02-15 | CIDR `10.20.64.0/20` |
| network | subnet | private_app_subnet_1c | `subnet-0aa19769cf5d3d8a1` | `arn:aws:ec2:us-east-1:723580627470:subnet/subnet-0aa19769cf5d3d8a1` | us-east-1 | Terraform `module.vpc.aws_subnet.private_app["us-east-1c"]` | Project=chesschat, Environment=dev | 2026-02-15 | CIDR `10.20.80.0/20` |
| network | subnet | private_data_subnet_1a | `subnet-0164ae112b9b50d6d` | `arn:aws:ec2:us-east-1:723580627470:subnet/subnet-0164ae112b9b50d6d` | us-east-1 | Terraform `module.vpc.aws_subnet.private_data["us-east-1a"]` | Project=chesschat, Environment=dev | 2026-02-15 | CIDR `10.20.96.0/20` |
| network | subnet | private_data_subnet_1b | `subnet-040d7023361518399` | `arn:aws:ec2:us-east-1:723580627470:subnet/subnet-040d7023361518399` | us-east-1 | Terraform `module.vpc.aws_subnet.private_data["us-east-1b"]` | Project=chesschat, Environment=dev | 2026-02-15 | CIDR `10.20.112.0/20` |
| network | subnet | private_data_subnet_1c | `subnet-073e191f7e2029039` | `arn:aws:ec2:us-east-1:723580627470:subnet/subnet-073e191f7e2029039` | us-east-1 | Terraform `module.vpc.aws_subnet.private_data["us-east-1c"]` | Project=chesschat, Environment=dev | 2026-02-15 | CIDR `10.20.128.0/20` |
| network | security_group | interface_endpoints_sg | `sg-090cb25e038f3c8ce` | `arn:aws:ec2:us-east-1:723580627470:security-group/sg-090cb25e038f3c8ce` | us-east-1 | Terraform `module.vpc.aws_security_group.interface_endpoints[0]` | Project=chesschat, Environment=dev | 2026-02-15 | Name tag `chesschat-dev-vpc-endpoint-sg`; ingress TCP/443 from `10.20.0.0/16` |
| network | vpc_endpoint | s3_gateway_endpoint | `vpce-083e6eb89fff2117b` | `arn:aws:ec2:us-east-1:723580627470:vpc-endpoint/vpce-083e6eb89fff2117b` | us-east-1 | Terraform `module.vpc.aws_vpc_endpoint.s3[0]` | Project=chesschat, Environment=dev | 2026-02-15 | Service `com.amazonaws.us-east-1.s3` |
| network | vpc_endpoint | dynamodb_gateway_endpoint | `vpce-02779bd6e7a7e9be5` | `arn:aws:ec2:us-east-1:723580627470:vpc-endpoint/vpce-02779bd6e7a7e9be5` | us-east-1 | Terraform `module.vpc.aws_vpc_endpoint.dynamodb[0]` | Project=chesschat, Environment=dev | 2026-02-15 | Service `com.amazonaws.us-east-1.dynamodb` |
| network | vpc_endpoint | ecr_api_interface_endpoint | `vpce-0f33be281603357f6` | `arn:aws:ec2:us-east-1:723580627470:vpc-endpoint/vpce-0f33be281603357f6` | us-east-1 | Terraform `module.vpc.aws_vpc_endpoint.interface["ecr.api"]` | Project=chesschat, Environment=dev | 2026-02-15 | Service `com.amazonaws.us-east-1.ecr.api` |
| network | vpc_endpoint | ecr_dkr_interface_endpoint | `vpce-000b7ae5082191c41` | `arn:aws:ec2:us-east-1:723580627470:vpc-endpoint/vpce-000b7ae5082191c41` | us-east-1 | Terraform `module.vpc.aws_vpc_endpoint.interface["ecr.dkr"]` | Project=chesschat, Environment=dev | 2026-02-15 | Service `com.amazonaws.us-east-1.ecr.dkr` |
| network | vpc_endpoint | logs_interface_endpoint | `vpce-0c03bd6affeadc424` | `arn:aws:ec2:us-east-1:723580627470:vpc-endpoint/vpce-0c03bd6affeadc424` | us-east-1 | Terraform `module.vpc.aws_vpc_endpoint.interface["logs"]` | Project=chesschat, Environment=dev | 2026-02-15 | Service `com.amazonaws.us-east-1.logs` |
| network | vpc_endpoint | secretsmanager_interface_endpoint | `vpce-0541a547c67809804` | `arn:aws:ec2:us-east-1:723580627470:vpc-endpoint/vpce-0541a547c67809804` | us-east-1 | Terraform `module.vpc.aws_vpc_endpoint.interface["secretsmanager"]` | Project=chesschat, Environment=dev | 2026-02-15 | Service `com.amazonaws.us-east-1.secretsmanager` |
| observability | cloudwatch_logs | vpc_flow_log_group | `/aws/vpc/chesschat-dev-vpc/flow-logs` | `arn:aws:logs:us-east-1:723580627470:log-group:/aws/vpc/chesschat-dev-vpc/flow-logs` | us-east-1 | Terraform `module.vpc.aws_cloudwatch_log_group.vpc_flow_logs[0]` | Project=chesschat, Environment=dev | 2026-02-15 | 30-day retention |
| observability | ec2_flow_logs | vpc_flow_log | `fl-05f30eba368dcc3fd` | `arn:aws:ec2:us-east-1:723580627470:vpc-flow-log/fl-05f30eba368dcc3fd` | us-east-1 | Terraform `module.vpc.aws_flow_log.vpc[0]` | Project=chesschat, Environment=dev | 2026-02-15 | Traffic type `ALL`; destination CloudWatch Logs |
| security | iam_role | flow_logs_delivery_role | `chesschat-dev-vpc-flow-logs-role` | `arn:aws:iam::723580627470:role/chesschat-dev-vpc-flow-logs-role` | us-east-1 | Terraform `module.vpc.aws_iam_role.flow_logs[0]` | Project=chesschat, Environment=dev | 2026-02-15 | Trust principal `vpc-flow-logs.amazonaws.com` |
| data | dynamodb | users_table | `chesschat-dev-users` | `arn:aws:dynamodb:us-east-1:723580627470:table/chesschat-dev-users` | us-east-1 | Terraform `module.dynamodb.aws_dynamodb_table.users` | Project=chesschat, Environment=dev | 2026-02-28 | PK `user_id`; GSI `username-index`; PITR + deletion protection enabled |
| data | dynamodb | games_table | `chesschat-dev-games` | `arn:aws:dynamodb:us-east-1:723580627470:table/chesschat-dev-games` | us-east-1 | Terraform `module.dynamodb.aws_dynamodb_table.games` | Project=chesschat, Environment=dev | 2026-02-28 | PK `game_id`; SK `ended_at`; GSIs `white-player-index`, `black-player-index` |
| data | elasticache | redis_replication_group | `chesschat-dev` | `arn:aws:elasticache:us-east-1:723580627470:replicationgroup:chesschat-dev` | us-east-1 | Terraform `module.elasticache.aws_elasticache_replication_group.redis` | Project=chesschat, Environment=dev | 2026-02-28 | Redis 7.0; `cache.t4g.micro`; 1 primary + 1 replica; Multi-AZ + automatic failover |
| data | elasticache | redis_subnet_group | `chesschat-dev-redis-subnets` | `arn:aws:elasticache:us-east-1:723580627470:subnetgroup:chesschat-dev-redis-subnets` | us-east-1 | Terraform `module.elasticache.aws_elasticache_subnet_group.redis` | Project=chesschat, Environment=dev | 2026-02-28 | Subnets: `subnet-0164ae112b9b50d6d`, `subnet-040d7023361518399`, `subnet-073e191f7e2029039` |
| data | elasticache | redis_parameter_group | `chesschat-dev-redis-params` | `arn:aws:elasticache:us-east-1:723580627470:parametergroup:chesschat-dev-redis-params` | us-east-1 | Terraform `module.elasticache.aws_elasticache_parameter_group.redis` | Project=chesschat | 2026-02-28 | Family `redis7`; `maxmemory-policy=allkeys-lru`; `timeout=300` |
| data | ec2_security_group | redis_security_group | `sg-0ffc201a5034c25ee` | n/a | us-east-1 | Terraform `module.elasticache.aws_security_group.redis` | Project=chesschat, Environment=dev | 2026-02-28 | Name `chesschat-dev-redis-sg`; inbound `tcp/6379` now allows ECS SG `sg-0c22505653f5a2167` |
| security | secretsmanager | redis_auth_token_secret | `chesschat/dev/redis/auth-token` | `arn:aws:secretsmanager:us-east-1:723580627470:secret:chesschat/dev/redis/auth-token-CgNYBy` | us-east-1 | Terraform `module.elasticache.aws_secretsmanager_secret.redis_auth_token` | Project=chesschat, Environment=dev | 2026-02-28 | Stores Redis AUTH token for ElastiCache replication group |
| identity | cognito-idp | user_pool | `us-east-1_AWq14lBGV` | `arn:aws:cognito-idp:us-east-1:723580627470:userpool/us-east-1_AWq14lBGV` | us-east-1 | Terraform `module.cognito.aws_cognito_user_pool.this` | Project=chesschat, Environment=dev | 2026-02-28 | User pool name `chesschat-dev-user-pool`; email sign-in and auto-verification enabled |
| identity | cognito-idp | app_client | `5numi4223d3jnebrlfqboseu42` | n/a | us-east-1 | Terraform `module.cognito.aws_cognito_user_pool_client.app` | Project=chesschat, Environment=dev | 2026-02-28 | Client name `chesschat-dev-app-client`; OAuth code grant; access tokens 1h, refresh tokens 30d |
| identity | cognito-idp | hosted_ui_domain | `chesschat-dev-6c96bb` | n/a | us-east-1 | Terraform `module.cognito.aws_cognito_user_pool_domain.this` | Project=chesschat, Environment=dev | 2026-02-28 | Hosted UI URL `https://chesschat-dev-6c96bb.auth.us-east-1.amazoncognito.com` |
| security | iam_role | ecs_task_execution_role | `chesschat-dev-ecs-task-execution-role` | `arn:aws:iam::723580627470:role/chesschat-dev-ecs-task-execution-role` | us-east-1 | Terraform `module.ecs_identity.aws_iam_role.task_execution` | Project=chesschat, Environment=dev | 2026-02-28 | Used by ECS control plane for image pull, logs, and secrets retrieval at task startup |
| security | iam_role | ecs_task_role | `chesschat-dev-ecs-task-role` | `arn:aws:iam::723580627470:role/chesschat-dev-ecs-task-role` | us-east-1 | Terraform `module.ecs_identity.aws_iam_role.task` | Project=chesschat, Environment=dev | 2026-02-28 | Used by running app containers for DynamoDB, Redis metadata, Chime SDK, and CloudWatch metrics |
| security | iam_oidc_provider | github_actions_oidc_provider | `token.actions.githubusercontent.com` | `arn:aws:iam::723580627470:oidc-provider/token.actions.githubusercontent.com` | us-east-1 | Terraform `module.github_actions_oidc.aws_iam_openid_connect_provider.github[0]` | Project=chesschat, Environment=dev | 2026-03-01 | GitHub Actions federated identity provider (`aud=sts.amazonaws.com`) |
| security | iam_role | github_actions_deploy_role | `chesschat-dev-github-actions-deploy-role` | `arn:aws:iam::723580627470:role/chesschat-dev-github-actions-deploy-role` | us-east-1 | Terraform `module.github_actions_oidc.aws_iam_role.github_actions_deploy[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Least-privilege role for GitHub Actions deploy + manual post-deploy E2E workflows |
| compute | ecr | app_repository | `chesschat-dev-app` | `arn:aws:ecr:us-east-1:723580627470:repository/chesschat-dev-app` | us-east-1 | Terraform `module.ecs_compute.aws_ecr_repository.app[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Repository URI `723580627470.dkr.ecr.us-east-1.amazonaws.com/chesschat-dev-app`; bootstrap tag pushed |
| compute | ecs | cluster | `chesschat-dev-ecs-cluster` | `arn:aws:ecs:us-east-1:723580627470:cluster/chesschat-dev-ecs-cluster` | us-east-1 | Terraform `module.ecs_compute.aws_ecs_cluster.this[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Container Insights enabled |
| compute | ecs | service | `chesschat-dev-ecs-service` | `arn:aws:ecs:us-east-1:723580627470:service/chesschat-dev-ecs-cluster/chesschat-dev-ecs-service` | us-east-1 | Terraform `module.ecs_compute.aws_ecs_service.app[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Service active in private app subnets; desired=1 |
| compute | ecs | task_definition | `chesschat-dev-task:18` | `arn:aws:ecs:us-east-1:723580627470:task-definition/chesschat-dev-task:18` | us-east-1 | Terraform `module.ecs_compute.aws_ecs_task_definition.app[0]` + CI deploy workflow revisions | Project=chesschat, Environment=dev | 2026-03-09 | Runtime platform `LINUX/X86_64`; `APP_DOMAIN` set to `https://chess-chat.com`; ECS service drift guard preserves CI-owned revisions (`ignore_changes = [task_definition]`) |
| compute | ec2_security_group | ecs_service_sg | `sg-0c22505653f5a2167` | n/a | us-east-1 | Terraform `module.ecs_compute.aws_security_group.service[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Name `chesschat-dev-ecs-service-sg`; egress all; ingress managed by edge integration when enabled |
| edge | acm | app_certificate | `chess-chat.com` | `arn:aws:acm:us-east-1:723580627470:certificate/302acfe9-8786-4fda-91c9-ca15dd668f6f` | us-east-1 | Terraform `module.alb.aws_acm_certificate.app[0]` | Project=chesschat, Environment=dev | 2026-03-09 | DNS-validated; status `ISSUED`; SAN includes `app.chess-chat.com`; type `AMAZON_ISSUED` |
| edge | alb | app_load_balancer | `chesschat-dev-alb` | `arn:aws:elasticloadbalancing:us-east-1:723580627470:loadbalancer/app/chesschat-dev-alb/3f386d7f443ecbd1` | us-east-1 | Terraform `module.alb.aws_lb.this[0]` | Project=chesschat, Environment=dev | 2026-03-01 | DNS `chesschat-dev-alb-251000663.us-east-1.elb.amazonaws.com`; internet-facing; state `active` |
| edge | alb | app_target_group | `chesschat-dev-app-tg` | `arn:aws:elasticloadbalancing:us-east-1:723580627470:targetgroup/chesschat-dev-app-tg/ab03b244c7e6560f` | us-east-1 | Terraform `module.alb.aws_lb_target_group.app[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Health path `/healthz`; target type `ip`; port `8080` |
| edge | alb | listener_http | `chesschat-dev-alb:80` | `arn:aws:elasticloadbalancing:us-east-1:723580627470:listener/app/chesschat-dev-alb/3f386d7f443ecbd1/2fd7462833179147` | us-east-1 | Terraform `module.alb.aws_lb_listener.http[0]` | Project=chesschat, Environment=dev | 2026-03-01 | HTTP listener redirects to HTTPS 443 |
| edge | alb | listener_https | `chesschat-dev-alb:443` | `arn:aws:elasticloadbalancing:us-east-1:723580627470:listener/app/chesschat-dev-alb/3f386d7f443ecbd1/db9a0769cf9be166` | us-east-1 | Terraform `module.alb.aws_lb_listener.https[0]` | Project=chesschat, Environment=dev | 2026-03-01 | HTTPS listener uses ACM cert for `app.chess-chat.com` |
| edge | ec2_security_group | alb_security_group | `sg-0d04ffe829ce755f0` | n/a | us-east-1 | Terraform `module.alb.aws_security_group.alb[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Ingress `80/443` from internet; egress all |
| dns | route53 | app_alias_record | `app.chess-chat.com` | n/a | us-east-1 | Terraform `module.route53.aws_route53_record.app_alias["app.chess-chat.com"]` | Project=chesschat, Environment=dev | 2026-03-09 | Type `A` alias to ALB in hosted zone `Z03927582T9WNB6PUN708` |
| dns | route53 | apex_alias_record | `chess-chat.com` | n/a | us-east-1 | Terraform `module.route53.aws_route53_record.app_alias["chess-chat.com"]` | Project=chesschat, Environment=dev | 2026-03-09 | Type `A` alias to ALB in hosted zone `Z03927582T9WNB6PUN708` |
| observability | sns | monitoring_alerts_topic | `chesschat-dev-alerts` | `arn:aws:sns:us-east-1:723580627470:chesschat-dev-alerts` | us-east-1 | Terraform `module.monitoring.aws_sns_topic.alerts[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Alert fan-out topic for CloudWatch alarms and AWS Budgets notifications |
| observability | sns_subscription | monitoring_alerts_email_subscription | `tim.antibes+CHESSCHAT_V2@gmail.com` | `arn:aws:sns:us-east-1:723580627470:chesschat-dev-alerts:e641a3ad-5bd3-4797-ac6d-832c6c6afac7` | us-east-1 | Terraform `module.monitoring.aws_sns_topic_subscription.email["tim.antibes+CHESSCHAT_V2@gmail.com"]` | Project=chesschat, Environment=dev | 2026-03-01 | Email subscription confirmed for alert topic |
| observability | cloudwatch_dashboard | operations_dashboard | `chesschat-dev-operations-dashboard` | `arn:aws:cloudwatch::723580627470:dashboard/chesschat-dev-operations-dashboard` | us-east-1 | Terraform `module.monitoring.aws_cloudwatch_dashboard.operations[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Dashboard widgets for ECS, ALB, Redis, DynamoDB |
| observability | cloudwatch_alarm | ecs_cpu_high_alarm | `chesschat-dev-ecs-cpu-high` | `arn:aws:cloudwatch:us-east-1:723580627470:alarm:chesschat-dev-ecs-cpu-high` | us-east-1 | Terraform `module.monitoring.aws_cloudwatch_metric_alarm.ecs_cpu_high[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Triggers when ECS service CPUUtilization >= 75% |
| observability | cloudwatch_alarm | ecs_memory_high_alarm | `chesschat-dev-ecs-memory-high` | `arn:aws:cloudwatch:us-east-1:723580627470:alarm:chesschat-dev-ecs-memory-high` | us-east-1 | Terraform `module.monitoring.aws_cloudwatch_metric_alarm.ecs_memory_high[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Triggers when ECS service MemoryUtilization >= 80% |
| observability | cloudwatch_alarm | alb_5xx_high_alarm | `chesschat-dev-alb-5xx-high` | `arn:aws:cloudwatch:us-east-1:723580627470:alarm:chesschat-dev-alb-5xx-high` | us-east-1 | Terraform `module.monitoring.aws_cloudwatch_metric_alarm.alb_5xx_high[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Triggers when ALB HTTPCode_ELB_5XX_Count >= 5 over period |
| observability | cloudwatch_alarm | alb_unhealthy_targets_alarm | `chesschat-dev-alb-unhealthy-targets` | `arn:aws:cloudwatch:us-east-1:723580627470:alarm:chesschat-dev-alb-unhealthy-targets` | us-east-1 | Terraform `module.monitoring.aws_cloudwatch_metric_alarm.alb_unhealthy_targets[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Triggers when ALB target group UnHealthyHostCount > 0 |
| observability | cloudwatch_alarm | alb_healthy_hosts_low_alarm | `chesschat-dev-alb-healthy-hosts-low` | `arn:aws:cloudwatch:us-east-1:723580627470:alarm:chesschat-dev-alb-healthy-hosts-low` | us-east-1 | Terraform `module.monitoring.aws_cloudwatch_metric_alarm.alb_healthy_hosts_low[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Triggers when ALB target group HealthyHostCount < 1 (missing data treated as breaching) |
| observability | cloudwatch_alarm | redis_engine_cpu_high_alarm | `chesschat-dev-redis-engine-cpu-high` | `arn:aws:cloudwatch:us-east-1:723580627470:alarm:chesschat-dev-redis-engine-cpu-high` | us-east-1 | Terraform `module.monitoring.aws_cloudwatch_metric_alarm.redis_engine_cpu_high[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Triggers when Redis EngineCPUUtilization >= 75% |
| observability | cloudwatch_alarm | ddb_users_throttles_alarm | `chesschat-dev-ddb-users-throttles` | `arn:aws:cloudwatch:us-east-1:723580627470:alarm:chesschat-dev-ddb-users-throttles` | us-east-1 | Terraform `module.monitoring.aws_cloudwatch_metric_alarm.dynamodb_users_throttles[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Triggers when users table ThrottledRequests > 0 |
| observability | cloudwatch_alarm | ddb_games_throttles_alarm | `chesschat-dev-ddb-games-throttles` | `arn:aws:cloudwatch:us-east-1:723580627470:alarm:chesschat-dev-ddb-games-throttles` | us-east-1 | Terraform `module.monitoring.aws_cloudwatch_metric_alarm.dynamodb_games_throttles[0]` | Project=chesschat, Environment=dev | 2026-03-01 | Triggers when games table ThrottledRequests > 0 |
| cost | budgets | monthly_cost_budget | `chesschat-dev-monthly-cost` | n/a | us-east-1 | Terraform `module.monitoring.aws_budgets_budget.monthly_cost[0]` | Project=chesschat | 2026-03-01 | `$100` monthly COST budget (updated 2026-03-02) with 80/90/100% ACTUAL notifications to SNS (`SNS-only` routing model) |

## Auth Baseline
- Keep only these AWS CLI profiles: `default`, `CHESSCHAT_IAM_USER`.
- Required active identity for Terraform and AWS CLI: `arn:aws:iam::723580627470:user/CHESSCHAT_IAM_USER`.
- Quick verification:
  - `aws sts get-caller-identity --query Arn --output text`
  - `aws s3api head-bucket --bucket chesschat-tfstate-723580627470-us-east-1`

## Update Rule
- After creating any resource, update this file in the same session with exact name, ARN, and command context.

## Runtime Updates (No New AWS Resources)
- Reliability/runtime hardening update (2026-03-02):
  - Implemented Redis-backed game finalization durability queue + dead-letter handling in app runtime:
    - Queue key: `game_finalization_queue`
    - Dead-letter key: `game_finalization_deadletter`
  - Added DynamoDB idempotent transaction guard for game persistence to prevent duplicate game inserts/stat double-count during retry/replay.
  - Added app-level persistence metrics:
    - `GamePersistSucceeded`
    - `GamePersistRetried`
    - `GamePersistFailed`
  - Added reconnect lifecycle hardening:
    - stale reconnect deadline cleanup when both players are connected
    - reconnect state versioning (`reconnectVersion`, optional event field) for monotonic client behavior
    - defensive lifecycle transition logs in websocket handlers
  - Validation commands executed in repo:
    - `npm --prefix app/backend run test:coverage` (pass, 20/20)
    - `npm --prefix app/frontend run test:coverage` (pass, 10/10)
    - `npm --prefix app/frontend run build` (pass)
  - Terraform caveat in this sandbox:
    - `terraform -chdir=terraform init -backend=false` failed due DNS/STS resolution (`sts.us-east-1.amazonaws.com`)
    - `terraform -chdir=terraform validate` failed to load provider schemas in sandbox runtime
    - Re-validate Terraform from normal host shell with working AWS/network.
- UI governance update (2026-03-05, no new AWS resources):
  - Added `DOCS/UI_DESIGN_GUIDE.md` as UI/UX source-of-truth for:
    - desktop/mobile game-room layout baseline,
    - MVP button/control inventory,
    - motion/performance/accessibility constraints (including reduced-motion handling),
    - design decision logging process.
  - Updated project operating rules (`AGENTS.md`) to require UI design documentation updates alongside strategy/diary updates for substantial design changes.
- App identity + media UX update (2026-03-09, no new AWS resources):
  - Added app-level unique username setup path (`/api/profile`) with DynamoDB uniqueness reservation semantics.
  - Updated websocket room participant payloads to include profile display metadata (`username`, `displayName`) for frontend rendering.
  - Added frontend move feedback sound and Chime media device-selection compatibility fallback (`choose*` -> `start*` methods).
  - No infrastructure IDs/ARNs changed.
- UI implementation update (2026-03-07, no new AWS resources):
  - Implemented desktop-first room UI overhaul and shared visual shell pass in frontend app layer.
  - Added tokenized design system, animated gradient background with reduced-motion fallback, and composable video card/control components.
  - Preserved backend/API/WS contracts; no infrastructure provisioning changes.
  - Validation commands executed in repo:
    - `npm --prefix app/frontend run test` (pass, 11/11)
    - `npm --prefix app/frontend run build` (pass)
- UI stability hotfix update (2026-03-08, no new AWS resources):
  - Frontend-only adjustments for hover visual stability, board sizing, and media auto-join UX.
  - Deployment intent: same ECS pipeline path via merge-to-main; no infra state changes.
