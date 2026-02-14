# Chess Platform - Technical Implementation Guide

## Document Purpose

This guide provides step-by-step implementation procedures for deploying the chess platform infrastructure. Use this alongside the Architecture Guide for complete understanding of both design and execution.

**Before You Begin:**
- Read the Architecture Guide to understand the overall design
- Ensure you have all prerequisites met
- Allocate 4-6 hours for initial deployment
- Have rollback plan ready

---

## Prerequisites Checklist

### AWS Account Setup
- [ ] AWS account created and accessible
- [ ] Root account email confirmed
- [ ] MFA enabled on root account
- [ ] Billing alerts configured ($10, $50, $100 thresholds)
- [ ] Cost Explorer enabled
- [ ] IAM user created with AdministratorAccess (for initial setup)
- [ ] IAM user has MFA enabled
- [ ] Access keys generated and stored securely

### Local Development Environment
- [ ] AWS CLI installed (version 2.x)
- [ ] AWS CLI configured (`aws configure`)
- [ ] Terraform installed (version 1.5+)
- [ ] Docker installed and running
- [ ] Git installed
- [ ] Text editor/IDE ready (VS Code recommended)
- [ ] Node.js or Python installed (for application development)

### Domain & DNS
- [ ] Domain name registered (Route 53 or external)
- [ ] Domain registrar access confirmed
- [ ] Nameserver update capability verified

### Third-Party Services
- [ ] Google OAuth app created (optional, for social login)
- [ ] Facebook app created (optional, for social login)
- [ ] Client IDs and secrets stored securely

### Financial Planning
- [ ] Monthly budget confirmed (~$180-245)
- [ ] Payment method on file in AWS
- [ ] Credit card has sufficient limit
- [ ] Spending alerts configured

---

## Phase 0: Terraform Bootstrap

### Overview
Set up Terraform remote state backend before deploying infrastructure.

### Pre-Flight Checklist
- [ ] AWS credentials configured locally
- [ ] AWS CLI working (`aws sts get-caller-identity`)
- [ ] Terraform installed and in PATH
- [ ] S3 bucket name chosen (globally unique)
- [ ] DynamoDB table name chosen

### Implementation Steps

**Step 1: Create S3 Bucket for State**
```
Bucket name: chess-platform-terraform-state-{random-suffix}
Region: us-east-1
Settings:
- Versioning: Enabled
- Encryption: SSE-S3 (AES-256)
- Block Public Access: All enabled
- Object Lock: Disabled
```

**Via AWS Console:**
1. Navigate to S3 console
2. Click "Create bucket"
3. Enter bucket name
4. Select region: us-east-1
5. Enable versioning
6. Enable default encryption (SSE-S3)
7. Block all public access
8. Create bucket

**Via AWS CLI:**
```bash
aws s3api create-bucket \
  --bucket chess-platform-terraform-state-YOUR-SUFFIX \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket chess-platform-terraform-state-YOUR-SUFFIX \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket chess-platform-terraform-state-YOUR-SUFFIX \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

**Step 2: Create DynamoDB Table for State Locking**
```
Table name: terraform-state-lock
Region: us-east-1
Partition key: LockID (String)
Billing mode: On-demand
Settings:
- Deletion protection: Enabled
- Encryption: AWS managed key
```

**Via AWS Console:**
1. Navigate to DynamoDB console
2. Click "Create table"
3. Table name: terraform-state-lock
4. Partition key: LockID (String)
5. No sort key
6. On-demand capacity mode
7. Enable deletion protection
8. Default encryption settings
9. Create table

**Via AWS CLI:**
```bash
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --deletion-protection-enabled \
  --region us-east-1
```

**Step 3: Configure backend.tf**
Create backend configuration file with your bucket name.

### Verification Checklist
- [ ] S3 bucket exists and accessible
- [ ] S3 bucket versioning enabled
- [ ] S3 bucket encryption enabled
- [ ] S3 bucket blocks public access
- [ ] DynamoDB table exists
- [ ] DynamoDB table has LockID partition key
- [ ] DynamoDB deletion protection enabled
- [ ] Can write test file to S3 bucket
- [ ] Can write test item to DynamoDB table

### Common Issues
**Issue:** Bucket name already taken
**Fix:** Add random suffix or different naming convention

**Issue:** Access denied when creating resources
**Fix:** Verify IAM permissions include S3 and DynamoDB full access

**Issue:** DynamoDB table creation fails
**Fix:** Check region matches (us-east-1), verify unique table name

---

## Phase 1: VPC & Network Infrastructure

### Overview
Deploy three-tier VPC with public, private app, and private data subnets across 3 availability zones.

### Pre-Flight Checklist
- [ ] Terraform backend configured
- [ ] VPC CIDR chosen (10.0.0.0/16)
- [ ] Availability zones identified (us-east-1a, us-east-1b, us-east-1c)
- [ ] VPC module created
- [ ] Terraform initialized (`terraform init`)

### Implementation Steps

**Step 1: Create VPC Module Structure**
```
modules/vpc/
â”œâ”€â”€ main.tf       (VPC, subnets, route tables)
â”œâ”€â”€ igw.tf        (Internet Gateway)
â”œâ”€â”€ nat.tf        (NAT Gateways with EIPs)
â”œâ”€â”€ endpoints.tf  (VPC endpoints)
â”œâ”€â”€ security.tf   (Security groups, NACLs)
â”œâ”€â”€ flow_logs.tf  (VPC Flow Logs)
â”œâ”€â”€ variables.tf
â””â”€â”€ outputs.tf
```

**Step 2: Define VPC Resources**

VPC Configuration:
- CIDR: 10.0.0.0/16
- Enable DNS hostnames
- Enable DNS support
- Tags: Project, ManagedBy, Tier

Subnet Configuration:
```
Public Subnets (presentation tier):
- 10.0.1.0/24 (us-east-1a)
- 10.0.2.0/24 (us-east-1b)
- 10.0.3.0/24 (us-east-1c)

Private App Subnets (application tier):
- 10.0.11.0/24 (us-east-1a)
- 10.0.12.0/24 (us-east-1b)
- 10.0.13.0/24 (us-east-1c)

Private Data Subnets (data tier):
- 10.0.21.0/24 (us-east-1a)
- 10.0.22.0/24 (us-east-1b)
- 10.0.23.0/24 (us-east-1c)
```

**Step 3: Internet Gateway**
- Attach to VPC
- Create route in public subnet route tables: 0.0.0.0/0 â†’ IGW

**Step 4: NAT Gateways**
- Create 2 Elastic IPs (one per NAT Gateway)
- Deploy NAT Gateway in public subnet AZ-A
- Deploy NAT Gateway in public subnet AZ-B
- Update private app subnet route tables: 0.0.0.0/0 â†’ NAT Gateway

Route table associations:
- AZ-A and AZ-B private app subnets â†’ respective NAT Gateway
- AZ-C private app subnet â†’ NAT Gateway in AZ-A or AZ-B

**Step 5: VPC Endpoints**

Gateway Endpoints (free):
- DynamoDB Gateway Endpoint
- S3 Gateway Endpoint
- Associate with private app and private data subnet route tables

Interface Endpoints (~$7/month each):
- com.amazonaws.us-east-1.ecr.api
- com.amazonaws.us-east-1.ecr.dkr
- com.amazonaws.us-east-1.logs
- com.amazonaws.us-east-1.secretsmanager
- Deploy in private app subnets (all 3 AZs)
- Security group: Allow 443 from VPC CIDR

**Step 6: Security Groups**

ALB Security Group:
- Inbound: 443 from 0.0.0.0/0
- Inbound: 80 from 0.0.0.0/0
- Outbound: All traffic

Fargate Task Security Group:
- Inbound: 80 from ALB security group only
- Outbound: All traffic
- Note: Will be created in ECS phase, placeholder for now

Redis Security Group:
- Inbound: 6379 from Fargate security group only
- Outbound: None needed
- Note: Will reference Fargate SG

VPC Endpoint Security Group:
- Inbound: 443 from 10.0.0.0/16
- Outbound: All traffic

**Step 7: Network ACLs**

Public Subnet NACLs:
- Inbound: 80, 443 from 0.0.0.0/0
- Inbound: 1024-65535 from 0.0.0.0/0 (ephemeral)
- Outbound: All traffic

Private App Subnet NACLs:
- Inbound: All from 10.0.0.0/16
- Outbound: All traffic

Private Data Subnet NACLs:
- Inbound: All from 10.0.0.0/16
- Outbound: All from 10.0.0.0/16 (deny internet)

**Step 8: VPC Flow Logs**
- Enable on VPC level (captures all subnets)
- Destination: CloudWatch Logs
- Log group: /aws/vpc/chess-platform-flow-logs
- Retention: 7 days
- IAM role for Flow Logs
- Traffic type: ALL (accept + reject)

**Step 9: Apply VPC Module**
```bash
terraform plan
terraform apply
```

### Verification Checklist
- [ ] VPC created with correct CIDR (10.0.0.0/16)
- [ ] 9 subnets created (3 public, 3 private app, 3 private data)
- [ ] Each subnet in different AZ
- [ ] Internet Gateway attached to VPC
- [ ] 2 NAT Gateways created with Elastic IPs
- [ ] Public route table has route to IGW
- [ ] Private app route tables have routes to NAT Gateways
- [ ] Private data route tables have NO route to internet
- [ ] DynamoDB Gateway Endpoint created
- [ ] S3 Gateway Endpoint created
- [ ] 4 Interface Endpoints created (ECR API, ECR DKR, Logs, Secrets Manager)
- [ ] All security groups created
- [ ] VPC Flow Logs enabled and logging to CloudWatch
- [ ] Can see flow log data in CloudWatch (may take 5-10 minutes)

### Validation Commands
```bash
# List VPCs
aws ec2 describe-vpcs --filters "Name=tag:Project,Values=chess-platform"

# List subnets
aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-xxxxx"

# List NAT Gateways
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=vpc-xxxxx"

# List VPC endpoints
aws ec2 describe-vpc-endpoints --filters "Name=vpc-id,Values=vpc-xxxxx"

# Check flow logs
aws logs describe-log-groups --log-group-name-prefix /aws/vpc/
```

### Common Issues

**Issue:** Terraform fails with "InvalidSubnet.Range"
**Fix:** Verify subnet CIDRs don't overlap and fit within VPC CIDR

**Issue:** NAT Gateway creation fails
**Fix:** Ensure NAT Gateway is in public subnet with IGW route

**Issue:** VPC Endpoint creation fails
**Fix:** Check service name format: com.amazonaws.{region}.{service}

**Issue:** Flow Logs not appearing in CloudWatch
**Fix:** Wait 10-15 minutes for initial data, verify IAM role has correct permissions

**Issue:** Terraform state lock error
**Fix:** Check DynamoDB table exists, verify LockID attribute, check AWS credentials

---

## Phase 2: Data Layer (DynamoDB & ElastiCache)

### Overview
Deploy DynamoDB tables for persistent data and ElastiCache Redis for ephemeral state.

### Pre-Flight Checklist
- [ ] VPC infrastructure deployed successfully
- [ ] Private data subnets available
- [ ] DynamoDB module created
- [ ] ElastiCache module created
- [ ] Redis AUTH token generated and stored

### Implementation Steps - DynamoDB

**Step 1: Create DynamoDB Module**
```
modules/dynamodb/
â”œâ”€â”€ main.tf       (Tables, GSIs)
â”œâ”€â”€ variables.tf
â””â”€â”€ outputs.tf
```

**Step 2: Users Table**
```
Table name: chess-platform-users
Partition key: user_id (String)
Billing mode: On-demand
Attributes:
- user_id (S)
- username (S)

Global Secondary Index:
- Index name: username-index
- Partition key: username (String)
- Projection: ALL

Settings:
- Point-in-time recovery: Enabled
- Deletion protection: Enabled
- Encryption: AWS managed key
- Stream: Disabled (not needed)
```

**Step 3: Games History Table**
```
Table name: chess-platform-games
Partition key: game_id (String)
Sort key: ended_at (Number) - Unix timestamp
Billing mode: On-demand
Attributes:
- game_id (S)
- ended_at (N)
- white_player_id (S)
- black_player_id (S)

Global Secondary Indexes:
1. white-player-index
   - Partition key: white_player_id (String)
   - Sort key: ended_at (Number)
   - Projection: ALL

2. black-player-index
   - Partition key: black_player_id (String)
   - Sort key: ended_at (Number)
   - Projection: ALL

Settings:
- Point-in-time recovery: Enabled
- Deletion protection: Enabled
- Encryption: AWS managed key
- TTL: Disabled (keeping history)
```

**Step 4: Apply DynamoDB Module**
```bash
terraform plan -target=module.dynamodb
terraform apply -target=module.dynamodb
```

### Verification Checklist - DynamoDB
- [ ] Users table created
- [ ] Users table has username-index GSI
- [ ] Users table point-in-time recovery enabled
- [ ] Users table deletion protection enabled
- [ ] Games table created
- [ ] Games table has composite key (game_id, ended_at)
- [ ] Games table has white-player-index GSI
- [ ] Games table has black-player-index GSI
- [ ] Games table point-in-time recovery enabled
- [ ] Games table deletion protection enabled
- [ ] Can write test item to Users table
- [ ] Can query Users table by username
- [ ] Can write test item to Games table
- [ ] Can query Games table by player IDs

### Implementation Steps - ElastiCache Redis

**Step 1: Create ElastiCache Module**
```
modules/elasticache/
â”œâ”€â”€ main.tf       (Cluster, subnet group, parameter group)
â”œâ”€â”€ security.tf   (Security group)
â”œâ”€â”€ variables.tf
â””â”€â”€ outputs.tf
```

**Step 2: Redis Subnet Group**
```
Name: chess-platform-redis-subnet-group
Subnets: All 3 private data subnets
- 10.0.21.0/24 (us-east-1a)
- 10.0.22.0/24 (us-east-1b)
- 10.0.23.0/24 (us-east-1c)
```

**Step 3: Redis Parameter Group**
```
Family: redis7
Name: chess-platform-redis-params
Parameters:
- maxmemory-policy: allkeys-lru
- timeout: 300
```

**Step 4: Redis Replication Group**
```
Replication group ID: chess-platform-redis
Description: Redis cluster for chess platform
Engine: redis
Engine version: 7.0
Node type: cache.t4g.micro
Number of cache clusters: 2 (primary + replica)
Multi-AZ: Enabled
Automatic failover: Enabled
Subnet group: chess-platform-redis-subnet-group
Security group: Redis security group (from VPC module)
Parameter group: chess-platform-redis-params
Auth token: Enabled (store in Secrets Manager)
Encryption at rest: Enabled
Encryption in transit: Enabled
Snapshot retention: 7 days
Snapshot window: 03:00-04:00 UTC
Maintenance window: sun:04:00-sun:05:00 UTC
```

**Step 5: Store Redis AUTH Token**
Create random AUTH token and store in Secrets Manager:
```
Secret name: chess-platform/redis/auth-token
Secret type: Other
Value: {auto-generated 32-char token}
Encryption: AWS managed key
Rotation: Disabled (manual rotation)
```

**Step 6: Redis Security Group Rules**
Already created in VPC phase, verify:
- Inbound: TCP 6379 from Fargate security group
- Outbound: None (no outbound needed)

**Step 7: Apply ElastiCache Module**
```bash
terraform plan -target=module.elasticache
terraform apply -target=module.elasticache
```
Note: ElastiCache creation takes 10-15 minutes

### Verification Checklist - ElastiCache
- [ ] Redis replication group created
- [ ] Primary endpoint available
- [ ] Reader endpoint available (for Multi-AZ)
- [ ] 2 cache nodes running (primary + replica)
- [ ] Multi-AZ enabled
- [ ] Automatic failover enabled
- [ ] Encryption at rest enabled
- [ ] Encryption in transit enabled
- [ ] AUTH token enabled
- [ ] AUTH token stored in Secrets Manager
- [ ] Security group allows 6379 from app tier
- [ ] Daily backup configured (3 AM UTC)
- [ ] 7-day snapshot retention

### Validation Commands
```bash
# Describe DynamoDB tables
aws dynamodb describe-table --table-name chess-platform-users
aws dynamodb describe-table --table-name chess-platform-games

# List GSIs
aws dynamodb describe-table --table-name chess-platform-users \
  --query 'Table.GlobalSecondaryIndexes[*].IndexName'

# Check point-in-time recovery
aws dynamodb describe-continuous-backups --table-name chess-platform-users

# Describe Redis cluster
aws elasticache describe-replication-groups \
  --replication-group-id chess-platform-redis

# Get Redis endpoint
aws elasticache describe-replication-groups \
  --replication-group-id chess-platform-redis \
  --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint'

# Check Redis security group
aws ec2 describe-security-groups \
  --filters "Name=tag:Component,Values=redis"
```

### Common Issues

**Issue:** DynamoDB table creation fails with "ResourceInUseException"
**Fix:** Table name already exists, choose different name or delete existing

**Issue:** GSI creation fails
**Fix:** Ensure attribute is defined in AttributeDefinitions, check key schema

**Issue:** ElastiCache creation fails: "Insufficient subnet coverage"
**Fix:** Ensure subnet group has subnets in at least 2 AZs

**Issue:** Cannot connect to Redis
**Fix:** Verify security group allows 6379, check AUTH token, ensure in VPC

**Issue:** Redis AUTH fails
**Fix:** Retrieve correct token from Secrets Manager, ensure token passed in connection string

---

## Phase 3: Identity & Access (Cognito & IAM)

### Overview
Set up user authentication with Cognito and create IAM roles for ECS tasks.

### Pre-Flight Checklist
- [ ] Cognito module created
- [ ] Social login OAuth apps created (optional)
- [ ] Client IDs and secrets stored securely
- [ ] IAM role policies defined

### Implementation Steps - Cognito

**Step 1: Create Cognito Module**
```
modules/cognito/
â”œâ”€â”€ main.tf       (User pool, app client, identity providers)
â”œâ”€â”€ variables.tf
â””â”€â”€ outputs.tf
```

**Step 2: User Pool**
```
Pool name: chess-platform-users
Alias attributes: Email, Preferred Username
Auto-verified attributes: Email
Username attributes: Email (can sign in with email)
Password policy:
- Minimum length: 12
- Require uppercase: Yes
- Require lowercase: Yes
- Require numbers: Yes
- Require symbols: Yes
MFA: Optional (TOTP or SMS)
Account recovery: Email only
Email configuration: Default (Cognito email)
Tags: Project, ManagedBy
```

**Step 3: User Pool Domain**
```
Domain prefix: chess-platform-{random-suffix}
(e.g., chess-platform-a7k2m)
Full domain: chess-platform-a7k2m.auth.us-east-1.amazoncognito.com
```

**Step 4: App Client**
```
App client name: chess-platform-web
Generate client secret: Yes
Authentication flows:
- ALLOW_USER_PASSWORD_AUTH
- ALLOW_REFRESH_TOKEN_AUTH
- ALLOW_USER_SRP_AUTH
Token validity:
- Access token: 1 hour
- ID token: 1 hour
- Refresh token: 30 days
OAuth 2.0 flows:
- Authorization code grant
OAuth scopes:
- openid
- profile
- email
Callback URLs: https://chess.yourdomain.com/callback
Sign-out URLs: https://chess.yourdomain.com/logout
```

**Step 5: Social Identity Providers (Optional)**

Google:
```
Provider name: Google
Client ID: {from Google Cloud Console}
Client secret: {from Google Cloud Console}
Authorize scopes: profile email openid
Attribute mapping:
- email â†’ email
- name â†’ name
```

Facebook:
```
Provider name: Facebook
App ID: {from Facebook Developers}
App secret: {from Facebook Developers}
Authorize scopes: public_profile email
Attribute mapping:
- email â†’ email
- name â†’ name
```

**Step 6: Apply Cognito Module**
```bash
terraform plan -target=module.cognito
terraform apply -target=module.cognito
```

### Verification Checklist - Cognito
- [ ] User pool created
- [ ] User pool domain configured
- [ ] App client created
- [ ] App client has secret
- [ ] OAuth flows enabled
- [ ] Callback URLs configured
- [ ] Password policy meets requirements (12+ chars, complexity)
- [ ] Email verification required
- [ ] Social providers configured (if applicable)
- [ ] Can create test user via console
- [ ] Can verify test user email
- [ ] Can sign in with test user

### Implementation Steps - IAM Roles

**Step 1: ECS Task Execution Role**
```
Role name: chess-platform-ecs-task-execution-role
Trust policy: ecs-tasks.amazonaws.com
Managed policies:
- AmazonECSTaskExecutionRolePolicy (AWS managed)

Inline policy for Secrets Manager:
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "secretsmanager:GetSecretValue"
    ],
    "Resource": [
      "arn:aws:secretsmanager:us-east-1:*:secret:chess-platform/*"
    ]
  }]
}
```

**Step 2: ECS Task Role**
```
Role name: chess-platform-ecs-task-role
Trust policy: ecs-tasks.amazonaws.com

Inline policy - DynamoDB:
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query",
      "dynamodb:Scan"
    ],
    "Resource": [
      "arn:aws:dynamodb:us-east-1:*:table/chess-platform-users",
      "arn:aws:dynamodb:us-east-1:*:table/chess-platform-users/index/*",
      "arn:aws:dynamodb:us-east-1:*:table/chess-platform-games",
      "arn:aws:dynamodb:us-east-1:*:table/chess-platform-games/index/*"
    ]
  }]
}

Inline policy - ElastiCache:
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "elasticache:DescribeCacheClusters",
      "elasticache:DescribeReplicationGroups"
    ],
    "Resource": "*"
  }]
}

Inline policy - Chime SDK:
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "chime:CreateMeeting",
      "chime:CreateAttendee",
      "chime:DeleteMeeting",
      "chime:GetMeeting"
    ],
    "Resource": "*"
  }]
}

Inline policy - CloudWatch:
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "cloudwatch:PutMetricData"
    ],
    "Resource": "*"
  }]
}
```

### Verification Checklist - IAM
- [ ] Task execution role created
- [ ] Task execution role has ECS task execution policy
- [ ] Task execution role can read Secrets Manager
- [ ] Task role created
- [ ] Task role has DynamoDB permissions (specific tables only)
- [ ] Task role has ElastiCache describe permissions
- [ ] Task role has Chime SDK permissions
- [ ] Task role has CloudWatch metric permissions
- [ ] No wildcard resource ARNs (except where unavoidable)
- [ ] Trust policies allow ecs-tasks.amazonaws.com

### Validation Commands
```bash
# Describe user pool
aws cognito-idp describe-user-pool --user-pool-id us-east-1_xxxxx

# List app clients
aws cognito-idp list-user-pool-clients --user-pool-id us-east-1_xxxxx

# Get app client details
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-1_xxxxx \
  --client-id xxxxx

# List IAM roles
aws iam list-roles | grep chess-platform

# Get role policy
aws iam get-role --role-name chess-platform-ecs-task-role

# List attached policies
aws iam list-attached-role-policies --role-name chess-platform-ecs-task-execution-role
```

### Common Issues

**Issue:** Cognito user pool domain already taken
**Fix:** Choose different prefix with random suffix

**Issue:** Social login not working
**Fix:** Verify OAuth app credentials, check callback URLs match exactly

**Issue:** IAM role trust policy error
**Fix:** Ensure principal is "ecs-tasks.amazonaws.com", not "ecs.amazonaws.com"

**Issue:** Task cannot read Secrets Manager
**Fix:** Verify execution role (not task role) has secretsmanager:GetSecretValue

**Issue:** Task cannot write to DynamoDB
**Fix:** Verify task role (not execution role) has DynamoDB permissions

---

## Phase 4: Container Infrastructure (ECR & ECS)

### Overview
Set up container registry and ECS cluster with Fargate tasks.

### Pre-Flight Checklist
- [ ] Application code ready
- [ ] Dockerfile created
- [ ] Docker running locally
- [ ] ECR module created
- [ ] ECS module created
- [ ] VPC and IAM roles deployed

### Implementation Steps - ECR

**Step 1: Create ECR Module**
```
modules/ecr/
â”œâ”€â”€ main.tf       (Repository, lifecycle policy)
â”œâ”€â”€ variables.tf
â””â”€â”€ outputs.tf
```

**Step 2: ECR Repository**
```
Repository name: chess-platform
Image tag mutability: Mutable (allows overwriting tags like 'latest')
Scan on push: Enabled
Encryption: AES256

Lifecycle policy (keep last 10 images):
{
  "rules": [{
    "rulePriority": 1,
    "description": "Keep last 10 images",
    "selection": {
      "tagStatus": "any",
      "countType": "imageCountMoreThan",
      "countNumber": 10
    },
    "action": {
      "type": "expire"
    }
  }]
}
```

**Step 3: Apply ECR Module**
```bash
terraform plan -target=module.ecr
terraform apply -target=module.ecr
```

**Step 4: Build and Push Docker Image**
```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  {account-id}.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t chess-platform:latest .

# Tag for ECR
docker tag chess-platform:latest \
  {account-id}.dkr.ecr.us-east-1.amazonaws.com/chess-platform:latest

# Push to ECR
docker push {account-id}.dkr.ecr.us-east-1.amazonaws.com/chess-platform:latest
```

### Verification Checklist - ECR
- [ ] ECR repository created
- [ ] Repository has lifecycle policy
- [ ] Image scan on push enabled
- [ ] Can authenticate to ECR with Docker
- [ ] Docker image built successfully
- [ ] Docker image tagged for ECR
- [ ] Docker image pushed to ECR
- [ ] Can see image in ECR console
- [ ] Image has 'latest' tag

### Implementation Steps - ECS

**Step 1: Create ECS Module**
```
modules/ecs/
â”œâ”€â”€ main.tf          (Cluster, service)
â”œâ”€â”€ task_definition.tf
â”œâ”€â”€ autoscaling.tf
â”œâ”€â”€ cloudwatch.tf
â”œâ”€â”€ variables.tf
â””â”€â”€ outputs.tf
```

**Step 2: ECS Cluster**
```
Cluster name: chess-platform-cluster
Capacity providers: FARGATE, FARGATE_SPOT
Default capacity provider strategy: FARGATE (100%)
Container Insights: Enabled
Tags: Project, ManagedBy
```

**Step 3: CloudWatch Log Group**
```
Log group name: /ecs/chess-platform/application
Retention: 30 days
Encryption: Default (CloudWatch managed)
```

**Step 4: Task Definition**
```
Family: chess-platform-task
Network mode: awsvpc (required for Fargate)
Requires compatibilities: FARGATE
CPU: 256 (.25 vCPU)
Memory: 512 MB
Task execution role: chess-platform-ecs-task-execution-role
Task role: chess-platform-ecs-task-role

Container definition:
{
  "name": "chess-app",
  "image": "{account}.dkr.ecr.us-east-1.amazonaws.com/chess-platform:latest",
  "cpu": 256,
  "memory": 512,
  "essential": true,
  "portMappings": [{
    "containerPort": 80,
    "protocol": "tcp"
  }],
  "environment": [
    {"name": "NODE_ENV", "value": "production"},
    {"name": "AWS_REGION", "value": "us-east-1"},
    {"name": "REDIS_ENDPOINT", "value": "{from terraform output}"},
    {"name": "DYNAMODB_USERS_TABLE", "value": "chess-platform-users"},
    {"name": "DYNAMODB_GAMES_TABLE", "value": "chess-platform-games"}
  ],
  "secrets": [{
    "name": "REDIS_AUTH_TOKEN",
    "valueFrom": "arn:aws:secretsmanager:us-east-1:*:secret:chess-platform/redis/auth-token"
  }],
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/chess-platform/application",
      "awslogs-region": "us-east-1",
      "awslogs-stream-prefix": "ecs"
    }
  },
  "healthCheck": {
    "command": ["CMD-SHELL", "curl -f http://localhost/health || exit 1"],
    "interval": 30,
    "timeout": 5,
    "retries": 3,
    "startPeriod": 60
  }
}
```

**Step 5: ECS Service**
```
Service name: chess-platform-service
Cluster: chess-platform-cluster
Task definition: chess-platform-task:latest
Launch type: FARGATE
Platform version: LATEST
Desired count: 2
Deployment configuration:
- Deployment type: Rolling update
- Minimum healthy percent: 100
- Maximum percent: 200
Network configuration:
- Subnets: Private app subnets (all 3 AZs)
- Security groups: Fargate task security group
- Public IP: Disabled
Health check grace period: 60 seconds
Enable ECS managed tags: Yes
Propagate tags: From service
```

Note: Load balancer integration will be added in Phase 5

**Step 6: Service Auto Scaling**
```
Service auto scaling:
- Minimum capacity: 2
- Maximum capacity: 8
- Target tracking policy:
  - Metric: ECSServiceAverageCPUUtilization
  - Target value: 70%
  - Scale-out cooldown: 60 seconds
  - Scale-in cooldown: 300 seconds
```

**Step 7: Apply ECS Module**
```bash
terraform plan -target=module.ecs
terraform apply -target=module.ecs
```

Note: Initial apply will fail to start tasks until ALB is created (Phase 5)

### Verification Checklist - ECS
- [ ] ECS cluster created
- [ ] Container Insights enabled
- [ ] CloudWatch log group created
- [ ] Task definition registered
- [ ] Task definition has correct IAM roles
- [ ] Task definition references correct ECR image
- [ ] Task definition has environment variables
- [ ] Task definition secrets reference Secrets Manager
- [ ] Task definition has health check
- [ ] ECS service created
- [ ] Service desired count is 2
- [ ] Service uses Fargate launch type
- [ ] Service placed in private app subnets
- [ ] Service has no public IPs
- [ ] Auto scaling configured (min 2, max 8)

### Validation Commands
```bash
# List ECR images
aws ecr list-images --repository-name chess-platform

# Describe image
aws ecr describe-images --repository-name chess-platform

# List ECS clusters
aws ecs list-clusters

# Describe cluster
aws ecs describe-clusters --clusters chess-platform-cluster

# List services
aws ecs list-services --cluster chess-platform-cluster

# Describe service
aws ecs describe-services \
  --cluster chess-platform-cluster \
  --services chess-platform-service

# List tasks
aws ecs list-tasks --cluster chess-platform-cluster

# Get task logs
aws logs tail /ecs/chess-platform/application --follow
```

### Common Issues

**Issue:** ECR push fails with "no basic auth credentials"
**Fix:** Run `aws ecr get-login-password` again, token expires after 12 hours

**Issue:** Task fails to start: "CannotPullContainerError"
**Fix:** Verify task execution role has ECR permissions, check image exists

**Issue:** Task fails: "Secrets Manager secret not found"
**Fix:** Verify secret ARN is correct, check execution role has GetSecretValue permission

**Issue:** Tasks stuck in PENDING
**Fix:** Check ENI limits in account, verify subnets have available IPs

**Issue:** No logs in CloudWatch
**Fix:** Verify log group exists, check task execution role has logs:CreateLogStream permission

---

## Phase 5: Load Balancer & DNS

### Overview
Deploy Application Load Balancer, configure SSL certificate, and set up Route 53 DNS.

### Pre-Flight Checklist
- [ ] Domain registered and accessible
- [ ] ALB module created
- [ ] Route 53 module created
- [ ] Certificate module created
- [ ] ECS service deployed

### Implementation Steps - ACM Certificate

**Step 1: Request Certificate**
```
Domain name: *.yourdomain.com (wildcard)
Validation method: DNS validation
Key algorithm: RSA 2048
```

**Via AWS Console:**
1. Navigate to ACM in us-east-1
2. Click "Request certificate"
3. Choose "Request public certificate"
4. Domain name: *.yourdomain.com
5. Add name: yourdomain.com (naked domain)
6. Validation: DNS validation
7. Key algorithm: RSA 2048
8. Request certificate

**Step 2: Add DNS Validation Records**

ACM will provide CNAME records like:
```
Name: _abc123.yourdomain.com
Value: _xyz789.acm-validations.aws.
```

Add these to Route 53 (automated if using Route 53, manual if external DNS)

**Step 3: Wait for Validation**
Certificate status changes from "Pending validation" to "Issued" (5-30 minutes)

### Implementation Steps - Application Load Balancer

**Step 1: Create ALB Module**
```
modules/alb/
â”œâ”€â”€ main.tf          (ALB, listeners, target groups)
â”œâ”€â”€ variables.tf
â””â”€â”€ outputs.tf
```

**Step 2: Application Load Balancer**
```
Name: chess-platform-alb
Scheme: internet-facing
IP address type: ipv4
Subnets: All 3 public subnets (AZ-A, AZ-B, AZ-C)
Security groups: ALB security group (from VPC)
Tags: Project, ManagedBy, Component

Attributes:
- deletion_protection.enabled: true
- access_logs.s3.enabled: false (optional, can enable later)
- idle_timeout.timeout_seconds: 60
```

**Step 3: Target Group**
```
Name: chess-platform-tg
Target type: ip (for Fargate)
Protocol: HTTP
Port: 80
VPC: chess-platform VPC
Health check:
- Protocol: HTTP
- Path: /health
- Interval: 30 seconds
- Timeout: 5 seconds
- Healthy threshold: 2
- Unhealthy threshold: 3
- Matcher: 200
Deregistration delay: 30 seconds
Stickiness:
- Type: lb_cookie
- Enabled: true
- Duration: 3600 seconds (1 hour)
```

**Step 4: HTTPS Listener**
```
Port: 443
Protocol: HTTPS
SSL certificate: ACM certificate ARN
SSL policy: ELBSecurityPolicy-TLS-1-2-2017-01
Default action:
- Type: forward
- Target group: chess-platform-tg
```

**Step 5: HTTP Listener (Redirect)**
```
Port: 80
Protocol: HTTP
Default action:
- Type: redirect
- Protocol: HTTPS
- Port: 443
- Status code: 301 (permanent redirect)
```

**Step 6: Update ECS Service**
Add load balancer configuration to ECS service:
```
Load balancers:
- Target group ARN: chess-platform-tg
- Container name: chess-app
- Container port: 80
Health check grace period: 60 seconds
```

**Step 7: Apply ALB Module**
```bash
terraform plan -target=module.alb
terraform apply -target=module.alb
```

**Step 8: Update ECS Service**
```bash
terraform plan -target=module.ecs
terraform apply -target=module.ecs
```

### Verification Checklist - ALB
- [ ] ALB created in public subnets
- [ ] ALB is internet-facing
- [ ] ALB has security group allowing 80 and 443
- [ ] Target group created
- [ ] Target group health check configured
- [ ] HTTPS listener created with certificate
- [ ] HTTP listener redirects to HTTPS
- [ ] ECS service registered with target group
- [ ] At least 1 target showing healthy
- [ ] Can access ALB DNS name via HTTPS
- [ ] HTTP redirects to HTTPS

### Implementation Steps - Route 53

**Step 1: Create Route 53 Module**
```
modules/route53/
â”œâ”€â”€ main.tf          (Hosted zone, records, health checks)
â”œâ”€â”€ dnssec.tf
â”œâ”€â”€ variables.tf
â””â”€â”€ outputs.tf
```

**Step 2: Hosted Zone**
```
Domain name: yourdomain.com
Type: Public hosted zone
Comment: Chess platform DNS
Tags: Project, ManagedBy
```

**Step 3: Update Nameservers at Registrar**
After creating hosted zone, get NS record values:
```
ns-123.awsdns-12.com
ns-456.awsdns-34.net
ns-789.awsdns-56.org
ns-012.awsdns-78.co.uk
```

Update these at your domain registrar (wait 24-48 hours for propagation)

**Step 4: A Record (Alias to ALB)**
```
Name: chess.yourdomain.com
Type: A
Alias: Yes
Alias target: {ALB DNS name}
Routing policy: Simple
Evaluate target health: Yes
```

**Step 5: AAAA Record (IPv6)**
```
Name: chess.yourdomain.com
Type: AAAA
Alias: Yes
Alias target: {ALB DNS name}
Routing policy: Simple
Evaluate target health: Yes
```

**Step 6: CNAME for www (Optional)**
```
Name: www.chess.yourdomain.com
Type: CNAME
Value: chess.yourdomain.com
TTL: 300
```

**Step 7: Health Check**
```
Name: chess-platform-alb-health
Type: HTTPS
Resource path: /health
Domain: chess.yourdomain.com
Port: 443
Interval: 30 seconds
Failure threshold: 3
Regions: Standard (multiple AWS regions)
Create CloudWatch alarm: Yes
```

**Step 8: Query Logging**
```
Log group: /aws/route53/chess.yourdomain.com
Retention: 30 days
```

**Step 9: DNSSEC Signing**
```
Enable DNSSEC signing
Algorithm: ECDSAP256SHA256
Add DS record to parent domain (at registrar)
```

**Step 10: Apply Route 53 Module**
```bash
terraform plan -target=module.route53
terraform apply -target=module.route53
```

### Verification Checklist - Route 53
- [ ] Hosted zone created
- [ ] NS records exist
- [ ] Nameservers updated at registrar
- [ ] DNS propagation complete (use dig/nslookup)
- [ ] A record (Alias) points to ALB
- [ ] AAAA record exists (if using IPv6)
- [ ] Health check created
- [ ] Health check is healthy
- [ ] Query logging enabled
- [ ] DNSSEC signing enabled
- [ ] DS record added to parent domain
- [ ] Can access site via custom domain (https://chess.yourdomain.com)
- [ ] SSL certificate valid (green padlock in browser)

### Validation Commands
```bash
# Check ACM certificate status
aws acm list-certificates --region us-east-1

# Describe ALB
aws elbv2 describe-load-balancers \
  --names chess-platform-alb

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn {target-group-arn}

# Get ALB DNS name
aws elbv2 describe-load-balancers \
  --names chess-platform-alb \
  --query 'LoadBalancers[0].DNSName'

# List Route 53 hosted zones
aws route53 list-hosted-zones

# List records in hosted zone
aws route53 list-resource-record-sets \
  --hosted-zone-id {zone-id}

# Test DNS resolution
dig chess.yourdomain.com

# Test HTTPS
curl -I https://chess.yourdomain.com/health
```

### Common Issues

**Issue:** Certificate stuck in "Pending validation"
**Fix:** Verify DNS CNAME records added correctly, wait up to 30 minutes

**Issue:** ALB targets unhealthy
**Fix:** Check health check path returns 200, verify security groups allow ALB to reach tasks

**Issue:** 504 Gateway Timeout
**Fix:** Health check failing, verify application responds on /health endpoint

**Issue:** DNS not resolving
**Fix:** Verify nameservers updated at registrar, wait for DNS propagation (up to 48 hours)

**Issue:** SSL certificate warning in browser
**Fix:** Verify certificate covers domain (wildcard or specific), check certificate attached to HTTPS listener

**Issue:** HTTP not redirecting to HTTPS
**Fix:** Verify HTTP listener (port 80) has redirect action, not forward action

---

## Phase 6: Monitoring & Alerts

### Overview
Set up CloudWatch dashboards, alarms, and budget alerts for operational visibility.

### Pre-Flight Checklist
- [ ] All infrastructure deployed
- [ ] Application running and healthy
- [ ] SNS topic for alerts decided
- [ ] Email address for notifications

### Implementation Steps

**Step 1: Create Monitoring Module**
```
modules/monitoring/
â”œâ”€â”€ main.tf          (Dashboards, alarms)
â”œâ”€â”€ budgets.tf
â”œâ”€â”€ sns.tf
â”œâ”€â”€ variables.tf
â””â”€â”€ outputs.tf
```

**Step 2: SNS Topic for Alerts**
```
Topic name: chess-platform-alerts
Display name: Chess Platform Alerts
Subscriptions:
- Protocol: email
- Endpoint: your-email@example.com
```

Create and confirm subscription via email

**Step 3: CloudWatch Dashboard**
```
Dashboard name: chess-platform-overview

Widgets:
1. ECS Service Metrics (line graph):
   - CPUUtilization
   - MemoryUtilization
   - DesiredTaskCount
   - RunningTaskCount

2. ALB Metrics (line graph):
   - RequestCount
   - TargetResponseTime
   - HTTPCode_Target_2XX_Count
   - HTTPCode_Target_5XX_Count

3. DynamoDB Metrics (line graph):
   - ConsumedReadCapacityUnits
   - ConsumedWriteCapacityUnits
   - UserErrors
   - SystemErrors

4. ElastiCache Metrics (line graph):
   - CPUUtilization
   - DatabaseMemoryUsagePercentage
   - CurrConnections
   - Evictions

5. NAT Gateway Metrics (line graph):
   - BytesOutToDestination
   - PacketsDropCount

6. Custom Metrics (number):
   - Active rooms
   - Active games
   - WebSocket connections
```

**Step 4: CloudWatch Alarms**

**ECS Alarms:**
```
1. High CPU
   Metric: CPUUtilization
   Threshold: > 80%
   Evaluation: 2 datapoints within 5 minutes
   Action: SNS notification + scale out

2. Critical CPU
   Metric: CPUUtilization
   Threshold: > 95%
   Evaluation: 1 datapoint within 5 minutes
   Action: SNS notification

3. High Memory
   Metric: MemoryUtilization
   Threshold: > 85%
   Evaluation: 2 datapoints within 5 minutes
   Action: SNS notification + scale out

4. Task Count Mismatch
   Metric: RunningTaskCount
   Comparison: < DesiredTaskCount
   Evaluation: 2 datapoints within 10 minutes
   Action: SNS notification
```

**ALB Alarms:**
```
1. High 5xx Errors
   Metric: HTTPCode_Target_5XX_Count
   Threshold: > 10
   Evaluation: 1 datapoint within 5 minutes
   Action: SNS notification (critical)

2. High 4xx Errors
   Metric: HTTPCode_Target_4XX_Count
   Threshold: > 100
   Evaluation: 1 datapoint within 5 minutes
   Action: SNS notification (warning)

3. Unhealthy Targets
   Metric: UnHealthyHostCount
   Threshold: > 0
   Evaluation: 1 datapoint within 2 minutes
   Action: SNS notification (critical)

4. High Response Time
   Metric: TargetResponseTime
   Threshold: > 2 seconds
   Evaluation: 3 datapoints within 5 minutes
   Action: SNS notification (warning)
```

**DynamoDB Alarms:**
```
1. Throttled Requests
   Metric: UserErrors (ThrottledRequests)
   Threshold: > 0
   Evaluation: 1 datapoint within 5 minutes
   Action: SNS notification

2. System Errors
   Metric: SystemErrors
   Threshold: > 0
   Evaluation: 1 datapoint within 5 minutes
   Action: SNS notification (critical)
```

**ElastiCache Alarms:**
```
1. High CPU
   Metric: CPUUtilization
   Threshold: > 90%
   Evaluation: 2 datapoints within 10 minutes
   Action: SNS notification

2. High Memory
   Metric: DatabaseMemoryUsagePercentage
   Threshold: > 95%
   Evaluation: 1 datapoint within 5 minutes
   Action: SNS notification (critical)

3. High Evictions
   Metric: Evictions
   Threshold: > 1000
   Evaluation: 1 datapoint within 5 minutes
   Action: SNS notification
```

**NAT Gateway Alarms:**
```
1. Packet Drops
   Metric: PacketsDropCount
   Threshold: > 100
   Evaluation: 1 datapoint within 5 minutes
   Action: SNS notification
```

**Cost Alarms:**
```
1. Daily Cost
   Metric: EstimatedCharges
   Threshold: > $10
   Evaluation: 1 datapoint within 6 hours
   Action: SNS notification

2. Monthly Forecast
   Metric: EstimatedCharges
   Threshold: > $250
   Evaluation: 1 datapoint within 24 hours
   Action: SNS notification
```

**Step 5: AWS Budgets**
```
Budget name: chess-platform-monthly
Budget type: Cost budget
Period: Monthly
Budgeted amount: $250

Alerts:
1. Actual spend > $200 (80%)
   Action: Email notification

2. Actual spend > $225 (90%)
   Action: Email notification

3. Actual spend > $250 (100%)
   Action: Email notification

4. Forecasted spend > $275
   Action: Email notification
```

**Step 6: Apply Monitoring Module**
```bash
terraform plan -target=module.monitoring
terraform apply -target=module.monitoring
```

**Step 7: Confirm SNS Subscription**
Check email for confirmation link from AWS, click to confirm

### Verification Checklist
- [ ] SNS topic created
- [ ] SNS subscription confirmed via email
- [ ] CloudWatch dashboard created
- [ ] Dashboard shows metrics from all services
- [ ] All CloudWatch alarms created
- [ ] Alarms in OK state (not INSUFFICIENT_DATA)
- [ ] Test alarm triggers notification
- [ ] AWS Budget created
- [ ] Budget alerts configured
- [ ] Can view dashboard in CloudWatch console
- [ ] Can access dashboard on mobile

### Validation Commands
```bash
# List SNS topics
aws sns list-topics

# List subscriptions
aws sns list-subscriptions

# List dashboards
aws cloudwatch list-dashboards

# Get dashboard
aws cloudwatch get-dashboard --dashboard-name chess-platform-overview

# List alarms
aws cloudwatch describe-alarms

# Test alarm (set to ALARM state)
aws cloudwatch set-alarm-state \
  --alarm-name "ECS-High-CPU" \
  --state-value ALARM \
  --state-reason "Testing alarm"

# List budgets
aws budgets describe-budgets --account-id {account-id}
```

### Common Issues

**Issue:** SNS subscription not confirmed
**Fix:** Check spam folder for confirmation email, resend confirmation

**Issue:** Dashboard shows no data
**Fix:** Wait 5-10 minutes for first datapoints, verify resources are running

**Issue:** Alarms stuck in INSUFFICIENT_DATA
**Fix:** Normal for first 5-15 minutes, wait for metric datapoints

**Issue:** No cost data in CloudWatch
**Fix:** Cost metrics update every 6 hours, wait up to 24 hours for first data

**Issue:** Budget not showing forecasted costs
**Fix:** Needs at least 5 days of billing data to generate forecast

---

## Phase 7: Application Deployment & Testing

### Overview
Deploy application code, run end-to-end tests, validate all functionality.

### Pre-Flight Checklist
- [ ] All infrastructure deployed successfully
- [ ] ECR repository has application image
- [ ] ECS tasks running and healthy
- [ ] ALB targets healthy
- [ ] Domain resolves to ALB
- [ ] SSL certificate valid

### Implementation Steps

**Step 1: Application Build Checklist**
- [ ] Application code complete
- [ ] Environment variables configured
- [ ] Secrets integration tested locally
- [ ] Health check endpoint implemented (/health returns 200)
- [ ] WebSocket server implemented
- [ ] Stockfish chess engine integrated
- [ ] Chime SDK integration working
- [ ] Redis connection handling implemented
- [ ] DynamoDB queries tested
- [ ] Cognito authentication implemented
- [ ] Error handling and logging added

**Step 2: Local Testing**
```bash
# Test with docker-compose
docker-compose up

# Verify endpoints
curl http://localhost/health
# Should return: 200 OK

# Test WebSocket connection
# Use wscat or browser DevTools

# Test Redis connection
# Verify reads/writes work

# Test DynamoDB
# Verify user creation, game history writes

# Test Cognito
# Verify sign up, sign in, token validation
```

**Step 3: Build Production Image**
```bash
# Build optimized image
docker build -t chess-platform:production .

# Test production image locally
docker run -p 80:80 \
  -e NODE_ENV=production \
  -e REDIS_ENDPOINT=your-redis-endpoint \
  chess-platform:production

# Verify no errors in logs
docker logs {container-id}
```

**Step 4: Push to ECR**
```bash
# Authenticate
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  {account}.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag chess-platform:production \
  {account}.dkr.ecr.us-east-1.amazonaws.com/chess-platform:v1.0.0

docker tag chess-platform:production \
  {account}.dkr.ecr.us-east-1.amazonaws.com/chess-platform:latest

# Push both tags
docker push {account}.dkr.ecr.us-east-1.amazonaws.com/chess-platform:v1.0.0
docker push {account}.dkr.ecr.us-east-1.amazonaws.com/chess-platform:latest
```

**Step 5: Update ECS Task Definition**
Update task definition to use new image tag (v1.0.0)

**Step 6: Deploy to ECS**
```bash
# Update task definition in Terraform
terraform plan -target=module.ecs
terraform apply -target=module.ecs

# Or force new deployment
aws ecs update-service \
  --cluster chess-platform-cluster \
  --service chess-platform-service \
  --force-new-deployment
```

**Step 7: Monitor Deployment**
```bash
# Watch service events
aws ecs describe-services \
  --cluster chess-platform-cluster \
  --services chess-platform-service \
  --query 'services[0].events[0:5]'

# Watch task status
watch aws ecs list-tasks \
  --cluster chess-platform-cluster \
  --service-name chess-platform-service

# Check task logs
aws logs tail /ecs/chess-platform/application --follow
```

**Step 8: Verify Deployment**
Wait for:
- Old tasks to drain connections (30 seconds)
- New tasks to start and pass health checks
- Targets to register with ALB as healthy
- All tasks showing RUNNING status

### End-to-End Testing Checklist

**Infrastructure Tests:**
- [ ] Can access https://chess.yourdomain.com
- [ ] SSL certificate valid (green padlock)
- [ ] HTTP redirects to HTTPS
- [ ] /health endpoint returns 200
- [ ] Response headers include security headers
- [ ] No public IPs on app tier (check ECS task ENIs)

**User Authentication Tests:**
- [ ] Can access sign-up page
- [ ] Can create new user account
- [ ] Receive verification email
- [ ] Can verify email address
- [ ] Can sign in with email/password
- [ ] Can sign out
- [ ] Can reset password
- [ ] Social login works (Google, Facebook if configured)
- [ ] Invalid credentials rejected
- [ ] Weak passwords rejected

**Room Management Tests:**
- [ ] Can create new room
- [ ] Room code displayed (5 characters, alphanumeric)
- [ ] Can copy room code
- [ ] Second user can join with code
- [ ] Invalid room code shows error
- [ ] Can't join room with 2 players already

**Video Chat Tests:**
- [ ] Video chat starts when both users join
- [ ] Can see own video
- [ ] Can see opponent's video
- [ ] Can mute/unmute audio
- [ ] Can disable/enable video
- [ ] Video quality acceptable
- [ ] Audio quality acceptable
- [ ] Video chat persists during game
- [ ] Video chat ends when user leaves room

**Chess Game Tests:**
- [ ] Can start game from room
- [ ] Board displays correctly
- [ ] Can make legal moves
- [ ] Illegal moves rejected
- [ ] Opponent sees move immediately
- [ ] Turn indicator accurate
- [ ] Timer counts down correctly
- [ ] Time pauses on opponent's turn
- [ ] Can resign game
- [ ] Checkmate detected
- [ ] Stalemate detected
- [ ] Game result saved to history

**Multiple Games Tests:**
- [ ] Can play second game in same room
- [ ] Colors swap for second game
- [ ] Timers reset for new game
- [ ] Video chat continues between games
- [ ] Game history shows multiple games
- [ ] Can play 5+ sequential games

**Disconnection Tests:**
- [ ] Close browser â†’ can rejoin with room code
- [ ] Network disconnect â†’ can reconnect
- [ ] Opponent sees "disconnected" status
- [ ] Timer continues for disconnected player
- [ ] Disconnected player loses on time
- [ ] Room expires after 60 minutes

**Performance Tests:**
- [ ] Page load time < 3 seconds
- [ ] Move response time < 200ms
- [ ] Video latency < 500ms
- [ ] WebSocket reconnection < 5 seconds
- [ ] Can handle 5 concurrent rooms
- [ ] No memory leaks after 1-hour session

**Data Persistence Tests:**
- [ ] Game saved to DynamoDB after completion
- [ ] User stats updated correctly
- [ ] Match history shows all games
- [ ] Can query games by player
- [ ] Room state cleared after expiry

### Load Testing (Optional)
```bash
# Use Apache Bench for simple load test
ab -n 1000 -c 10 https://chess.yourdomain.com/health

# Use artillery for WebSocket testing
artillery quick --count 10 --num 100 wss://chess.yourdomain.com/ws

# Monitor during load:
- CloudWatch ECS metrics
- CloudWatch ALB metrics
- Auto-scaling events
- Task count scaling up/down
```

### Verification Checklist - Complete System
- [ ] All infrastructure tests pass
- [ ] All authentication tests pass
- [ ] All room management tests pass
- [ ] All video chat tests pass
- [ ] All chess game tests pass
- [ ] All disconnection tests pass
- [ ] Performance meets targets
- [ ] No errors in CloudWatch logs
- [ ] No CloudWatch alarms triggered
- [ ] Cost within budget ($10/day max)

### Common Issues

**Issue:** ECS tasks failing to start
**Fix:** Check logs in CloudWatch, verify environment variables, check secrets access

**Issue:** Health checks failing
**Fix:** Verify /health endpoint returns 200, check security groups allow ALB to reach tasks

**Issue:** WebSocket connections failing
**Fix:** Verify ALB supports WebSocket (HTTP/1.1 upgrade), check sticky sessions enabled

**Issue:** Redis connection timeouts
**Fix:** Verify security group allows 6379 from Fargate, check AUTH token correct

**Issue:** Chime SDK meetings fail to create
**Fix:** Verify IAM permissions for CreateMeeting, check Chime SDK quotas not exceeded

**Issue:** Video not working in browser
**Fix:** Check browser permissions for camera/microphone, verify HTTPS (WebRTC requires SSL)

---

## Phase 8: Operations & Maintenance

### Daily Operations Checklist

**Morning Checks (5 minutes):**
- [ ] Check CloudWatch dashboard
- [ ] Review alarm status (all OK?)
- [ ] Check task count matches desired (2+)
- [ ] Verify ALB targets healthy
- [ ] Review yesterday's cost in Cost Explorer
- [ ] Check for any email alerts from SNS

**Weekly Checks (15 minutes):**
- [ ] Review CloudWatch logs for errors
- [ ] Check DynamoDB capacity consumption
- [ ] Review ElastiCache metrics (CPU, memory, evictions)
- [ ] Verify backups are running (ElastiCache snapshots)
- [ ] Check SSL certificate expiry (ACM auto-renews)
- [ ] Review week's cost trends
- [ ] Check for AWS service health issues

**Monthly Checks (30 minutes):**
- [ ] Review full month's costs
- [ ] Analyze cost by service
- [ ] Review and adjust budget if needed
- [ ] Check for unused resources
- [ ] Review security group rules
- [ ] Update application dependencies
- [ ] Test backup restoration
- [ ] Review CloudTrail logs for unusual API calls

### Backup Procedures

**ElastiCache Snapshots:**
```
Automated: Daily at 3 AM UTC
Retention: 7 days
Manual snapshot before major changes:
```
```bash
aws elasticache create-snapshot \
  --replication-group-id chess-platform-redis \
  --snapshot-name chess-platform-manual-$(date +%Y%m%d)
```

**DynamoDB Backups:**
```
Point-in-time recovery: Enabled (automatic)
Manual backup before major changes:
```
```bash
aws dynamodb create-backup \
  --table-name chess-platform-users \
  --backup-name users-manual-$(date +%Y%m%d)

aws dynamodb create-backup \
  --table-name chess-platform-games \
  --backup-name games-manual-$(date +%Y%m%d)
```

**Terraform State Backup:**
```bash
# S3 versioning handles this automatically
# Manual download for safety:
aws s3 cp s3://chess-platform-terraform-state/terraform.tfstate \
  ./backups/terraform-state-$(date +%Y%m%d).tfstate
```

### Disaster Recovery Procedures

**Scenario 1: ECS Tasks Not Starting**
```
1. Check CloudWatch logs: /ecs/chess-platform/application
2. Common causes:
   - Image pull errors â†’ verify ECR permissions
   - Health check failures â†’ verify /health endpoint
   - Resource limits â†’ check task CPU/memory
3. Rollback if needed:
   aws ecs update-service \
     --cluster chess-platform-cluster \
     --service chess-platform-service \
     --task-definition chess-platform-task:{previous-revision}
```

**Scenario 2: ALB Targets Unhealthy**
```
1. Check target health:
   aws elbv2 describe-target-health \
     --target-group-arn {arn}
2. Common causes:
   - Security group blocking traffic
   - Health check path wrong
   - Application not listening on port 80
3. Verify security group allows ALB â†’ Fargate on port 80
```

**Scenario 3: Database Issues**
```
DynamoDB:
1. Check for throttling in CloudWatch
2. If throttled, switch to provisioned capacity temporarily
3. Restore from point-in-time if data corruption:
   aws dynamodb restore-table-to-point-in-time \
     --source-table-name chess-platform-users \
     --target-table-name chess-platform-users-restored \
     --restore-date-time 2025-02-01T10:00:00Z

ElastiCache:
1. Check CPU and memory metrics
2. If node failure, automatic failover to replica
3. Restore from snapshot if needed:
   aws elasticache create-replication-group \
     --replication-group-id chess-platform-redis-restored \
     --snapshot-name chess-platform-manual-20250201
```

**Scenario 4: Complete Region Failure**
```
1. Infrastructure recovery: terraform apply (rebuild from code)
2. Database recovery: Restore DynamoDB from latest backup
3. Redis recovery: Restore from latest snapshot
4. Application deployment: Push latest image to ECR, deploy
5. DNS update: May need to change region in Route 53
Estimated RTO: 30-45 minutes
Estimated RPO: < 24 hours (DynamoDB), < 24 hours (ElastiCache)
```

**Scenario 5: Cost Overrun**
```
1. Check Cost Explorer for unexpected charges
2. Common causes:
   - NAT Gateway data transfer spike
   - Chime SDK meetings not terminated
   - Auto-scaling stuck at high capacity
3. Immediate actions:
   - Scale down ECS service manually
   - Terminate orphaned Chime meetings
   - Review CloudWatch alarms for triggers
```

### Troubleshooting Guide

**Problem: Cannot access website**
```
Diagnostic steps:
1. Test DNS: dig chess.yourdomain.com
   - Should return ALB IPs
2. Test ALB directly: curl {alb-dns-name}
   - If works: DNS issue
   - If fails: ALB or targets issue
3. Check ALB targets: aws elbv2 describe-target-health
4. Check ECS tasks: aws ecs list-tasks
5. Check CloudWatch logs for errors
```

**Problem: WebSocket connections drop**
```
Diagnostic steps:
1. Check ECS task logs for WebSocket errors
2. Verify ALB idle timeout (currently 60s)
3. Check client-side heartbeat implementation
4. Verify sticky sessions enabled on target group
5. Check for task replacement events (deployments)
```

**Problem: Video chat not working**
```
Diagnostic steps:
1. Check browser console for errors
2. Verify HTTPS (WebRTC requires SSL)
3. Check browser permissions (camera/microphone)
4. Verify Chime SDK meeting created (check logs)
5. Test attendee token validity
6. Check IAM permissions for CreateMeeting
```

**Problem: Slow response times**
```
Diagnostic steps:
1. Check ALB TargetResponseTime metric
2. Check ECS CPU/Memory utilization
3. Check Redis CPU and memory
4. Check DynamoDB throttling
5. Review application logs for slow queries
6. Consider scaling up (more tasks or larger instances)
```

### Rollback Procedures

**Application Rollback:**
```bash
# Revert to previous task definition
aws ecs update-service \
  --cluster chess-platform-cluster \
  --service chess-platform-service \
  --task-definition chess-platform-task:{previous-revision} \
  --force-new-deployment

# Monitor rollback
aws ecs describe-services \
  --cluster chess-platform-cluster \
  --services chess-platform-service
```

**Infrastructure Rollback:**
```bash
# Revert Terraform changes
git revert {commit-hash}
terraform plan
terraform apply

# Or restore from previous state
terraform state pull > current-state.tfstate
aws s3 cp s3://chess-platform-terraform-state/terraform.tfstate \
  ./previous-state.tfstate
# Manually restore state if needed
```

---

## Security Hardening Checklist

### Post-Deployment Security Review
- [ ] No EC2 instances have public IPs (app tier in private subnets)
- [ ] Security groups follow least-privilege (only required ports)
- [ ] IAM roles have minimal permissions (no wildcards)
- [ ] Secrets stored in Secrets Manager (not environment variables)
- [ ] SSL/TLS enforced everywhere (ALB HTTPS, Redis encryption)
- [ ] VPC Flow Logs enabled for network monitoring
- [ ] CloudTrail enabled for API audit logging
- [ ] MFA enabled on root account
- [ ] DynamoDB encryption at rest enabled
- [ ] S3 buckets have encryption and versioning
- [ ] No hardcoded credentials in code or Terraform
- [ ] Budget alerts configured to prevent runaway costs
- [ ] Deletion protection enabled on critical resources
- [ ] Security group rules reviewed (no 0.0.0.0/0 except ALB)
- [ ] IAM users have MFA enabled
- [ ] Access keys rotated regularly
- [ ] ECR image scanning enabled
- [ ] VPC endpoints used for AWS services (no NAT for AWS APIs)
- [ ] Application logs don't contain sensitive data
- [ ] HTTPS enforced (HTTP redirects to HTTPS)

### Ongoing Security Tasks

**Weekly:**
- [ ] Review CloudTrail logs for unusual API calls
- [ ] Check for failed authentication attempts in Cognito
- [ ] Review security group changes in AWS Config
- [ ] Scan ECR images for vulnerabilities

**Monthly:**
- [ ] Review IAM permissions (remove unused)
- [ ] Update application dependencies
- [ ] Review VPC Flow Logs for suspicious traffic
- [ ] Test backup restoration
- [ ] Review cost anomalies (potential compromise indicator)

**Quarterly:**
- [ ] Rotate access keys
- [ ] Review and update security group rules
- [ ] Penetration testing (if applicable)
- [ ] Update SSL/TLS policies
- [ ] Review and update disaster recovery procedures

---

## Appendix: Quick Reference Commands

### Terraform
```bash
# Initialize
terraform init

# Plan
terraform plan

# Apply
terraform apply

# Destroy
terraform destroy

# Show outputs
terraform output

# Validate
terraform validate

# Format
terraform fmt -recursive

# Show state
terraform show

# List resources
terraform state list
```

### AWS CLI - ECS
```bash
# List clusters
aws ecs list-clusters

# Describe service
aws ecs describe-services --cluster chess-platform-cluster --services chess-platform-service

# List tasks
aws ecs list-tasks --cluster chess-platform-cluster

# Get task details
aws ecs describe-tasks --cluster chess-platform-cluster --tasks {task-id}

# Update service (force deployment)
aws ecs update-service --cluster chess-platform-cluster --service chess-platform-service --force-new-deployment

# Scale service
aws ecs update-service --cluster chess-platform-cluster --service chess-platform-service --desired-count 4
```

### AWS CLI - Logs
```bash
# Tail logs
aws logs tail /ecs/chess-platform/application --follow

# Get log events
aws logs get-log-events --log-group-name /ecs/chess-platform/application --log-stream-name {stream}

# Search logs
aws logs filter-log-events --log-group-name /ecs/chess-platform/application --filter-pattern "ERROR"
```

### AWS CLI - ALB
```bash
# Describe load balancer
aws elbv2 describe-load-balancers --names chess-platform-alb

# Check target health
aws elbv2 describe-target-health --target-group-arn {arn}

# Get ALB DNS
aws elbv2 describe-load-balancers --names chess-platform-alb --query 'LoadBalancers[0].DNSName'
```

### AWS CLI - DynamoDB
```bash
# Scan table
aws dynamodb scan --table-name chess-platform-users --max-items 10

# Get item
aws dynamodb get-item --table-name chess-platform-users --key '{"user_id":{"S":"user123"}}'

# Query by GSI
aws dynamodb query --table-name chess-platform-users --index-name username-index --key-condition-expression "username = :u" --expression-attribute-values '{":u":{"S":"testuser"}}'
```

### AWS CLI - ElastiCache
```bash
# Describe cluster
aws elasticache describe-replication-groups --replication-group-id chess-platform-redis

# Get endpoint
aws elasticache describe-replication-groups --replication-group-id chess-platform-redis --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint'

# List snapshots
aws elasticache describe-snapshots --replication-group-id chess-platform-redis
```

### Docker
```bash
# Build
docker build -t chess-platform:latest .

# Run locally
docker run -p 80:80 chess-platform:latest

# ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin {account}.dkr.ecr.us-east-1.amazonaws.com

# Push to ECR
docker tag chess-platform:latest {account}.dkr.ecr.us-east-1.amazonaws.com/chess-platform:latest
docker push {account}.dkr.ecr.us-east-1.amazonaws.com/chess-platform:latest
```

---

## Document Maintenance

**Last Updated:** Initial version
**Next Review:** After first deployment
**Owner:** Tim
**Feedback:** Document issues and improvements as you implement