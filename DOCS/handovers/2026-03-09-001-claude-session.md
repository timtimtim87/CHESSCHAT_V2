# Handover: Claude Code Session
Date: 2026-03-09
PRs: #14, #15 — stage-2: static auth frontend on apex + Google IdP Terraform
Branches merged: codex/stage-2-static-auth

---

## State of main after this merge

### AWS (live)
- Google Cognito IdP: **created and active** (`us-east-1_AWq14lBGV:Google`)
- Cognito app client `5numi4223d3jnebrlfqboseu42` now has `supported_identity_providers = ["COGNITO", "Google"]`
- Terraform apply result: `1 added, 1 changed, 0 destroyed`
- No ECS task definition change — static deploy only

### GitHub Actions variables (confirmed correct)
| Variable | Value |
|----------|-------|
| `STATIC_SITE_BUCKET` | `chesschat-dev-static-c384ca` |
| `STATIC_CLOUDFRONT_DISTRIBUTION_ID` | `E2W7Q7MB7N2WFT` |
| `COGNITO_USER_POOL_ID` | `us-east-1_AWq14lBGV` |
| `COGNITO_CLIENT_ID` | `5numi4223d3jnebrlfqboseu42` |
| `COGNITO_HOSTED_UI_BASE_URL` | `https://chesschat-dev-6c96bb.auth.us-east-1.amazoncognito.com` |
| `APP_HOST` | `https://app.chess-chat.com` |

### AWS Secrets Manager
- `chesschat/dev/google/oauth` — contains `client_id` and `client_secret` as named JSON fields.
  Tagged: `Project: chesschat, Environment: dev, ManagedBy: terraform`. Rotation: disabled.

### Email
- ImprovMX configured on `chess-chat.com`: `hello@chess-chat.com` forwards to Tim's personal Gmail.
  MX and SPF records live in Route 53. Not Terraform-managed (intentional).

---

## What was done in this block

### Code changes
- `app/static-auth/app.js` — added username format hint (`<small>` below field) and client-side
  pre-flight validation against `^[a-z0-9._-]{3,24}$` before calling Cognito `SignUp`. Added
  `autocomplete="username"` to the input. This is the only application code change in Stage 2 —
  everything else in the static auth frontend was already complete.

### Terraform changes
- `terraform/main.tf` — added `data "aws_secretsmanager_secret"` and
  `data "aws_secretsmanager_secret_version"` blocks (count-gated on `cognito_enable_google_identity_provider`).
  Added locals to resolve `google_client_id` and `google_client_secret` from Secrets Manager at
  plan time. Updated cognito module block to use locals instead of raw vars.
- `terraform/environments/dev/terraform.tfvars` — flipped `cognito_enable_google_identity_provider`
  from `false` to `true`.

### Documentation changes (this PR)
- `AGENTS.md` — rewritten to cover the two-agent model, naming conventions, git workflow,
  consistency checklist, and handover rule. Both Claude Code and Codex must follow it.
- `DOCS/AGENT_HANDOVER_PROTOCOL.md` — new file defining the handover format and process.
- `DOCS/handovers/` — new directory. This file is the first entry.
- `DOCS/README.md` — updated to surface `AGENT_HANDOVER_PROTOCOL.md` and `handovers/` first.

### What was confirmed already working (not changed)
- All 7 static auth routes, cookie helpers, deploy workflow, CloudFront no-cache, pending room
  flow, Google OAuth Hosted UI redirect — all functional before this stage, no changes needed.
- Rematch protocol: does not exist in codebase — nothing was removed.
- `/api/public-config`: does not exist in current backend — nothing was removed.

---

## Hard constraints carried forward

From `DOCS/SPLIT_HOST_STAGE_HANDOVER_GUIDE.md` — no changes to these:

1. **Stage 4 teardown order is non-negotiable:**
   - Set terminal state → atomically delete Redis state + write tombstone → delete Chime (retry/log)
   - Tombstone is NEVER written after the Chime delete path
   - Tombstone TTL: 30 days (2592000 seconds)

2. **WebSocket reconnect must be strict:** token + same user sub + active grace window. All three required.

3. **Username regex** is `^[a-z0-9._-]{3,24}$` — consistent in `dynamodb.js` and `LobbyPage.jsx`. Do not change.

4. **Stage execution order:** Stage 3 must merge before Stage 4 starts. Stage 5 can run in
   parallel with Stage 4 only after Stage 3 is merged.

---

## What comes next

### Next stage: Stage 3 — App host auth bootstrap + room handoff
Branch: `codex/stage-3-app-auth-bootstrap`
Depends on: Stage 2 merged to `main` ✅

**The genuine gap in Stage 3 is token refresh before WebSocket reconnect.**

Cognito access tokens expire after 1 hour. `socket.js` stores a static token at construction —
if it expires mid-session, the next reconnect gets `4001 Unauthorized` and stops permanently.

Files to change:

**1. `app/frontend/src/context/AuthContext.jsx`** — Add async `getValidToken()`:
- Read `cc_session` cookie via existing `readSessionCookie()`
- Check `saved_at + expires_in * 1000 < Date.now() + 60_000` (60s buffer)
- If stale: POST to `https://cognito-idp.us-east-1.amazonaws.com/` with
  `AuthFlow: REFRESH_TOKEN_AUTH`, `AuthParameters: { REFRESH_TOKEN: session.refresh_token, CLIENT_ID: config.clientId }`
- On success: rewrite `cc_session` cookie with new tokens (preserve `refresh_token` from old cookie —
  Cognito does not return a new refresh token on refresh)
- Return fresh `access_token`
- Export `getValidToken` in context value

**2. `app/frontend/src/services/socket.js`** — Accept `getToken` callback instead of static `token`:
- Constructor: replace `this.token = token` with `this.getToken = getToken`
- Make `connect()` async: `const token = await this.getToken();` then use it in the WS URL

**3. `app/frontend/src/pages/RoomPage.jsx`** — Wire it up:
- Destructure `getValidToken` from `useAuth()`
- Pass `getToken: getValidToken` to `ChessChatSocket` constructor

No backend changes needed for Stage 3.

Validation required:
- `cc_pending_room` consumed exactly once — reload does not re-route
- WS connect with no `cc_session` cookie → `4001`, stops retrying
- Token near-expiry → refresh triggered, reconnect succeeds
- No `/api/public-config` calls in browser network tab

### After Stage 3: Stage 4 — Backend/WebSocket room lifecycle
Branch: `codex/stage-4-room-lifecycle`

**One targeted fix in `handler.js`:**
`finalizeRoomTeardown` currently calls `deleteRoom` and then (after Chime delete) calls
`markRoomCodeConsumed` — two separate operations. The constraint requires they be atomic AND
tombstone must be written BEFORE Chime is deleted.

Fix: replace both calls with a single call to `teardownRoomAndConsumeCode(roomCode, ttl)` (already
exists in `redis.js`), moved to BEFORE the Chime delete block. Update the import list accordingly.

### After Stage 3 (parallel with Stage 4): Stage 5 — Username policy + docs/ADRs
Branch: `codex/stage-5-username-docs`

Documentation-only. No code changes needed (regex and DynamoDB rename transaction already correct).
Update: `DOCS/PORTFOLIO_BUILD_PLAYBOOK.md`, `DOCS/UI_DESIGN_GUIDE.md`, `infra/RESOURCE_REGISTRY.md`,
`portfolio diary/2026-03-09.md`.

### Tracking & Marketing (pending Tim's manual steps)

Still needed from Tim (in order):
1. Google Search Console — add `chess-chat.com` + `app.chess-chat.com`, add DNS TXT records in Route 53, verify
2. GA4 — create property, get Measurement ID (`G-XXXXXXXXXX`)
3. GTM — create container (`GTM-XXXXXXX`), configure GA4 + Meta Pixel tags, publish
4. Meta Pixel — create pixel, get Pixel ID + domain verification code

Once Tim has all IDs, Claude Code implements:
- GTM snippet inline in `app/static-auth/index.html` (head + body, must be inline not a separate file)
- Cookie consent banner in `app/static-auth/app.js` (gates GTM; sets `cc_cookie_consent` cookie on accept)
- Meta domain verification meta tag in `app/static-auth/index.html`
- `sitemap.xml` and `robots.txt` in `app/static-auth/`
- Privacy policy placeholder page (`/privacy` route) in `app/static-auth/app.js`
- `GTM_CONTAINER_ID` added to deploy workflow and `config.js` template

---

## Anything the next agent must do first

1. `git checkout main && git pull origin main`
2. `gh pr list` — confirm no open PRs in flight
3. `gh variable list` — confirm all 9 repo variables are correct
4. Confirm PR #14 and #15 are both merged and branch `codex/stage-2-static-auth` is deleted

---

## Known issues / watch-outs

- **Google OAuth not yet manually validated** — the "Continue with Google" button is wired end-to-end
  but has not been tested in the live environment. Should be validated before Stage 3 begins.
- **Google Search Console not yet verified** — Tim needs to complete the DNS TXT record step. Until
  verified, `chess-chat.com` may not be available as an authorised domain on the OAuth consent screen
  for production use, though the Cognito IdP itself is live.
- **DynamoDB deprecation warnings in Terraform** (`hash_key is deprecated`) — pre-existing, non-blocking.
- **Two-agent AGENTS.md note** — Codex previously had its own version of `AGENTS.md` on `main` (the
  original single-agent version). This PR overwrites it with the two-agent version. If Codex starts a
  session and reads the old AGENTS.md from its context cache, it will be stale — always re-read from disk.
