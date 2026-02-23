# Unified Skill Hierarchy — Master Plan

## Status: ALL PHASES COMPLETE (Phase 1 + 2 + 3 + 4)

---

## The Problem (solved)

Three disconnected skill lists existed:
- **POSITION_SKILLS** (24 rated skills) — quick-rate, progress, player card
- **DEV_SESSION_SKILLS** (14 free-text) — dev session feedback (NOW DELETED)
- **COACHING_FOCUSES** (6 high-level) — session creation, filtering (unchanged)

Coach rated "Ball Control" in dev session but progress tracked "Ball Carrying". Nothing connected.

## The Solution (implemented)

**One hierarchy. 24 parent skills. Sub-skills underneath as context tags.**

```
FootballSkill (parent, rated 1-5)
  └── sub-skills (context tags, not rated)

Example:
  Passing (rated 1-5 via DotRating)
    ├── First Touch (tag)
    ├── One-Touch Play (tag)
    └── Weight of Pass (tag)
```

## Rating Model

| What | How | Scale | Stored where |
|------|-----|-------|--------------|
| Parent skill (e.g. "Passing") | DotRating (1-5 coloured dots) | 1-5 | `SkillLevel.level` (x2 = 1-10 internal) |
| Sub-skill (e.g. "First Touch") | Toggle chip on/off | Boolean | `SessionFeedback.skillsWorkedOn[]` |
| Effort | DotRating | 1-5 | `SessionFeedback.effortRating` |
| Overall performance | Star rating | 1-5 | `SessionFeedback.overallPerformance` |

**Why 1-5 not 1-10:** Consistent with Quick Rate flow. Less false precision. One tap per skill. Internal storage remains 1-10 (multiplied by 2) for future granularity.

## Data Flow

```
Coach taps DotRating dot (1-5)
  → updateSkillRating(skill, value) in use-dev-session.ts
  → stored in skillRatings: { skill, rating }[]
  → on Save: progressService.addSessionFeedback(...)
    → progressSkillsService stores as SkillLevel (rating * 2 = 1-10)
    → computeFourCorners() maps skills via SKILL_TO_CORNER
    → FourCornerRatings { technical, physical, psychological, social }
  → displays on: pentagon, player card, progress trends
```

## Coach UX Flow (implemented)

1. Coach opens session feedback screen
2. Sees position tabs: **Core | GK | DEF | MID | ATT**
3. Each tab shows 4-5 parent skills as **DotRating rows** (icon + label + 5 coloured dots)
4. Coach taps dots to rate — dot animation + haptic feedback
5. Rated skill expands to show sub-skill chips underneath
6. Coach toggles sub-skills for context ("worked on First Touch and Weight of Pass")
7. X button to remove a rating entirely
8. Below: notes, improvements, homework, media, badges
9. Save & Submit

**Minimum taps for a session:** 3-5 (rate 3 skills, save)

## What Parents See

- **Current (Phase 1):** Parent skill ratings (e.g. "Passing 4/5") with trend arrows
- **Phase 2:** Sub-skill context tags shown beneath ratings ("Worked on: First Touch, Weight of Pass")
- Pentagon/player card shows positional skills on 0-100 scale
- Four corners model aggregates into Technical/Physical/Psychological/Social

## What Athletes See

- Pentagon with animated morphing between sessions
- Player card (FIFA-style) with corner scores and tier
- "Coach says focus on: [homework]"
- Badges and achievements
- **Phase 3:** Sub-skills shown as "Today we practised: ..." motivational tags

## Calculation Model

### Four Corners (already working)

Each of the 24 skills maps to one corner via `SKILL_TO_CORNER`:
- **Technical (10):** Shot Stopping, Handling & Crosses, Distribution, Tackling, Passing, Ball Carrying, Dribbling & Skills, Finishing, Hold-Up Play, Playing Out
- **Physical (5):** Work Rate, Pressing & Work Rate, Pressing & Defending, Heading & Aerial, 1v1 Defending
- **Psychological (7):** Attitude, Coachability, Game Vision, Positioning, Positioning & Sweeping, Tempo & Control, Movement
- **Social (2):** Communication, Command of Area

Corner value = average of all rated skills in that bucket, clamped 1-5.

### Pentagon (already working)

5 vertices = 5 positional skills for athlete's position. Values mapped from 1-10 internal scale to 0-100 display scale.

---

## Sub-Skill Hierarchy (complete reference)

### GK
| Parent | Sub-skills |
|--------|-----------|
| Shot Stopping | Reflexes, Shot Reading, 1v1 Saving |
| Handling & Crosses | Catching, Punching, Cross Claiming |
| Distribution | Goal Kicks, Throwing, Short Passing |
| Positioning & Sweeping | Starting Position, Sweeping, Angle Play |
| Command of Area | Organising Defence, Commanding Box, Communication with Back Line |

### DEF
| Parent | Sub-skills |
|--------|-----------|
| Tackling | Tackling Technique, Interceptions |
| Heading & Aerial | Aerial Duels, Set Piece Attacking |
| Positioning | Positional Sense, Defensive Shape |
| Playing Out | Building from the Back, Receiving Under Pressure, Switching Play |
| 1v1 Defending | Jockeying, Recovery Runs |

### MID
| Parent | Sub-skills |
|--------|-----------|
| Passing | First Touch, One-Touch Play, Weight of Pass |
| Ball Carrying | Ball Control, Close Control, Dribbling |
| Game Vision | Decision Making, Scanning, Awareness |
| Pressing & Defending | Transition, Pressing Shape |
| Tempo & Control | Game Management, Tempo Setting |

### ATT
| Parent | Sub-skills |
|--------|-----------|
| Finishing | Shooting, Composure, Weak Foot Finishing |
| Movement | Off the Ball, Timing of Runs, Movement in Box |
| Dribbling & Skills | Skill Moves, 1v1 Attacking, Weak Foot |
| Hold-Up Play | Back to Goal, Link-Up Play, Holding Possession |
| Pressing & Work Rate | Speed, Stamina, Pressing Intensity |

### Universal (all positions)
| Parent | Sub-skills |
|--------|-----------|
| Work Rate | Conditioning, Fitness, Endurance |
| Attitude | Discipline, Resilience, Confidence |
| Communication | Leadership, Organising |
| Coachability | Listening, Learning Attitude |

---

## Phases

### Phase 1: Unified Hierarchy + DotRating (COMPLETE)

**What was done:**
1. Added `SKILL_SUB_SKILLS` record to `constants/position-skills.ts` — maps all 24 parent skills to sub-skill arrays
2. Added helpers: `ALL_SUB_SKILLS`, `getParentSkill()`, `getSkillWithSubs()`
3. Deleted `DEV_SESSION_SKILLS` from `constants/football-registry.ts`
4. Rewrote `components/development/dev-session-skills.tsx`:
   - Position tabs (Core | GK | DEF | MID | ATT) — max 5 skills per tab
   - Inline `DotRating` (1-5) per parent skill — same component as Quick Rate
   - Expandable sub-skill chips appear when parent is rated
   - X button to remove a rating
5. Rewrote `hooks/use-dev-session.ts`:
   - `updateSkillRating(skill, 1-5)` — rates parent, auto-adds to selectedSkills
   - `removeSkillRating(skill)` — removes rating and from selectedSkills
   - `toggleSubSkill(subSkill)` — toggles context tags
   - No prefilling of skill ratings (starts empty, coach builds)
6. Fixed seed data: mapped legacy names (Scanning, Decision Making, Composure, etc.) to parent skills
7. Updated `app/development/session/[sessionId].tsx` to pass new props

**Files changed:**
- `constants/position-skills.ts`
- `constants/football-registry.ts`
- `hooks/use-dev-session.ts`
- `components/development/dev-session-skills.tsx`
- `app/development/session/[sessionId].tsx`
- `constants/coach-session-seeds.ts`
- `constants/relational-demo-seeds.ts`
- `services/invite/session-invite-service.ts`

**Tests:** 35/35 passing. Zero new TS errors.

### Phase 2: Enrich Feedback Display (COMPLETE)

**What was done:**
1. **`components/progress/session-feedback-sections.tsx`** — `SkillRatingsGrid` now accepts `skillsWorkedOn`. Sub-skills appear as small tinted chips beneath each parent skill rating row. Decline arrows use `palette.muted` not `palette.error`.
2. **`components/progress/session-feedback-card.tsx`** — "Skills covered" chips distinguish parent skills (normal) from sub-skills (muted, smaller) using `getParentSkill()` + new Chip `muted` prop.
3. **`components/primitives/chip.tsx`** — Added `muted` prop: lighter border, smaller font, mutedForeground colour.
4. **`components/progress/coach-says-card.tsx`** — Skill rating rows show sub-skill chips underneath using `SKILL_SUB_SKILLS` lookup against `feedback.skillsWorkedOn`. Corner-coloured tint background.

**Files changed:**
- `components/progress/session-feedback-sections.tsx`
- `components/progress/session-feedback-card.tsx`
- `components/primitives/chip.tsx`
- `components/progress/coach-says-card.tsx`

### Phase 3: Athlete-Friendly Display (COMPLETE)

**What was done:**
1. **`components/progress/skill-level-card.tsx`**:
   - Declining trend: "Needs Focus" → "Keep practising"
   - Declining icon: `trending-down` (red) → `arrow-forward` (amber)
   - Change text: "-2 from last assessment" → "Keep practising this one"
2. **`components/progress/skill-level-helpers.ts`**:
   - Developing: "Needs more repetition" → "Building foundations"
3. **`components/progress/session-feedback-sections.tsx`**:
   - Rating 1 label: "Needs Work" → "Keep Going"
   - Decline arrows: neutral colour

**Language audit — zero negative language in athlete views:**
- "declining" → never shown (mapped to `→`)
- "Needs Focus" → "Keep practising"
- "Needs Work" → "Keep Going"
- "Needs more repetition" → "Building foundations"
- Down arrows → forward arrows (amber)

**Files changed:**
- `components/progress/skill-level-card.tsx`
- `components/progress/skill-level-helpers.ts`
- `components/progress/session-feedback-sections.tsx`

### Phase 4: Position-First Data Architecture + UI Redesign (COMPLETE)

**Problems solved:**
1. Dev session didn't store `positionPlayed` or compute `fourCorners` — pentagon/player card showed stale data
2. Save path diverged from Quick Rate — two code paths producing different quality data
3. Tabs (Core/GK/DEF/MID/ATT) didn't match coach mental model — "rate the athlete's position skills"
4. Rainbow coloured dots looked garish and amateur
5. Labels truncated on small screens (iPhone SE)
6. No previous rating context — coach had no idea what they rated last time
7. Universal skills labelled "Core" when they're actually character/behavioural traits

**What was done:**

1. **`hooks/use-dev-session.ts`** — Complete position-first rewrite:
   - Loads athlete's position: `latestFeedback.positionPlayed` → `getMostPlayedPosition()` → `childProfile.primaryPosition` → MID fallback
   - Loads previous ratings from `SKILL_LEVELS` (converted 1-10 → 1-5 for display)
   - Position change handler: preserves character ratings, clears old positional ratings
   - Save path aligned with Quick Rate: `recordPosition()` → `updateFromPositionRate()` → `addSessionFeedback(skipSkillUpdate: true)`
   - `positionPlayed` + `fourCorners` now stored on every dev session feedback record

2. **`components/session/rating-bar.tsx`** — NEW: Segmented pill bar:
   - 5 connected segments in a pill shape (first/last have rounded ends)
   - Single monochrome `colors.tint` fill (no rainbow)
   - Animated fill transitions (180ms) + subtle scaleY pulse on tap
   - 28px visual height, 44px touch target via container padding

3. **`components/development/dev-session-skills.tsx`** — Position-first layout:
   - Removed tabs (Core/GK/DEF/MID/ATT)
   - Added `PositionSelector` chips (GK/DEF/MID/ATT) at top, pre-selected from athlete data
   - Section 1: "[Position] Skills" — 5 positional skills with stacked RatingBar
   - Section 2: "Character" — 4 universal skills (Work Rate, Attitude, Communication, Coachability)
   - Previous rating trend indicators (↑ improved, → steady, was X/5 hint for unrated)
   - Full-width labels that NEVER truncate (stacked layout: label above, bar below)

4. **`components/session/dot-rating.tsx`** — Monochrome tint:
   - All 5 dot positions now use single `colors.tint` instead of 5 different colours (red/orange/yellow/green/blue)

5. **`app/development/session/[sessionId].tsx`** — Wired new props:
   - `positionPlayed`, `onPositionChange`, `positionalSkills`, `characterSkills`, `positionLabel`, `previousRatings`

**Data flow (after Phase 4):**
```
Coach opens session → hook loads athlete position (MID)
                    → hook loads previous ratings from SKILL_LEVELS
                    → UI shows: Position selector (MID selected)
                              + 5 MID skills with previous rating hints
                              + 4 Character skills
Coach rates skills → RatingBar segments fill (monochrome tint)
                   → sub-skills expand beneath rated skills
                   → trend arrows show vs previous session
Coach saves → recordPosition(sessionId, athleteId, MID)
            → updateFromPositionRate() → updates SKILL_LEVELS + computes fourCorners
            → addSessionFeedback(positionPlayed: MID, fourCorners: {...}, skipSkillUpdate: true)
Pentagon, player card, four corners → all show correct, fresh data
```

**Files changed:**
- `components/session/rating-bar.tsx` (NEW)
- `hooks/use-dev-session.ts`
- `components/development/dev-session-skills.tsx`
- `components/session/dot-rating.tsx`
- `app/development/session/[sessionId].tsx`

**Tests:** 40/40 passing (7 progress-skills + 31 data-integrity + 2 monthly-summary). Zero new TS errors.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `constants/position-skills.ts` | 24 parent skills, sub-skill map, helpers, four corner mapping |
| `constants/football-registry.ts` | Single import point — re-exports everything from position-skills |
| `hooks/use-dev-session.ts` | Dev session state: position-first flow, ratings, sub-skills, aligned save |
| `components/development/dev-session-skills.tsx` | UI: position selector + positional/character sections + RatingBar |
| `components/session/rating-bar.tsx` | 5-segment monochrome pill bar (dev session) |
| `components/session/dot-rating.tsx` | Monochrome 1-5 dot rating (quick-rate screens) |
| `components/session/position-selector.tsx` | GK/DEF/MID/ATT position chips |
| `components/session/quick-rate-card.tsx` | Quick Rate uses DotRating — reference implementation |
| `services/progress/progress-position-service.ts` | Position history tracking (recordPosition, getMostPlayedPosition) |
| `services/progress/progress-skills-service.ts` | Stores skill levels (1-10 internal) |
| `services/progress/progress-feedback-service.ts` | Stores session feedback records |
| `types/progress-types.ts` | FootballSkill, PositionRole, SessionFeedback, SkillLevel types |
| `components/progress/session-feedback-sections.tsx` | Parent/athlete feedback display (Phase 2) |
| `components/progress/skill-level-card.tsx` | Skill trend card (Phase 3) |
| `components/progress/player-card-front.tsx` | FIFA-style player card (Phase 3) |

## COACHING_FOCUSES — Unchanged

The 6 high-level coaching focuses (`Dribbling`, `Passing`, `Defending`, `Finishing`, `Goalkeeping`, `Conditioning`) are for coach discovery and session creation filtering. They are NOT rated skills and remain separate from the skill hierarchy. No changes needed.
