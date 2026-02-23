# Data Integrity Audit: Coach → Athlete → Parent

> Last updated: 2026-02-23

## Section A: Coach Input → Storage

| Data Point | Coach Enters | Scale | Conversion | Stored As | Storage Key |
|---|---|---|---|---|---|
| Position skill rating | 1-5 dots | `SessionSkillRating.rating` | `× 2` | 1-10 `SkillLevel.level` | `progress.skill_levels` |
| Corner rating (quick rate) | 1-5 dots | `QuickRateInput.technical` etc | `× 2` | 1-10 `SkillLevel.level` | `progress.skill_levels` |
| Effort (per-athlete) | 1-5 | `attendance.effort` | direct | 1-5 | `session_attendance_*` |
| Effort (session-wide) | 1-5 | `SessionNoteRecord.effort` | direct | 1-5 | `progress.session_notes` |
| Badge award | badge ID | string | direct | `BadgeAward` | `clubroom.badge_awards` |
| Position played | GK/DEF/MID/ATT | `PositionRole` | direct | `PositionHistoryEntry` | `progress.position_history` |
| Feedback text | free text | string | direct | `SessionFeedback` | `progress.session_feedback` |

## Section B: Storage → Display (All Scale Conversions)

| Component | Reads | Scale In | Conversion | Scale Out | User Sees |
|---|---|---|---|---|---|
| Pentagon canvas | `SkillLevel.level` | 1-10 | `× 10` | 0-100 | Polygon vertex position |
| Pentagon skill rows | `SkillLevel.level` | 1-10 | `Math.ceil(level/2)` | 1-5 | "Passing: 4/5" |
| Player card FIFA | `SkillLevel.level` | 1-10 | `20 + (lvl-1) × 8.8` | 1-99 | "OVR 78" |
| Coach Says dots | `SessionFeedback.skillRatings.rating` | 1-5 | `clamp(1-5)` | 1-5 | Filled dots |
| Skill level card | `SkillLevel.level` | 1-10 | `levelToDots → Math.ceil(level/2)` | 1-5 | "Excellent" label |
| Skill level card bar | `SkillLevel.level` | 1-10 | `(level/10) × 100` | 0-100% | Progress bar width |
| Skill level card color | `SkillLevel.level` | 1-10 | thresholds at 3,5,8 | themed color | Bar/text color |
| Analytics radar chart | `SkillProgress.currentLevel` | 0-100 | `(level/100) × RADIUS` | px | Point position |
| Analytics radar label | `SkillProgress.currentLevel` | 0-100 | thresholds at 20,40,60,80 | text | "Excellent" label |
| Analytics radar color | `SkillProgress.currentLevel` | 0-100 | thresholds at 20,40,60,80 | hex color | Dot color |
| Analytics list | `SkillProgress.currentLevel` | 0-100 | same as radar | text + color | Label + indicator |
| Monthly summary | `SkillLevel.level` | 1-10 | `Math.ceil(level/2)` → label | text | "Moved to Excellent" |

## Section C: Canonical Label System

All components now use the same label vocabulary:

| Dots (1-5) | 1-10 Range | 0-100 Range | Label |
|---|---|---|---|
| 1 | 1-2 | 0-19 | Developing |
| 2 | 3-4 | 20-39 | Good |
| 3 | 5-6 | 40-59 | Very Good |
| 4 | 7-8 | 60-79 | Excellent |
| 5 | 9-10 | 80-100 | Exceptional |

Source of truth: `RATING_LABELS` in `constants/position-skills.ts`

## Section D: Scale Relationship

```
Coach input (1-5)  ──× 2──►  Storage (1-10)  ──× 10──►  Analytics (0-100)
                                    │
                                    ├── ÷ 2 (ceil) ──►  Dots/Labels (1-5)
                                    ├── × 10 ──────────►  Pentagon vertices (0-100)
                                    └── FIFA formula ──►  OVR rating (20-99)
```

## Section E: Files Owning Each Conversion

| Conversion | File | Function |
|---|---|---|
| 1-10 → 1-5 dots | `components/progress/skill-level-helpers.ts` | `levelToDots()` |
| 1-10 → label | `components/progress/skill-level-helpers.ts` | `getSkillLabel()` |
| 1-10 → color (themed) | `components/progress/skill-level-helpers.ts` | `getSkillColor()` |
| 0-100 → label | `components/analytics/skill-radar-helpers.ts` | `getSkillLabel()` |
| 0-100 → color (hex) | `components/analytics/skill-radar-helpers.ts` | `getSkillColor()` |
| 1-5 → label | `constants/position-skills.ts` | `RATING_LABELS` |
| 1-10 → label (summaries) | `services/progress/monthly-summary-service.ts` | `getSkillLevelLabel()` |

## Section F: Bugs Fixed (2026-02-23)

1. **`levelToDots()` treated ≤5 as already-converted** — Level 4/10 showed "Excellent" (4 dots) instead of "Good" (2 dots). Fixed to always use `Math.ceil(level/2)`.
2. **`toFivePointDots()` had dead dual-scale branch** — Removed `>5` path since `SessionSkillRating.rating` is always 1-5.
3. **Analytics used different label vocabulary** — Beginner/Developing/Proficient/Advanced/Expert replaced with Developing/Good/Very Good/Excellent/Exceptional to match rest of app.
4. **Monthly summary used different label vocabulary** — Beginner/Developing/Proficient/Advanced/Elite replaced with canonical labels.
5. **`SKILL_CATEGORIES` duplicated `mapSkillToCorner()`** — Removed; `getSkillCategory()` now uses `mapSkillToCorner()` exclusively.
6. **Analytics radar `<` vs `<=` boundary mismatch** — `getSkillLabel(20)` returned "Good" instead of "Developing". Stored level 2 × 10 = 20, which hit the wrong side of `< 20`. Fixed all thresholds to `<= 20/40/60/80`.
7. **`progress-feedback-service` dead dual-scale branch** — `r.rating <= 5 ? ×2 : passthrough` simplified to always `×2` since rating is always 1-5.
8. **Player card back raw `/10` display** — Changed "Passing (5/10)" to "Passing — Very Good" using `getSkillLabel()`.
9. **`skill-progress-helpers.ts` used OLD labels + wrong boundaries** — Used Beginner/Developing/Proficient/Advanced/Expert with `<` thresholds. Fixed to canonical labels with `<=` boundaries matching all other helpers.
10. **`skill-radar.tsx` legend referenced renamed color keys** — Legend used `SKILL_COLORS.beginner/.proficient/.advanced/.expert` which no longer exist after Bug 3 fix. Updated to `.developing/.good/.veryGood/.excellent/.exceptional`.
11. **Monthly summary test expected OLD label** — `monthly-summary-service.test.ts` line 62 asserted `'Proficient'` but service now outputs `'Good'`. Fixed test to match.
12. **`corner-detail-panel.tsx` used `Math.round()` instead of `Math.ceil()`** — `toDotScore(5)` returned 2 dots instead of 3; `toDotScore(9)` returned 4 instead of 5. Fixed to `Math.ceil(level / 2)` matching canonical `levelToDots()`.
13. **`previousLevel` defaulted to `0` on first rating** — `progress-skills-service.ts` set `previousLevel = existingSkill?.level ?? 0`, writing `0` (outside valid 1-10 range) into storage. Changed to `existingSkill?.level` (undefined on first rating, matching the optional type).
14. **Double skill write on position-rate sessions** — `use-session-completion.ts` called `updateFromPositionRate()` (writing skill levels) then `createFeedbackFromQuickRate()` → `addSessionFeedback()` → `updateMultipleSkillLevels()` (writing the same levels again), creating duplicate history entries. Fixed by adding `skipSkillUpdate` option to `addSessionFeedback()` and `skillsAlreadyWritten` to `createFeedbackFromQuickRate()`, passed from the caller when position skills were already written.
15. **Attendance hardcoded to ATTENDED — parent always saw 100%** — `progress-attendance-service.ts:83` hardcoded `attendance: 'ATTENDED'` for every session record. The actual attendance data (written to `SESSION_ATTENDANCE_{sessionId}` by `use-session-completion.ts:817`) was never read by any code path. Fixed `upsertCompletedBookingSessions()` to read actual attendance from `SESSION_ATTENDANCE_{booking.groupSessionId || booking.id}` and use the coach's actual marks (`NO_SHOW` or `ATTENDED`). Falls back to `ATTENDED` when no attendance record exists (backwards compatible).
16. **Quick-rate `overallPerformance` defaulted to per-athlete `effort`** — `createFeedbackFromQuickRate` (line 308) set `overallPerformance: input.effort` when no existing record existed, losing the distinction between session-wide performance and per-athlete effort. Fixed by adding `overallPerformance?: number` to `QuickRateInput` and passing session-wide `overallEffort` from `use-session-completion.ts`.
17. **Analytics hardcoded 100% attendance** — `analytics-query-service.ts:356` had `const attendanceRate = totalSessions > 0 ? 100 : 0`. Parent always saw 100% attendance in analytics. Fixed by reading `COACH_SESSIONS` and calculating real attendance from session records with attendance data.
18. **Legacy quick-rate path double-wrote skills** — The `skillsAlreadyWritten` flag from Bug 14 only covered the position-rate path. On the legacy `bulkUpdateFromQuickRate` path, skills were written but `skillsAlreadyWritten` was not passed to `createFeedbackFromQuickRate`, causing duplicate skill history entries. Fixed by always passing `{ skillsAlreadyWritten: true }` since both paths write skills before feedback.
19. **`badgeAwarded` stored raw badge IDs instead of labels** — `use-session-completion.ts:687` joined `athleteData.badges` (array of IDs like `"badge_best_training"`) directly. Parent saw raw IDs instead of human-readable labels like `"Standout Session"`. Fixed by resolving each badge ID to its label via `availableBadges.find()` before joining.
20. **`session-feedback-sections.tsx` displayed skill ratings as `/10` but data is 1-5** — `SkillRatingsGrid` line 134 showed `{sr.rating}/10` but `SessionFeedback.skillRatings[].rating` is always 1-5 (coach input scale). Parent saw "3/10" instead of "3/5". Fixed to `/5`.
21. **`session-feedback-sections.tsx` didn't split comma-separated badges** — `FeedbackCardDetails` line 212 rendered `feedback.badgeAwarded` as a single string. Multiple badges like `"Session Leader, Vision & Passing"` showed as one label instead of two. Fixed to split on comma like `coach-says-card.tsx` does.
22. **Quick-rate feedback visibility ignored `shareNotesWithParents`** — `createFeedbackFromQuickRate` line 315 defaulted `visibility` to `'athlete'` regardless of coach's sharing toggle. Athletes with quick-rate data had feedback hidden from parents even when coach enabled sharing. Fixed by adding `visibility` to `QuickRateInput`, passing `shareNotesWithParents ? 'parent' : 'coach_only'` from session completion, and using `input.visibility` in `createFeedbackFromQuickRate`.
23. **Trend showed "improving" after skill decline** — `progress-skills-service.ts:99-107` compared average of last 3 history entries vs first of those 3. Going 4→8→6: avg(4,8,6)=6 > 4+0.3 → "improving" despite dropping from 8 to 6. Parent saw green dot when skill regressed. Fixed to compare current level vs previous level directly.
24. **`CompactFeedbackCard` showed 0 stars when `overallPerformance=0`** — `session-feedback-sections.tsx:95` had `<RatingStars rating={feedback.overallPerformance} />` with no fallback. Fixed to `feedback.overallPerformance || feedback.effortRating`.
25. **`updateSkillLevel()` had zero input validation** — `progress-skills-service.ts:72` wrote `newLevel` directly to storage with no clamp or NaN check. NaN, 0, -5, 100 all written as-is. Fixed with `Number.isFinite()` check and `Math.max(1, Math.min(10, Math.round()))` clamp, defaulting NaN to 5.
26. **`createFeedbackFromQuickRate` wrote `effortRating` without validation** — `progress-feedback-service.ts:307` wrote `input.effort` directly. Fixed with `Number.isFinite()` check and 1-5 clamp, defaulting to 3.
27. **Dev screen edit destroyed `fourCorners` and `positionPlayed`** — `hooks/use-dev-session.ts:285-303` didn't write these fields. Upsert spread `{...previousFeedback, ...feedback}` replaced them with `undefined`. Fixed `addSessionFeedback` to preserve `fourCorners` and `positionPlayed` from existing feedback when new payload has `undefined`.
28. **Color thresholds misaligned with label boundaries** — `skill-level-helpers.ts:53-58` used thresholds at 3/5/8, making "Good" (level 3-4) appear in warning orange and "Very Good"/"Excellent" share the same color. Fixed to align with 5 label tiers: Developing=warning, Good=muted, Very Good=rating, Excellent=tint, Exceptional=success.
