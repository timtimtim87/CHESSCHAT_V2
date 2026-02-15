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
- [ ] Profile configured: `default` maps to IAM user `CHESSCHAT_IAM_USER`
- [ ] Optional named profile present: `CHESSCHAT_IAM_USER`
- [ ] `aws sts get-caller-identity` returns account `723580627470`
- [ ] `AWS_PROFILE` is unset (unless intentionally overriding for one command)
- [ ] Region variables set: `AWS_REGION=us-east-1`, `AWS_DEFAULT_REGION=us-east-1`

## 2) Terraform Backend
- [ ] S3 bucket created for Terraform state
- [ ] S3 bucket: versioning enabled
- [ ] S3 bucket: encryption enabled
- [ ] S3 bucket: block public access enabled
- [ ] Backend lock strategy set to `use_lockfile = true` in `terraform/backend.tf`
- [ ] (Legacy) DynamoDB lock table tracked if retained: `chesschat-tfstate-locks`
- [ ] `terraform init -reconfigure` succeeds

## 3) Tracking and Registry
- [ ] Update `infra/RESOURCE_REGISTRY.md` with exact names + ARNs
- [ ] Put bootstrap values in SSM Parameter Store
- [ ] Confirm all created resources have `Project=chesschat`

## 4) First Infrastructure Phase
- [ ] VPC module implementation begins
- [ ] VPC outputs map to SSM parameters
- [ ] Plan/apply runbook documented
