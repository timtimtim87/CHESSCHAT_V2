# CHESSCHAT Cloud Architecture Draft (Terraform + Registry Grounded)

Date: 2026-03-07  
Environment: `dev`  
AWS Region: `us-east-1`  
AWS Account: `723580627470`

This draft is derived from:
- `terraform/main.tf` and `terraform/modules/*`
- `terraform/environments/dev/terraform.tfvars`
- `infra/RESOURCE_REGISTRY.md` (last updated 2026-03-07)

## 1) System Context Diagram

```mermaid
flowchart LR
  U[Players and Interviewers<br/>Browser + Mobile]:::actor
  GH[GitHub Actions<br/>repo timtimtim87/CHESSCHAT_V2<br/>branch main]:::actor

  subgraph AWS["AWS Account 723580627470 (us-east-1)"]
    R53[Route53<br/>app.chess-chat.com A Alias]
    ACM[ACM Certificate<br/>app.chess-chat.com]
    ALB[Internet-facing ALB<br/>HTTP 80 -> HTTPS 443]
    ECS[ECS Fargate Service<br/>desired=1, container:8080]
    COG[Cognito User Pool + App Client<br/>Hosted UI domain]
    DDB[DynamoDB<br/>users + games tables]
    REDIS[ElastiCache Redis<br/>1 primary + 1 replica (Multi-AZ)]
    SM[Secrets Manager<br/>redis auth token]
    CW[CloudWatch<br/>logs, metrics, alarms, dashboard]
    SNS[SNS Topic<br/>chesschat-dev-alerts]
    BGT[AWS Budgets<br/>monthly cost budget]
    ECR[ECR Repository<br/>chesschat-dev-app]
    OIDC[IAM OIDC Provider<br/>token.actions.githubusercontent.com]
    GHA_ROLE[GitHub Deploy Role<br/>least privilege]
  end

  U -->|HTTPS + WSS| R53
  R53 -->|Alias| ALB
  ACM -->|TLS cert on 443 listener| ALB
  ALB -->|Target Group forward| ECS
  ECS -->|OAuth login and token validation| COG
  ECS -->|DynamoDB API| DDB
  ECS -->|Redis TLS:6379| REDIS
  ECS -->|GetSecretValue| SM
  ECS -->|Put logs + custom metrics| CW
  CW -->|Alarm actions| SNS
  BGT -->|80/90/100% notifications| SNS

  GH -->|AssumeRoleWithWebIdentity| OIDC
  OIDC --> GHA_ROLE
  GHA_ROLE -->|Push/Pull image| ECR
  GHA_ROLE -->|Register task def + UpdateService| ECS
  GHA_ROLE -->|AdminCreateUser/AdminDeleteUser for e2e| COG

  NAT_NOTE[Tradeoff: single NAT gateway<br/>cost optimized, single-AZ egress dependency]:::note
  ECS_NOTE[Portfolio baseline: ECS desired_count=1]:::note
  FUTURE[Future hardening: WAF, per-AZ NAT,<br/>ECS autoscaling floor >1 for stronger HA]:::future
  ALB -.-> NAT_NOTE
  ECS -.-> ECS_NOTE
  AWS -.-> FUTURE

  classDef actor fill:#f3f4f6,stroke:#374151,color:#111827;
  classDef note fill:#fff7ed,stroke:#c2410c,color:#7c2d12;
  classDef future fill:#eff6ff,stroke:#1d4ed8,color:#1e3a8a;
```

## 2) AWS Runtime Topology Diagram

```mermaid
flowchart TB
  INTERNET[Internet Clients]:::actor

  subgraph AWS["AWS us-east-1 / Account 723580627470"]
    R53[Route53<br/>app.chess-chat.com]:::edge
    ACM[ACM cert<br/>app.chess-chat.com]:::edge
    COG[Cognito user pool/client/domain]:::identity
    DDB[DynamoDB users + games]:::data
    CW[CloudWatch logs/alarms/dashboard]:::obs
    SNS[SNS alerts topic + email sub]:::obs
    BGT[AWS Budget $100/month]:::obs

    subgraph VPC["VPC 10.20.0.0/16 (3-AZ)"]
      IGW[Internet Gateway]:::net
      NAT[NAT Gateway x1 (single mode)]:::net
      VPCE_GW[Gateway Endpoints<br/>S3 + DynamoDB]:::net
      VPCE_IF[Interface Endpoints<br/>ECR API, ECR DKR, Logs, SecretsManager]:::net
      FLOW[VPC Flow Logs<br/>/aws/vpc/chesschat-dev-vpc/flow-logs]:::obs

      subgraph AZA["us-east-1a"]
        PUB_A[Public subnet<br/>10.20.0.0/20]:::pub
        APP_A[Private app subnet<br/>10.20.48.0/20]:::app
        DATA_A[Private data subnet<br/>10.20.96.0/20]:::data
      end
      subgraph AZB["us-east-1b"]
        PUB_B[Public subnet<br/>10.20.16.0/20]:::pub
        APP_B[Private app subnet<br/>10.20.64.0/20]:::app
        DATA_B[Private data subnet<br/>10.20.112.0/20]:::data
      end
      subgraph AZC["us-east-1c"]
        PUB_C[Public subnet<br/>10.20.32.0/20]:::pub
        APP_C[Private app subnet<br/>10.20.80.0/20]:::app
        DATA_C[Private data subnet<br/>10.20.128.0/20]:::data
      end

      ALB[ALB + SG<br/>80/443 from internet]:::edge
      ECS[ECS Service (Fargate)<br/>tasks in private app subnets]:::app
      REDIS[ElastiCache Redis RG<br/>primary + replica, Multi-AZ]:::data
      SM[Secrets Manager<br/>chesschat/dev/redis/auth-token]:::data
      ECR[ECR repo<br/>chesschat-dev-app]:::app
    end
  end

  INTERNET -->|HTTPS/WSS| R53
  R53 -->|Alias A record| ALB
  ACM -->|TLS cert| ALB
  ALB -->|Forward :8080| ECS
  ECS -->|OAuth + JWT flows| COG
  ECS -->|Read/write| DDB
  ECS -->|Redis TLS 6379| REDIS
  ECS -->|GetSecretValue| SM
  ECS -->|Image pull path| ECR
  ECS -->|logs + metrics| CW
  CW -->|alarm actions| SNS
  BGT -->|threshold notifications| SNS

  PUB_A --- IGW
  PUB_B --- IGW
  PUB_C --- IGW
  APP_A --> NAT
  APP_B --> NAT
  APP_C --> NAT
  DATA_A --> NAT
  DATA_B --> NAT
  DATA_C --> NAT
  APP_A --- VPCE_IF
  APP_B --- VPCE_IF
  APP_C --- VPCE_IF
  APP_A --- VPCE_GW
  APP_B --- VPCE_GW
  APP_C --- VPCE_GW
  VPC --> FLOW

  NOTE1[Tradeoff: single NAT lowers cost<br/>but creates single-AZ egress dependency]:::note
  NOTE2[Future hardening: per-AZ NAT + ECS autoscaling min 2 tasks]:::future
  NAT -.-> NOTE1
  ECS -.-> NOTE2

  classDef actor fill:#f3f4f6,stroke:#374151,color:#111827;
  classDef edge fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a;
  classDef identity fill:#ede9fe,stroke:#6d28d9,color:#4c1d95;
  classDef app fill:#dcfce7,stroke:#15803d,color:#14532d;
  classDef data fill:#ffedd5,stroke:#c2410c,color:#7c2d12;
  classDef obs fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e;
  classDef net fill:#fee2e2,stroke:#b91c1c,color:#7f1d1d;
  classDef pub fill:#fef3c7,stroke:#b45309,color:#78350f;
  classDef note fill:#fff7ed,stroke:#c2410c,color:#7c2d12;
  classDef future fill:#eff6ff,stroke:#1d4ed8,color:#1e3a8a;
```

## 3) Delivery + IAM Trust Diagram

```mermaid
flowchart LR
  GH[GitHub Actions Workflows<br/>deploy-main + e2e-post-deploy]:::actor

  subgraph AWS["AWS IAM + Deploy Surface (us-east-1)"]
    OIDC[OIDC Provider<br/>token.actions.githubusercontent.com<br/>aud=sts.amazonaws.com]:::identity
    TRUST[Trust Condition<br/>sub = repo:timtimtim87/CHESSCHAT_V2:ref:refs/heads/main]:::identity
    DEPLOY[Role: chesschat-dev-github-actions-deploy-role]:::identity

    ECR[ECR repo<br/>chesschat-dev-app]:::app
    ECS[ECS cluster/service<br/>chesschat-dev-ecs-cluster/service]:::app
    TD[RegisterTaskDefinition<br/>+ UpdateService]:::app
    COG[Cognito user pool<br/>AdminCreate/Delete/Get/SetPassword for e2e]:::identity

    EXEC_ROLE[ECS task execution role]:::identity
    TASK_ROLE[ECS task role]:::identity
    SM[Secrets Manager redis token]:::data
    DDB[DynamoDB users + games]:::data
    REDIS_META[ElastiCache DescribeReplicationGroups]:::data
    CHIME[Amazon Chime SDK APIs]:::app
    CW[CloudWatch PutMetricData<br/>namespace Chesschat/Dev]:::obs
  end

  GH -->|OIDC JWT| OIDC
  OIDC -->|AssumeRoleWithWebIdentity| DEPLOY
  TRUST --> DEPLOY

  DEPLOY -->|ECR push/pull permissions| ECR
  DEPLOY -->|ecs:RegisterTaskDefinition<br/>ecs:UpdateService| TD
  TD --> ECS
  DEPLOY -->|iam:PassRole (ecs-tasks.amazonaws.com)| EXEC_ROLE
  DEPLOY -->|iam:PassRole (ecs-tasks.amazonaws.com)| TASK_ROLE
  DEPLOY -->|Cognito admin lifecycle for e2e| COG

  ECS -->|uses| EXEC_ROLE
  ECS -->|uses| TASK_ROLE
  EXEC_ROLE -->|GetSecretValue| SM
  TASK_ROLE -->|Read/write API| DDB
  TASK_ROLE -->|GetSecretValue| SM
  TASK_ROLE -->|DescribeReplicationGroups| REDIS_META
  TASK_ROLE -->|Create/Get/Delete meeting/attendee| CHIME
  TASK_ROLE -->|PutMetricData| CW

  NOTE[Tradeoff: branch-scoped trust minimizes blast radius<br/>while allowing fully automated deploys]:::note
  FUTURE[Future hardening: add environment approvals,<br/>artifact signing, and narrower ECS resource scoping]:::future
  DEPLOY -.-> NOTE
  DEPLOY -.-> FUTURE

  classDef actor fill:#f3f4f6,stroke:#374151,color:#111827;
  classDef identity fill:#ede9fe,stroke:#6d28d9,color:#4c1d95;
  classDef app fill:#dcfce7,stroke:#15803d,color:#14532d;
  classDef data fill:#ffedd5,stroke:#c2410c,color:#7c2d12;
  classDef obs fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e;
  classDef note fill:#fff7ed,stroke:#c2410c,color:#7c2d12;
  classDef future fill:#eff6ff,stroke:#1d4ed8,color:#1e3a8a;
```

## Coverage Checklist (Draft Validation)

- VPC, IGW, NAT, endpoints, and flow logs represented.
- Route53, ACM, ALB, target forwarding, and ECS placement represented.
- Cognito, DynamoDB, ElastiCache, Secrets Manager links represented.
- CloudWatch alarms/dashboard and SNS/Budget notification fan-out represented.
- GitHub Actions OIDC and least-privilege deploy role trust/permission flows represented.
