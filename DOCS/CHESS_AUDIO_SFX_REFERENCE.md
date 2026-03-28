# Chess-Chat Audio SFX Reference

Purpose: practical standards for creating, exporting, and integrating chess move sounds for Chess-Chat.

## 1) Source Of Truth (Master Files)
- Keep editable masters as `WAV`, `24-bit`, `48 kHz`.
- Store masters separately from runtime assets (e.g. local DAW folder / `.local/`).
- Never re-export from compressed assets (`mp3/ogg/aac`).

## 2) Runtime Delivery Formats
- Primary web/app SFX format: `OGG (Opus)`.
- Fallback format: `AAC (.m4a)` (or `MP3` if needed for compatibility edge cases).
- Keep each SFX very small:
  - Typical short effect target: `20 KB - 120 KB`.

## 3) Compression Targets
- Short UI/chess SFX (clicks, captures, checks): Opus `64-96 kbps`.
- Longer ambience loops (if added later): Opus `96-160 kbps`.
- Avoid aggressive compression artifacts on transient sounds (can make attacks sound swishy or blurred).

## 4) Loudness, Peak, Dynamics
- True-peak ceiling: `-1 dBTP` maximum.
- Loudness consistency is more important than exact LUFS number.
- Recommended ballpark for short SFX:
  - around `-18 to -14 LUFS short-term` (per effect family).
- Dynamics:
  - use very light compression only when needed.
  - keep transients intact for clarity (especially move/capture events).
- EQ cleanup:
  - high-pass low rumble below roughly `60-100 Hz` if needed.

## 5) Priority Layering (Gameplay Semantics)
Use a clear hierarchy so meaning is audible without being loud:
1. Regular move (lowest emphasis)
2. Capture (more presence)
3. Castle / special move (distinct timbre)
4. Check (clear alert character)
5. Checkmate (most distinct/signature, still short)

Guideline:
- Keep level differences small (subtle, not jarring).
- Prefer timbre differences over large volume jumps.

## 6) Duration + Variation
- Target duration for most events: `60-180 ms`.
- Avoid long tails that stack during fast play.
- Add `2-4` alternates for frequently triggered sounds:
  - `move`
  - `capture`
- Rotate variants to reduce listener fatigue.

## 7) Suggested Asset Set (MVP)
- `move_01` to `move_04`
- `capture_01` to `capture_03`
- `castle_01`
- `check_01`
- `checkmate_01`
- `illegal_01` (optional, for invalid move feedback)
- `ui_click_01` (optional, non-game UI action)

## 8) Naming Convention
Use lowercase snake_case with explicit category and variant:
- `sfx_move_01.ogg`
- `sfx_capture_02.ogg`
- `sfx_castle_01.ogg`
- `sfx_check_01.ogg`
- `sfx_checkmate_01.ogg`

If fallback is needed, same basename:
- `sfx_move_01.ogg`
- `sfx_move_01.m4a`

## 9) Suggested Frontend Folder Layout
For runtime assets in repo:
- `app/frontend/public/audio/sfx/chess/`

Example:
- `app/frontend/public/audio/sfx/chess/sfx_move_01.ogg`
- `app/frontend/public/audio/sfx/chess/sfx_move_01.m4a`

## 10) Playback Behavior (UX)
- Preload core chess SFX on game screen load.
- Keep SFX playback low-latency (`AudioContext`/Howler-style setup).
- Add user controls:
  - master SFX on/off
  - SFX volume slider
- Respect browser autoplay policies (unlock audio on first user interaction).

## 11) Mix QA Checklist
Test each SFX on:
- laptop speakers
- phone speaker
- headphones

Validation checks:
- no clipping
- no harshness/fatigue over repeated play
- check/checkmate are clearly distinguishable
- move/capture remain subtle and not distracting in blitz play

## 12) Portfolio Interview Rationale (Why These Choices)
- Opus gives high quality at low bandwidth (good web performance story).
- WAV masters preserve quality through iteration.
- Consistent loudness and capped true peak improve perceived polish and accessibility.
- Semantic layering (move/capture/check/checkmate) improves UX without visual dependence.
