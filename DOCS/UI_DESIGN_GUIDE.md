# CHESSCHAT UI Design Guide (MVP)

Purpose: define a clear, minimal, decision-complete UI direction for CHESSCHAT game screens, lobby, and auth flow so design changes remain consistent and interview-ready.

Last updated: 2026-03-05

## 1) Design Principles
- Keep the UI simple, minimal, and clear.
- Chessboard is the primary surface; video is secondary but always visible.
- Prioritize state legibility over visual effects.
- Keep controls consistent across desktop and mobile.
- Avoid unnecessary UI complexity; every component should have gameplay or communication value.

## 2) Visual Direction (Based on Current Mockups)
- Theme:
  - Indigo/blue gradient environment with high-contrast content surfaces.
  - Soft glass-like cards and rounded corners.
- Style goals:
  - Premium but lightweight.
  - Calm and focused during gameplay.
  - Strong visual hierarchy with limited color vocabulary.

### 2.1 Color System (MVP)
- Use a constrained token set:
  - `--color-bg-start`: deep indigo
  - `--color-bg-end`: blue-indigo highlight
  - `--color-surface`: translucent panel background
  - `--color-text-primary`: near-white for dark areas
  - `--color-text-secondary`: muted light text
  - `--color-accent`: active button/highlight accent
  - `--color-danger`: resign/error/destructive action
  - `--color-success`: stable/connected confirmations
- Rules:
  - Accent only for primary actions and active gameplay indicators.
  - Danger only for destructive actions and critical failures.
  - Do not add extra semantic colors in MVP unless tied to a new state.

### 2.2 Typography (MVP)
- Single type family across app.
- Three-level scale:
  - `Display/Title`: room title, key headers
  - `Body`: default labels and content
  - `Meta`: clocks, reconnect subtitles, helper text
- Keep turn/clocks/status more prominent than secondary metadata.

## 3) Layout Baseline

### 3.1 Desktop Game Layout
- Structure: `left video tile | center board | right video tile`.
- Keep board as dominant focal area.
- Place `Return to Lobby` top-left.
- Turn indicator above board.
- Player clocks anchored near board edges.
- Mic/camera controls stay close to each player tile.

### 3.2 Mobile Game Layout
- Vertical stack:
  1. Top bar (`Return to Lobby`)
  2. Turn/status line
  3. Board (largest section)
  4. Clock row
  5. Video tiles
  6. Media controls
- Keep board full width and stable (no layout jumping between states).

### 3.3 Component Priority
- Primary: board + turn + clocks.
- Secondary: video tiles + mic/camera states.
- Tertiary: reconnect/system messaging.

## 4) Motion and Background Effects

### 4.1 Lava-Lamp Gradient Background (Approved Direction)
- A slow-moving blurry indigo/blue gradient background is allowed and preferred.
- Implementation guidance:
  - Use 2-4 blurred gradient blobs in a fixed background layer.
  - Animate only `transform` and optional `opacity`.
  - Long, subtle loops (`20s-40s`) with low amplitude movement.
  - Keep content on semi-opaque surfaces for readability.

### 4.2 Performance and Accessibility Constraints
- Respect `prefers-reduced-motion` and disable/reduce background animation.
- Use fewer/lighter blobs on mobile to reduce battery/GPU load.
- Do not animate gameplay-critical components unnecessarily.
- Avoid visual noise while user is making moves.

## 5) MVP Screen Inventory

### 5.1 Auth
- Register page (basic form).
- Login page (basic form).
- Keep forms minimal and clear.

### 5.2 Lobby
- Very basic control screen:
  - Start New Room
  - Join Room (room code)
  - Optional Resume Last Room
  - Logout
- No heavy dashboards for MVP; prioritize fast entry to game room.

### 5.3 Game Room
- Board + clocks + turn + video + media controls.
- Reconnect and game-result states handled clearly.

## 6) MVP Button and Control Requirements

### 6.1 Game Room Buttons
- `Return to Lobby`
- `Join Media`
- `Mute / Unmute Mic`
- `Camera On / Off`
- `Start Game`
- `Resign` (must confirm)
- `Request Rematch`
- `Accept Rematch`
- `Decline Rematch`
- `Dismiss/Close` modal actions

### 6.2 Lobby Buttons
- `Start New Room`
- `Join Room`
- `Resume Last Room` (optional)
- `Logout`

### 6.3 Auth Buttons
- `Register` / `Create Account`
- `Log In`
- `Submit/Continue`
- Optional `Forgot Password`

## 7) State Visibility Requirements
- User must always be able to answer:
  - Whose turn is it?
  - What are both clocks?
  - Is media connected?
  - Is mic/camera currently on/off?
  - Is opponent connected/disconnected?
  - What action is available now?
- Reconnect states:
  - Paused
  - Restored
  - Timeout/forfeit outcome
- Error hierarchy:
  - Blocking errors: banners/modals
  - Transient errors: toast/status line

## 8) Interaction and Safety Rules
- Destructive actions (`Resign`, `Leave`) require confirmation.
- Keep actionable buttons disabled when invalid for current state.
- Keep button labels explicit (avoid icon-only critical actions in MVP).
- Maintain stable button position to build user muscle memory.

## 9) Accessibility and Usability Baseline
- Minimum touch target ~44px.
- Strong color contrast on gradient background.
- Do not rely on color alone for mic/cam or reconnect state (include text/icon).
- Keep keyboard focus visible for desktop.

## 10) Human Playtest Focus
- Validate:
  - Time to join room and start game
  - Mic/camera control clarity
  - Reconnect state understanding
  - Rematch flow clarity
- Capture for each session:
  - Confusing moments
  - Misclicks/wrong-button presses
  - Missing state information
  - Suggested copy/label changes

## 11) Design Decision Log Process (Required)
- For each substantial design/UI decision:
  1. Update this file (`DOCS/UI_DESIGN_GUIDE.md`) with the decision and rationale.
  2. Update `DOCS/PORTFOLIO_BUILD_PLAYBOOK.md` with strategy-level impact.
  3. Add a dated portfolio diary entry in `portfolio diary/YYYY-MM-DD.md`.
- Decision template:
  - `Decision`
  - `Alternatives considered`
  - `Why chosen`
  - `Tradeoffs / risks`
  - `Validation plan (manual + automated)`

## 12) UI Implementation Log (2026-03-07)

### Decision
- Implemented a desktop-first visual overhaul across room/lobby/landing with a tokenized design system and a room-first gameplay layout that mirrors the approved mockup composition.

### What changed
- Layout:
  - Room page restructured to `Return to Lobby` command bar, status strip, and desktop 3-column gameplay stage (`left player tile | board center | right player tile`).
  - Mobile/tablet fallback uses vertical stacking while preserving action reachability.
- Controls:
  - Media controls now live with the local player tile through `MediaControlRow`.
  - Game actions (`Start Game`, `Resign`, `Request/Accept/Decline Rematch`) grouped in a stable action row below board clocks.
- Visual system:
  - Added global CSS tokens for color, spacing, radii, shadows, typography, and motion.
  - Added slow animated indigo gradient blobs with `prefers-reduced-motion` support.
  - Added reusable surface/button/status primitives (`surface-glass`, `button-*`, status dots).
- Component behavior:
  - `VideoPanel` rebuilt into composable pieces (`PlayerVideoCard`, `MediaControlRow`) while preserving existing room/media logic in `RoomPage`.
  - `ChessBoardPanel` behavior preserved (orientation, draggability, legal move highlighting).

### Why chosen
- Prioritizes the board as the gameplay focal point while keeping media visibly present.
- Keeps the first high-polish pass focused on desktop where current validation priority is highest.
- Improves consistency and maintainability by moving from one-off styles to reusable design tokens and primitives.

### Tradeoffs / risks
- Remote mic/camera state is not yet represented as independent real-time indicators; the current pass focuses on local media control clarity and overall layout hierarchy.
- Bundle size warning remains from existing dependency footprint (`amazon-chime-sdk-js` path), unchanged by this UI pass.

### Validation method
- Automated:
  - `npm --prefix app/frontend run test` passed.
  - `npm --prefix app/frontend run build` passed.
- Manual playtest target for next loop:
  - Desktop hierarchy clarity (turn + clocks + board), media-control discoverability, reconnect/rematch state comprehension, and mobile smoke usability.
