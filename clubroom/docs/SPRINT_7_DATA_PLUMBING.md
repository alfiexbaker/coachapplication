# Sprint 7 — My Progress: Data Plumbing + Player Card + Visual Polish

**Goal**: Stop losing coach input data, put the player card back where it belongs, tighten the visuals.

---

## A. Data Plumbing (stop throwing away coach effort)

### A1. Wire `improvements` input

Coach has no way to enter improvement guidance. Field exists on `SessionFeedback`, display exists in `CoachSaysCard` (line 292-299), but no input in the wizard.

| File | Change |
|------|--------|
| `hooks/use-session-completion.ts:122` | Add `const [improvements, setImprovements] = useState('');` |
| `hooks/use-session-completion.ts:676` | `improvements: '',` → `improvements,` |
| `hooks/use-session-completion.ts:613` | `improvements: '',` → `improvements,` |
| `hooks/use-session-completion.ts` return | Add `improvements, setImprovements` |
| `components/session/notes-step.tsx:24` | Add `improvements: string; onImprovementsChange: (text: string) => void;` to props |
| `components/session/notes-step.tsx` after line 161 | Add SurfaceCard + TextInput — placeholder: "What should they focus on improving?" |
| `app/session/[id]/complete.tsx` | Wire `improvements={improvements} onImprovementsChange={setImprovements}` to both NotesStep renders |

**Verify**: Complete session with improvements text → My Progress → CoachSaysCard shows "Improvements" section.

---

### A2. Store all awarded badges

Only `badges[0]` saved. Rest silently dropped.

| File | Change |
|------|--------|
| `hooks/use-session-completion.ts:682` | `athleteData.badges[0] \|\| undefined` → `athleteData.badges.join(', ') \|\| undefined` |
| `components/progress/coach-says-card.tsx:118` | Split `trimmedBadgeAward` on `,` → render multiple badge chips |

---

### A3. Persist photos from Notes step

Photos go to `SessionNote` but NOT `SessionFeedback`. Progress screen never sees them.

| File | Change |
|------|--------|
| `services/progress/progress-feedback-service.ts:50` | Add `photoUrls?: string[];` to `SessionFeedback` |
| `hooks/use-session-completion.ts:681` | Add `photoUrls: imageUrls.length > 0 ? imageUrls : undefined,` |

---

### A4. Persist quick rate media

`createFeedbackFromQuickRate` ignores `input.mediaIds`.

| File | Change |
|------|--------|
| `services/progress/progress-feedback-service.ts:278` | `existingForSession?.videoClipUrls ?? []` → `input.mediaIds?.length ? input.mediaIds : (existingForSession?.videoClipUrls ?? [])` |

---

### A5. Store session title

`session.title` available at completion but never stored on feedback.

| File | Change |
|------|--------|
| `services/progress/progress-feedback-service.ts:32` | Add `sessionTitle?: string;` to `SessionFeedback` |
| `hooks/use-session-completion.ts:668` | Add `sessionTitle: session.title,` |
| `services/progress/progress-feedback-service.ts:284` | Add `sessionTitle` to quick rate path |
| `coach-says-card.tsx` | Show `sessionTitle` as fallback when `sessionTemplateName` is empty |

---

## B. Player Card — Back on the Scroll

The player card (front/back, flip, shimmer, tier gradients, FIFA scores) is fully built and data-backed. It was removed from the scroll during slop cleanup but it's not slop — every field comes from real coach data.

### B1. Add player card to My Progress screen

| File | Change |
|------|--------|
| `app/development/my-progress.tsx` | Import `PlayerCard` from `@/components/progress` |
| `app/development/my-progress.tsx` | Add after `progressSummaryLine` section, before `FourCornerDiamond` |

Position: **top of the scroll**, right after the summary line. It's the hero element — name, photo, tier, FIFA scores, streak. The diamond chart follows below as the detailed breakdown.

```
summaryLine → PlayerCard → FourCornerDiamond → CoachSaysCard → ...
```

The hook already computes `playerCard` data (line 64 in my-progress.tsx) and `usePlayerCard` (line 601 in use-my-progress.ts). Just needs rendering.

### B2. Make it look premium

The card already has:
- Tier-based gradients (bronze → diamond)
- Shimmer animation on gold/platinum/diamond
- Flip animation (front: photo + scores, back: stats + streak)
- Long-press to share
- FIFA-style corner scores (20-99)
- Blurred photo background

No changes needed to the component itself. It's well built.

---

## C. Visual Polish (stop looking tacky)

### C1. Break card monotony — diamond section full-bleed

Remove `SurfaceCard` wrapper from `FourCornerDiamond`. Let the SVG chart breathe edge-to-edge. Add a subtle gradient background instead.

| File | Change |
|------|--------|
| `components/progress/four-corner-diamond.tsx:300` | Replace `SurfaceCard` with plain `View` |
| `components/progress/four-corner-diamond.tsx` | Add `expo-linear-gradient` background from transparent to `withAlpha(colors.tint, 0.04)` behind the SVG |

---

### C2. SVG radar gradient fill

Replace the flat `withAlpha(colors.tint, 0.22)` polygon fill with a radial gradient using `react-native-svg` `<Defs>` + `<RadialGradient>`.

| File | Change |
|------|--------|
| `components/progress/four-corner-diamond.tsx:365-369` | Replace flat fill `Polygon` with gradient-filled polygon using SVG `<Defs><RadialGradient>` |

Centre = `withAlpha(colors.tint, 0.35)`, edge = `withAlpha(colors.tint, 0.08)`. Same `react-native-svg` package, no new deps.

---

### C3. Replace 5-dot circles with horizontal bars in CoachSaysCard

Current: 10px circles. Looks like a settings toggle.

| File | Change |
|------|--------|
| `components/progress/coach-says-card.tsx:262-276` | Replace `View` dots with `View` bar — `height: 6, borderRadius: pill, flex: 1` filled to `width: ${rating/5 * 100}%` using corner-specific colours from `CORNER_COLORS` |

---

### C4. Heatmap cells — bigger, rounded, corner-coloured

Current: 42 tiny grey/green squares. Barely readable on mobile.

| File | Change |
|------|--------|
| `components/progress/attendance-heatmap.tsx` | Increase cell size, add `borderRadius: 4`, use `colors.tint` at varying opacities instead of hardcoded green |

---

## D. Dead Code Cleanup

### D1. Strip dead code from use-my-progress.ts

~200 lines of imports, loads, computations, and return values for removed components.

**Remove imports**: `useProgressMoment`, `useActiveChallenge`, `useWeeklyRecap`, `progressSquadActivityService`, `progressSelfAssessmentService`, `progressPracticeLogService`, `progressWeeklyRecapNotificationService`, `progressChallengeService`

**Remove from MyProgressData**: `activeChallenge`, `journalEntries`, `practiceLogs`, `pendingSelfAssessmentPrompt`, `squadActivityFeed`

**Remove from loadData Promise.all**: `challengeResult`, `practiceLogs`, `duePromptDispatchResult`, `weeklyRecapDispatchResult`, `pendingSelfAssessmentPrompt`, `squadActivityFeedResult`

**Remove hooks**: `useActiveChallenge`, `useProgressMoment`, `useWeeklyRecap` calls

**Remove computed**: `showJournalPrompt`, `todayPracticeMinutes`, `weeklyPracticeMinutes`

**Remove from return**: `activeChallenge`, `challengeSyncing`, `moment`, `weeklyRecap`, `squadActivityFeed`, `todayPracticeMinutes`, `weeklyPracticeMinutes`, `pendingSelfAssessmentPrompt`, `latestJournalEntry`, `showJournalPrompt`, `saveJournalPrompt`, `logPracticeMinutes`, `refreshChallenge`

**Also remove from my-progress.tsx**: event listener for `PROGRESS_CHALLENGE_COMPLETED` (line 122-129)

---

## Order

```
D1 (dead code) → A1-A5 (data plumbing, parallel) → B1 (player card) → C1-C4 (visual, parallel)
```

Dead code first so you're working on a clean file. Data plumbing next because it flows data that the visual changes will display. Player card third. Visual polish last.

## Verify

```bash
npx tsc -p tsconfig.test.json
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js
```

## Final Scroll Order

```
summaryLine
PlayerCard (hero — name, photo, tier, FIFA scores)
FourCornerDiamond (full-bleed, gradient fill)
CoachSaysCard (skill bars, improvements, all badges, session title)
AttendanceHeatmap (bigger cells)
PastSessionsTimeline
GoalsCompact
BadgeWall
ParentValueSummary (parent only)
```
