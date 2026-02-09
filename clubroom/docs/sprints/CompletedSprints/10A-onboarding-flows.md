# 10A: Onboarding Flows

**Phase**: 3 — Competitive Edge
**Origin**: Sprint 10, Tasks 1, 2
**Estimated scope**: 2 tasks, first impressions for coach + parent

## Goal

New coaches get live in under 2 minutes. New parents get to discovery in under 1 minute. The first experience is a wow moment.

## Tasks

### Task 1: Coach First-Time Experience

**File**: `components/onboarding/coach-welcome.tsx`

5-screen welcome flow:

**Screen 1 — Welcome**: "Your coaching business starts here" + 3 value props
**Screen 2 — Profile Quick Setup**: Photo, headline, bio, specialties (tappable tags)
**Screen 3 — Set Your Rate**: Slider with area average shown ("Coaches near you charge £30-£55/hr")
**Screen 4 — Quick Availability**: Tap-grid (Mon-Sun × AM/PM/Eve) — fine-tune later
**Screen 5 — Ready!**: Profile is live + share link + QR code + "What's next?" suggestions

Quick, painless, gets coach live in under 2 minutes.

### Task 2: Parent First-Time Experience

**File**: `components/onboarding/parent-welcome.tsx`

3-screen flow:

**Screen 1**: "Welcome! Let's set up for [child name]" (already entered during signup)
**Screen 2**: Child details (age, skill level, what they want to improve — big tappable cards)
**Screen 3**: "Here are coaches near you!" → Shows 3 featured coaches + trial sessions available

Gets parent to discovery in under 1 minute.

## Acceptance Criteria

- [ ] Coach first-time flow: 5 screens, gets profile live in <2 minutes
- [ ] Parent first-time flow: 3 screens, gets to discovery in <1 minute
- [ ] Flows can be skipped
- [ ] Only shown on first login (tracked in AsyncStorage)

## Files Changed

| File | Action |
|------|--------|
| `components/onboarding/coach-welcome.tsx` | CREATE |
| `components/onboarding/parent-welcome.tsx` | CREATE |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 6A (needs auth for first login detection)
