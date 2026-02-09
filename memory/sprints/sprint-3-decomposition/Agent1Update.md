# Sprint 3 -- Component Decomposition (MEGA)
## Agent 1: Critical Components (800+ lines)

**Status**: COMPLETE (5/5 components decomposed)
**Blocked by**: None

---

## Results Summary

| Component | Before | After (max file) | Files | All <=250 | TS Clean |
|-----------|--------|-------------------|-------|-----------|----------|
| onboarding-screen.tsx | 1,209 | 250 | 10 | YES | YES |
| CreateSessionForm.tsx | 636 | 201 | 4 | YES | YES |
| discover-screen.tsx | 979 | 249 | 6 | YES | YES |
| week-pattern-grid.tsx | 978 | 179 | 4 | YES | YES |
| booking-flow.tsx | 570 | 127 | 5 | YES | YES |
| **TOTALS** | **4,372** | -- | **29** | **ALL** | **ALL** |

---

## 1. onboarding-screen.tsx (1,209 -> 10 files, max 250 lines)

**Key changes:**
- Replaced 25+ `useState` with `useReducer` in custom hook
- Replaced old React Native `Animated` API with `react-native-reanimated` (useSharedValue, withTiming, runOnJS, useAnimatedStyle)
- Extracted each wizard step into its own memo'd sub-component
- Compact fail-fast validation pattern in hook

**Files created:**
| File | Lines | Purpose |
|------|-------|---------|
| `components/auth/onboarding-types.ts` | 161 | Types, constants, helpers, INITIAL_STATE |
| `components/auth/use-onboarding.ts` | 248 | useReducer hook, Reanimated animations, validation |
| `components/auth/onboarding-progress-bar.tsx` | 56 | Animated progress bar (Reanimated) |
| `components/auth/onboarding-step-account-type.tsx` | 127 | Account type selection cards |
| `components/auth/onboarding-step-basic-info.tsx` | 216 | Name, email, phone, password fields |
| `components/auth/onboarding-step-location.tsx` | 108 | City, postcode, country fields |
| `components/auth/onboarding-step-athlete.tsx` | 244 | Sport picker, skill level, position |
| `components/auth/onboarding-step-coach.tsx` | 248 | Org toggle, experience, rate, specializations |
| `components/auth/onboarding-step-complete.tsx` | 63 | Success screen |

**File modified:**
| File | Lines | Purpose |
|------|-------|---------|
| `components/auth/onboarding-screen.tsx` | 250 | Composing parent (useOnboarding + step switch) |

---

## 2. CreateSessionForm.tsx (636 -> 4 files, max 201 lines)

**Files created:**
| File | Lines | Purpose |
|------|-------|---------|
| `components/bookings/create-session-type-selector.tsx` | 109 | Session type + recurrence toggles |
| `components/bookings/create-session-date-picker.tsx` | 131 | Platform-specific date/time pickers |
| `components/bookings/create-session-extras.tsx` | 198 | Price, age range, skill focus chips |

**File modified:**
| File | Lines | Purpose |
|------|-------|---------|
| `components/bookings/CreateSessionForm.tsx` | 201 | Composing parent |

---

## 3. discover-screen.tsx (979 -> 6 files, max 249 lines)

**Files created:**
| File | Lines | Purpose |
|------|-------|---------|
| `components/parent/discover-header.tsx` | 154 | Child tabs + postcode search |
| `components/parent/discover-club-hub.tsx` | 159 | Club list + invite code input |
| `components/parent/discover-review-prompt.tsx` | 109 | Review prompt cards |
| `components/parent/discover-pending-invites.tsx` | 120 | Pending invite cards |
| `components/parent/discover-coach-list.tsx` | 163 | Coach cards with details |

**File modified:**
| File | Lines | Purpose |
|------|-------|---------|
| `components/parent/discover-screen.tsx` | 249 | Data loading + composition |

---

## 4. week-pattern-grid.tsx (978 -> 4 files, max 179 lines)

**Files created:**
| File | Lines | Purpose |
|------|-------|---------|
| `components/coach/week-pattern-types.ts` | 55 | Types, constants, formatters |
| `components/coach/week-pattern-setup-mode.tsx` | 168 | First-time setup wizard |
| `components/coach/week-pattern-slot-row.tsx` | 154 | Slot row + add block row |

**File modified:**
| File | Lines | Purpose |
|------|-------|---------|
| `components/coach/week-pattern-grid.tsx` | 179 | Week nav + summary + day rows |

---

## 5. booking-flow.tsx (570 -> 5 files, max 127 lines)

**Files created:**
| File | Lines | Purpose |
|------|-------|---------|
| `components/discover/booking-flow-types.ts` | 82 | Types, constants, builders |
| `components/discover/booking-flow-stepper.tsx` | 118 | Stepper + context cards + callout |
| `components/discover/booking-flow-scheduler.tsx` | 127 | Calendar grid + slot list |
| `components/discover/booking-flow-summary.tsx` | 77 | Summary rows + CTA |

**File modified:**
| File | Lines | Purpose |
|------|-------|---------|
| `components/discover/booking-flow.tsx` | 52 | State management + composition |

---

## Safety Checks

- [x] Every original file is now 250 lines or under (max: 250)
- [x] All extracted sub-components wrapped in `memo()` where they receive callbacks
- [x] `useCallback` on all handlers passed as props
- [x] No `Animated` from react-native (replaced with Reanimated in onboarding)
- [x] TypeScript compiles: all 29 files have zero VS Code diagnostics
- [x] Public API preserved: same exports, same prop interfaces
- [x] Hardcoded `rgba()` in callout replaced with `withAlpha(palette.warning, 0.1)`

## Remaining Components (not assigned to this agent)

The following components from the original PROMPTS.md list were NOT part of my assignment:
- `development-screen.tsx` (939 lines)
- `progress-screen.tsx` (920 lines)
- `session-detail-modal.tsx` (905 lines)
- `recurring-template-modal.tsx` (898 lines)
- `availability-setup-wizard.tsx` (861 lines)
- `time-off-sheet.tsx` (836 lines)
- `day-editor-sheet.tsx` (819 lines)
