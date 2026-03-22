# UI Preview Guide

## Purpose
`/ui-preview/*` is a local UI sandbox for fast design and UX iteration.
It is intentionally backend-independent and does not validate real auth, websocket, or game infrastructure.

## Non-Negotiable Rule
Default to preview-only changes.
Do not modify real app screens/routes/behavior unless explicitly requested by the user.

## Start Local Server
```bash
npm --prefix app/frontend run dev
```

Default URL:
- `http://localhost:5173/ui-preview/landing`

## Current Preview Flow
1. `Landing` -> `/ui-preview/landing`
2. `Sign Up` -> `/ui-preview/register`
3. `Continue` -> `/ui-preview/confirm`
4. `OK` -> `/ui-preview/game` (default destination)

Fast sign-in path:
- `Sign In` from landing -> `/ui-preview/game`

Primary app surface is now the `Game` screen.
The older lobby-style preview page is not used as the main experience.

## Preview Routes
- `/ui-preview/landing`
- `/ui-preview/register`
- `/ui-preview/confirm`
- `/ui-preview/play`
- `/ui-preview/game`
- `/ui-preview/profile`
- `/ui-preview/friends`
- `/ui-preview/history`

Compatibility aliases:
- `/ui-preview/lobby` -> `/ui-preview/play`
- `/ui-preview/play` -> `/ui-preview/game`
- `/ui-preview/room` -> `/ui-preview/game`

## Auth + Session Behavior (Preview Only)
- Uses `sessionStorage` (`chesschat_ui_preview_session_v1`).
- Tab-scoped persistence: refresh survives, closing tab resets.
- Protected preview pages redirect to `/ui-preview/landing` when not mock-authenticated.
- Reset action exists in preview shell (side nav + settings dropdown).
- Notifications and settings dropdowns are mutually exclusive (only one open at a time).

## What Is Mocked
- Friends list and online/offline state.
- Notifications dropdown with mock challenge `Accept/Reject`.
- Quick settings dropdown with local toggles.
- Game room visuals, quick invite field, and mock room state.
- Game actions include `Takeback` button placeholder.
- Game setup modal mock includes:
  - per-player time controls
  - allow/deny takebacks
  - takebacks-per-player counts
- Friends hub includes `Pending Friend Requests` and `Invite Friends` tiles.
- History includes `View Board + Moves` review actions and a Stockfish evaluation placeholder.

## Future Feature Notes (Captured in Preview)
- Pre-game setup should appear when a friend connection starts, before first move.
- Takebacks are intended to be allowed only before opponent replies (policy to enforce in real app logic).
- History review should evolve from placeholder to full board replay + engine timeline.

## File Map (Preview Layer)
- Routing: `app/frontend/src/App.jsx` (`/ui-preview/*` routes + guards)
- State: `app/frontend/src/preview/previewSession.js`
- Context: `app/frontend/src/preview/PreviewContext.jsx`
- Shell: `app/frontend/src/preview/PreviewChrome.jsx`
- Pages:
  - `app/frontend/src/preview/pages/PreviewLandingPage.jsx`
  - `app/frontend/src/preview/pages/PreviewRegisterPage.jsx`
  - `app/frontend/src/preview/pages/PreviewConfirmPage.jsx`
  - `app/frontend/src/preview/pages/PreviewGamePage.jsx`
  - `app/frontend/src/preview/pages/PreviewFriendsPage.jsx`
  - `app/frontend/src/preview/pages/PreviewProfilePage.jsx`
  - `app/frontend/src/preview/pages/PreviewHistoryPage.jsx`
- Styling additions: `app/frontend/src/styles.css` (preview dropdowns/board sizing)
- Tests: `app/frontend/src/App.preview.test.jsx`

## Real App Safety Boundary
Real app routes remain separate and still use real auth/backend:
- `/lobby`, `/profile`, `/friends`, `/history`, `/room/:code`

Preview mode must not be used as evidence that production integrations are working.
