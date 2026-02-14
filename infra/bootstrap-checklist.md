# Bootstrap Checklist (CHESSCHAT_V2)

Date initialized: 2026-02-14

## 0) Account Guardrails
- [ ] Root MFA enabled
- [ ] Billing alerts configured
- [ ] Cost allocation tag `Project` activated in Billing
- [ ] CloudTrail enabled
- [ ] AWS Config enabled
- [ ] GuardDuty enabled

## 1) CLI Authentication
- [ ] Profile configured: `CHESSCHAT_IAM_USER`
- [ ] `aws sts get-caller-identity` returns account `723580627470`
- [ ] Environment variables set: `AWS_PROFILE`, `AWS_REGION`, `AWS_DEFAULT_REGION`

## 2) Terraform Backend
- [ ] S3 bucket created for Terraform state
- [ ] S3 bucket: versioning enabled
- [ ] S3 bucket: encryption enabled
- [ ] S3 bucket: block public access enabled
- [ ] DynamoDB table created for state lock (`LockID`)
- [ ] DynamoDB deletion protection enabled
- [ ] `terraform init -reconfigure` succeeds

## 3) Tracking and Registry
- [ ] Update `infra/RESOURCE_REGISTRY.md` with exact names + ARNs
- [ ] Put bootstrap values in SSM Parameter Store
- [ ] Confirm all created resources have `Project=chesschat`

## 4) First Infrastructure Phase
- [ ] VPC module implementation begins
- [ ] VPC outputs map to SSM parameters
- [ ] Plan/apply runbook documented
