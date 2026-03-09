# Handover: Codex -> Claude
Date: 2026-03-10
PR: (to be created) — fix merge deploy workflow IAM permissions
Branch merged: codex/fix-merge-workflow

## State of main after this merge

- AWS/Terraform change applied in this block:
  - GitHub deploy role policy updated to allow static auth publish + CloudFront invalidation.
- No GitHub repository variable changes in this block.

## What was done in this block

- Investigated repeated failures in `Deploy Main to ECS` merge workflow.
- Identified root cause from failed run logs:
  - `Publish static auth site` failed with `AccessDenied` on `s3:ListBucket` for static bucket.
- Implemented Terraform fix:
  - Added optional static edge inputs to `github_actions_oidc` module:
    - `static_site_bucket_name`
    - `static_cloudfront_distribution_id`
  - Extended deploy role IAM policy with least-privilege static publish permissions:
    - `s3:ListBucket` on static bucket ARN,
    - `s3:GetObject|PutObject|DeleteObject` on static bucket objects,
    - `cloudfront:CreateInvalidation` on static distribution ARN.
  - Wired module inputs from root:
    - `module.static_edge.bucket_name`
    - `module.static_edge.cloudfront_distribution_id`
- Applied targeted IAM policy change in AWS:
  - `terraform -chdir=terraform apply -auto-approve -var-file=environments/dev/terraform.tfvars -target=module.github_actions_oidc.aws_iam_role_policy.deploy_permissions`
  - Result: `0 added, 1 changed, 0 destroyed`
- Validation:
  - Re-ran failed deploy workflow run `22880168029`; rerun completed `success`.

## Hard constraints carried forward

No changes to constraints — see `DOCS/SPLIT_HOST_STAGE_HANDOVER_GUIDE.md`.

## What comes next

- Next recommended block: restore full frontend coverage checks.
- Branch: `codex/stage-6-frontend-coverage-reenable`.
- Scope:
  - fix `RoomPage` coverage hang path,
  - remove temporary coverage exclusion from PR workflow,
  - confirm `frontend-quality` remains green.

## Anything the next agent must do first

1. `git fetch origin`
2. `git checkout main`
3. `git pull --ff-only origin main`
4. Confirm deploy workflow remains healthy on next merge.

## Known issues / watch-outs

- Full non-targeted `terraform plan` still shows pre-existing Cognito Google provider drift unrelated to this hotfix.
- Local untracked `.claude/` directory remains present and is intentionally excluded from commits.
