# CHESSCHAT App Layer (MVP)

This directory contains the application code that replaces the bootstrap ECS image.

## Structure
- `backend/`: Node.js API + WebSocket server + static asset hosting
- `frontend/`: React/Vite client for auth, lobby, and room flow

## MVP routes
- `/`: app-host entry (redirects unauthenticated users to apex auth host)
- `/lobby`: start/join room using one 5-character code field
- `/room/:code`: video + chess room

## Runtime notes
- Health check endpoint is `GET /healthz` on port `8080`.
- WebSocket endpoint is `/ws`.
- Redis auth token is injected through ECS secrets.
- Game persistence uses DynamoDB transactions.
- Chime frontend media wiring is active:
  - Backend emits `video_ready` with Chime meeting/attendee payload.
  - Frontend Room page initializes a Chime session on explicit "Join Media".
  - Local/remote video tiles and mic/camera controls are wired through `amazon-chime-sdk-js`.
