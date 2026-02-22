# My Progress — Master Plan (10/10)

**Status:** PLANNING — GAPS FIXED (see `PROGRESS_ARCHITECTURE.md`)
**Size:** XL (52 new files, 27 modified)
**Pipeline:** SPEC → ARCHITECT → DESIGN → code (batched) → VERIFY

## READ FIRST

**`PROGRESS_ARCHITECTURE.md`** is the source of truth for ALL:
- Type definitions (every interface, every enum)
- Architectural decisions (D1-D13)
- Storage schemas (keys, structures)
- Event bus additions (6 new events with payloads)
- Service method specs (exact signatures + logic)
- Wiring patterns (how components connect to hooks, services, events)
- Package installation (what's installed vs what's missing)

**If a sprint doc contradicts `PROGRESS_ARCHITECTURE.md`, the architecture doc wins.**

## BEFORE WRITING ANY CODE

```bash
# 1. Install missing packages
npx expo install expo-camera expo-image-manipulator expo-video-thumbnails expo-av react-native-view-shot

# 2. Add camera permissions to app.json plugins array:
# ["expo-camera", { "cameraPermission": "...", "microphonePermission": "..." }]

# 3. Create types/progress-types.ts (all shared types — see PROGRESS_ARCHITECTURE.md §2)
# 4. Create constants/four-corner-mapping.ts (skill→corner mapping — see PROGRESS_ARCHITECTURE.md §5)
# 5. Add 6 events to services/event-bus.ts (see PROGRESS_ARCHITECTURE.md §4)
# 6. Add 4 storage keys to constants/storage-keys.ts (see PROGRESS_ARCHITECTURE.md §3)
# 7. Add fourCorners field to SessionFeedback type (see PROGRESS_ARCHITECTURE.md §2)
# 8. Add quickRate to CompletionStep type (see PROGRESS_ARCHITECTURE.md §2)
```

## Vision

Kill the admin panel. Build an identity. Every athlete opens this screen and sees themselves reflected back as a footballer — not a spreadsheet of numbers. Every parent sees proof their £20/month is the best investment they make. Every coach's 30-second input creates a beautiful, emotional, living progress story.

## Architecture

Single scroll. Zero tabs. Story-first.

```
THE SCROLL (top → bottom)
─────────────────────────
1. The Moment (hero — what just happened)
2. Player Card (FIFA-style identity — shareable)
3. Four Corner Diamond (FA model — tap to expand)
4. Next Challenge (one quest — dopamine loop)
5. Coach Says (latest feedback as human quote)
6. Past Sessions (timeline with photos/videos/notes)
7. Goals (compact, who-set-it visible)
8. Badge Wall (grid, locked/unlocked, Four Corner groups)
9. Journal Prompt (contextual, post-session only)
10. Value Summary (parent-only, plain English)
```

## Sprints

| Sprint | Name | Doc |
|--------|------|-----|
| S0 | Coach Input Revolution | `SPRINT_0_COACH_INPUT.md` |
| S1 | The Scroll | `SPRINT_1_THE_SCROLL.md` |
| S2 | Media & Past Sessions | `SPRINT_2_MEDIA.md` |
| S3 | Identity & Gamification | `SPRINT_3_IDENTITY.md` |
| S4 | Challenge Engine | `SPRINT_4_CHALLENGES.md` |
| S5 | Parent Delight | `SPRINT_5_PARENT.md` |
| S6 | Polish & Animation | `SPRINT_6_POLISH.md` |

## Data Flow

```
COACH (30 seconds)                    ATHLETE (opens app)
──────────────────                    ───────────────────
Quick Rate (4 corners × 5 dots)  →   Four Corner Diamond fills
Take photo / record 10s clip    →   Past Sessions timeline + Player Card bg
Award badge (1 tap from card)   →   Badge Wall circle lights up + celebration
Session note (existing)         →   "Coach Says" quote card
                                →   Challenge auto-tracks progress
                                →   Streak auto-increments
                                →   Player Card stats update
                                →   Parent Value Summary computes
```

## What Makes This 10/10

1. **Coach input is 30 seconds** — Quick Rate + camera + badge = done
2. **Media is first-class** — photos/videos ARE the progress record, not an attachment
3. **Single scroll tells a story** — no tabs, no navigation, one continuous narrative
4. **FA Four Corner Model** — every FA officer recognises the diamond instantly
5. **FIFA player card** — shareable, emotional, identity-forming
6. **Challenge engine** — forward-looking motivation, not backward-looking data
7. **Celebrations on every win** — confetti, haptics, sound, the full dopamine stack
8. **Parent sees value** — plain English, coach quotes, media proof
9. **Past sessions are a timeline** — scrollable history with thumbnails, notes, ratings
10. **Badge wall creates completionism** — locked badges visible, progress toward each shown

---

## Sprint Totals (CORRECTED — see PROGRESS_ARCHITECTURE.md §16)

| Sprint | Files | New | Modified | Focus |
|--------|-------|-----|----------|-------|
| **S0** | 16 | 11 | 5 | Coach input: Quick Rate, camera, badges, pre-fill |
| **S1** | 17 | 13 | 4 | The Scroll: 10 sections, zero tabs |
| **S2** | 11 | 9 | 2 | Media: timeline, gallery, photo/video viewer |
| **S3** | 10 | 8 | 2 | Identity: FIFA card, streaks, levels |
| **S4** | 7 | 4 | 3 | Challenges: engine, auto-tracking, rewards |
| **S5** | 8 | 4 | 4 | Parent: coach quals, value summary, homework |
| **S6** | 10 | 3 | 7 | Polish: animations, haptics, celebrations |
| **TOTAL** | **79 touches** | **52 new** | **27 modified** | |

## Dependency Graph

```
S0 (Coach Input) ──────────────────────────────────┐
  │                                                 │
  ├→ S1 (The Scroll) ─────────────────────┐         │
  │    │                                   │         │
  │    ├→ S2 (Media & Past Sessions) ──────┤         │
  │    │                                   │         │
  │    ├→ S3 (Identity & Gamification) ────┤         │
  │    │                                   │         │
  │    └→ S4 (Challenge Engine) ───────────┤         │
  │                                        │         │
  └→ S5 (Parent Delight) ─────────────────┤         │
                                           │         │
                                           └→ S6 (Polish)
```

**Critical path:** S0 → S1 → S2/S3/S4 (parallel) → S5 → S6

S2, S3, and S4 can run in parallel after S1 is complete — they're independent sections on the scroll.

## npm Dependencies (AUDITED)

| Package | Sprint | Status |
|---------|--------|--------|
| `expo-camera` | S0 | **MISSING — install** |
| `expo-image-manipulator` | S2 | **MISSING — install** |
| `expo-video-thumbnails` | S2 | **MISSING — install** |
| `expo-av` | S2 | **MISSING — install** |
| `react-native-view-shot` | S3 | **MISSING — install** |
| `expo-sharing` | S2/S3 | Already installed |
| `react-native-svg` | S1 | Already installed |
| `expo-haptics` | S6 | Already installed |
| `expo-image` | S2 | Already installed |
| `expo-file-system` | S0 | Already installed |
| `expo-image-picker` | S0 | Already installed (web fallback for camera) |

**DO NOT use `react-native-pager-view`.** Use `FlatList` with `pagingEnabled` instead (Decision D2).

## New Storage Keys (CORRECTED — naming avoids conflicts)

| Constant Name | Value | Sprint | Structure |
|---------------|-------|--------|-----------|
| `SESSION_MEDIA` | `'clubroom.session_media'` | S0 | `SessionMedia[]` (flat array) |
| `PROGRESS_ACTIVE_CHALLENGE` | `'progress.active_challenge'` | S4 | `Record<athleteId, ProgressChallenge>` |
| `PROGRESS_CHALLENGE_HISTORY` | `'progress.challenge_history'` | S4 | `ProgressChallenge[]` (flat array) |
| `HOMEWORK_COMPLETION` | `'progress.homework_completion'` | S5 | `Record<feedbackId, { completedAt }>` |

NOTE: `ACTIVE_CHALLENGE` / `CHALLENGE_HISTORY` renamed to `PROGRESS_*` to avoid conflict with existing squad video challenge keys.

## New Event Bus Events (with payloads — see PROGRESS_ARCHITECTURE.md §4)

| Event | Value | Sprint | Payload |
|-------|-------|--------|---------|
| `SESSION_MEDIA_CAPTURED` | `'session:media_captured'` | S0 | `{ sessionId, athleteId, photoCount, hasVideo }` |
| `SKILL_LEVEL_UP` | `'progress:skill_level_up'` | S3 | `{ athleteId, skill, previousLevel, newLevel, corner }` |
| `LEVEL_UP` | `'progress:level_up'` | S3 | `{ userId, previousLevel, newLevel, newLevelName }` |
| `PROGRESS_CHALLENGE_COMPLETED` | `'progress:challenge_completed'` | S4 | `{ challengeId, athleteId, type, rewardBadgeId }` |
| `PROGRESS_CHALLENGE_ASSIGNED` | `'progress:challenge_assigned'` | S4 | `{ challengeId, athleteId, type }` |
| `JOURNAL_SAVED` | `'journal:saved'` | S4 | `{ athleteId, sessionId?, entryId }` |

## Key Decisions (from PROGRESS_ARCHITECTURE.md)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | FA Four Corners = technical/physical/psychological/**social** (NOT tactical) | Matches existing `BadgeCategory` type and `CategoryInfo` in progression.ts |
| D2 | FlatList with pagingEnabled (NOT react-native-pager-view) | One less dependency, battle-tested |
| D3 | New challenge service = `progress-challenge-service.ts` | Avoids conflict with existing squad video `challenge-service.ts` |
| D4 | 5 progression levels (NOT 10) | Matches existing `ProgressionThresholds` |
| D5 | `media-service.ts` is NEW file | Does not exist yet |
| D6 | Quick Rate SKIPPED in group completion mode | Group board is fast batch, Quick Rate is per-athlete detail |
| D7 | "Skip All" goes to Notes step | Calls existing `goToNextStep()` |
| D8 | Quick Rate effort = same field as attendance effort | One source of truth, pre-filled from attendance |
| D9 | Web: use expo-image-picker instead of expo-camera | Camera not available on web platform |
| D10 | Max 3 photos + 1 video per athlete per session | Enforced in hook, button greys out |
| D11 | Four Corners stored on SessionFeedback.fourCorners | Pre-fill reads most recent feedback for athlete+coach |
| D12 | Existing components: KEEP and upgrade, don't delete | See table in architecture doc |
| D13 | Single useScreen load, pure computation hooks | No async in useFourCorners/useProgressMoment |

## Build Order (Recommended)

### Phase 1: Foundation (S0)
Build coach input first. Without real data flowing, everything else is cosmetic.
1. `dot-rating.tsx` — reusable, needed everywhere
2. `quick-rate-card.tsx` — single athlete rating card
3. `quick-rate-step.tsx` — pager wrapping cards
4. `use-quick-rate.ts` — state management
5. Wire into `complete.tsx`
6. `media-service.ts` + camera hooks
7. Wire camera into quick rate card
8. `completion-summary.tsx`
9. `feedback-prefill.ts`

### Phase 2: The Scroll (S1)
Rebuild the screen structure.
1. `four-corner-mapping.ts` — constants
2. `use-four-corners.ts` — computation
3. `four-corner-diamond.tsx` — SVG diamond
4. `corner-detail-panel.tsx` — expanded skills
5. `moment-hero.tsx` + `use-progress-moment.ts`
6. `coach-says-card.tsx`
7. `goals-compact.tsx`
8. `badge-wall.tsx` + `badge-circle.tsx` + `badge-detail-modal.tsx`
9. `journal-prompt.tsx`
10. `parent-value-summary.tsx` + `use-month-summary.ts`
11. Rewrite `my-progress.tsx` + `use-my-progress.ts`

### Phase 3: Media + Identity + Challenges (S2/S3/S4 — parallel)
Can be built simultaneously by different focus areas.

**Media track:**
1. Media service enhancements
2. `media-strip.tsx`
3. `session-timeline-card.tsx` + `past-sessions-timeline.tsx`
4. `photo-viewer.tsx` + `video-player-overlay.tsx`
5. `media-gallery.tsx` + `session-history.tsx`

**Identity track:**
1. `fifa-score.ts` — utility
2. `player-card-front.tsx` + `player-card-back.tsx` + `player-card.tsx`
3. `use-player-card.ts`
4. `card-share.ts` + `badge-share.ts`
5. `streak-visual.tsx`
6. `use-level-detection.ts`

**Challenge track:**
1. `challenge-definitions.ts`
2. `challenge-service.ts`
3. `next-challenge.tsx` + `use-active-challenge.ts`
4. Wire events

### Phase 4: Parent + Polish (S5 → S6)
1. `coach-badge.tsx`
2. `monthly-summary-service.ts`
3. `family-highlights.tsx`
4. `homework-card.tsx`
5. All animation passes (S6)
6. `haptics.ts`
7. `level-up-ceremony.tsx`
8. Final scroll animation tuning
