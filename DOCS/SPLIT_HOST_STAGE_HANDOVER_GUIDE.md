# Split-Host Program Handover Guide (Post-Stage 1)

Date: 2026-03-09
Owner handoff: after Stage 1 completion

## Current state (done)
- Stage 1 is complete and applied in AWS.
- Apex/static target:
  - CloudFront: `E2W7Q7MB7N2WFT`
  - Domain: `do3ezcm5l4dpu.cloudfront.net`
  - Bucket: `chesschat-dev-static-c384ca`
- App target:
  - ALB DNS: `chesschat-dev-alb-251000663.us-east-1.elb.amazonaws.com`
  - App host: `app.chess-chat.com`
- Cognito:
  - User pool: `us-east-1_AWq14lBGV`
  - Client: `5numi4223d3jnebrlfqboseu42`
  - Hosted UI base URL: `https://chesschat-dev-6c96bb.auth.us-east-1.amazoncognito.com`
- GitHub repo vars now present:
  - `STATIC_SITE_BUCKET`
  - `STATIC_CLOUDFRONT_DISTRIBUTION_ID`
  - `COGNITO_HOSTED_UI_BASE_URL`
  - `APP_HOST`

## Execution order (locked)
1. Stage 2 (static auth frontend on apex)
2. Stage 3 (app host auth bootstrap + pending room handoff)
3. Stage 4 (backend/WebSocket phone-call lifecycle)
4. Stage 5 (username policy + docs/ADRs) can run in parallel with Stage 4 only after Stage 3 is merged

Do not run Stages 1/2/3/4 in parallel.

## Hard constraints to preserve
- Stage 4 teardown ordering correction:
  1. Gate terminal state (block new joins)
  2. Atomically delete Redis room state and persist tombstone
  3. Delete Chime meeting (retry/log if needed)
  - Never write tombstone after Chime delete path.
- Tombstone TTL default remains `30 days` (`2592000` seconds).
- WebSocket reconnect acceptance must remain strict: token + same user + active grace/version.
- Contract breaks must stay explicit:
  - rematch protocol removed
  - username regex changes to `^[a-z0-9._-]{3,24}$`

## Stage 2 implementation checklist
- Build/serve static auth frontend from `app/static-auth` on apex.
- Routes required:
  - `/`
  - `/login`
  - `/signup`
  - `/verify-email`
  - `/forgot-password`
  - `/reset-password`
  - `/auth/callback`
- Implement Cognito browser API flows + Google OAuth callback handling.
- Implement cookie contract on `.chess-chat.com`:
  - `cc_session` (v1 JS-managed)
  - `cc_pending_room` (`Max-Age` 300-600s, `Secure`, `SameSite=Lax`, `Path=/`)
- Validate deploy workflow uploads and invalidation:
  - static files to S3 (cacheable)
  - `config.js` with `no-store`
  - CloudFront invalidation

Validation:
- Email signup/login/verify/reset round-trip on `https://chess-chat.com`
- Google OAuth round-trip lands at `/auth/callback` on apex
- No stale cache behavior on auth routes

## Stage 3 implementation checklist
- On `app.chess-chat.com`, bootstrap auth from shared cookie/session handoff.
- On app load:
  - consume `cc_pending_room` exactly once
  - route to `/room/:code`
  - clear cookie immediately
- Remove backend `/api/public-config` as primary auth bootstrap dependency.
- Keep WebSocket token in every connect/reconnect handshake.

Validation:
- Pending-room cookie is one-time consumed
- Reload does not replay stale pending room
- WS reconnect attempts without valid token are rejected

## Stage 4 implementation checklist
- Enforce ephemeral room lifecycle:
  - single-use room codes
  - tombstone key pattern: `room_consumed:<CODE>`
  - recreate same code must fail while tombstone exists
- Reconnect behavior:
  - default grace `12s`
  - only same authenticated user can reclaim slot
  - enforce reconnect version/deadline monotonicity
- Remove rematch events and related UI/backend protocol paths.

Validation:
- reconnect within grace by same user succeeds
- reconnect by different user fails
- grace expiry triggers teardown and code invalidation
- Chime delete failure path logs/retries without room resurrection

## Stage 5 implementation checklist
- Username regex policy to `^[a-z0-9._-]{3,24}$` across backend/frontend validation.
- Keep DynamoDB rename path transactional and release old reservation in same transaction path.
- Update docs:
  - `DOCS/PORTFOLIO_BUILD_PLAYBOOK.md`
  - `DOCS/UI_DESIGN_GUIDE.md`
  - `infra/RESOURCE_REGISTRY.md`
  - `portfolio diary/YYYY-MM-DD.md`
- Add ADRs:
  - split-host architecture
  - JS cookie v1 risk acceptance
  - phone-call room lifecycle
  - Apple defer rationale

## PR workflow per stage
1. Create branch `codex/<stage-topic>`
2. Implement stage-only scope
3. Run validation for touched surfaces
4. Commit with stage-scoped message
5. Push branch
6. Open PR to `main` with validation evidence

## ARN/ID update checklist per stage
- After each Terraform apply, run:
  - `terraform -chdir=terraform output -json`
  - `terraform -chdir=terraform state list`
- Update `infra/RESOURCE_REGISTRY.md` with changed values:
  - CloudFront distribution IDs/domains
  - ACM certificate ARNs
  - Route53 record ownership/targets
  - ECS task definition revision if runtime env changed
- If deploy workflow inputs changed, update repo variables via:
  - `gh variable set <NAME> --body '<value>'`
  - `gh variable list` for verification
