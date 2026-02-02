# Sprint 10: The Magic Layer — Onboarding, Celebrations, Delight

## Goal

The app feels ALIVE. New users get guided through setup with a wow moment. Achievements trigger celebrations. One-tap actions for the most common tasks. The app doesn't just work — it feels great to use.

## Why This Matters

The current app is functional but feels like a backend admin tool. Spond is boring but at least it's simple. ClassForKids is transactional. We need to be the app that coaches WANT to open. That parents SHOW their friends. The "magic layer" is the difference between a tool and a product people love.

## User Stories

| Role | Story |
|------|-------|
| **Coach** | When I first sign up, I want a guided tour that makes me excited to use this |
| **Coach** | When I get a 5-star review, I want to feel celebrated |
| **Coach** | When I hit a milestone (50 sessions, 10 athletes), I want recognition |
| **Parent** | When my child earns a badge, I want a celebration I can share |
| **Parent** | I want to respond to match invites with ONE tap from a notification |
| **Parent** | I want session reminders that tell me WHERE to go and WHEN |
| **Athlete** | When I complete a goal, I want to feel like I achieved something |
| **Athlete** | When I unlock a skill tree node, I want a visual reward |
| **All** | I want the app to feel smooth, fast, and responsive |

## Task 1: Coach First-Time Experience

**File**: `components/onboarding/coach-welcome.tsx`

When a coach first logs in, show a 5-screen welcome flow:

**Screen 1 — Welcome**
```
┌─────────────────────────────────────┐
│                                     │
│           ⚽                        │
│                                     │
│     Welcome to Clubroom             │
│                                     │
│  Your coaching business starts here │
│                                     │
│  • Parents find and book you        │
│  • Track player development         │
│  • Grow your reputation             │
│                                     │
│         [Get Started]               │
│                                     │
└─────────────────────────────────────┘
```

**Screen 2 — Profile Quick Setup**
```
┌─────────────────────────────────────┐
│ Let's make you look good            │
│                                     │
│      [📸 Add Photo]                │
│                                     │
│ Your headline:                      │
│ [FA Level 2 Coach | Hackney]        │
│                                     │
│ Quick bio (2-3 lines):              │
│ [I help young players develop...]   │
│                                     │
│ What do you specialise in?          │
│ [Dribbling] [Passing] [Shooting]   │
│ [1v1] [Goalkeeping] [Fitness]      │
│                                     │
│         [Next →]                    │
└─────────────────────────────────────┘
```

**Screen 3 — Set Your Rate**
```
┌─────────────────────────────────────┐
│ What do you charge?                 │
│                                     │
│        £ [40] /hour                 │
│                                     │
│ Coaches in your area charge         │
│ £30-£55 per hour                    │
│                                     │
│ 💡 You can change this anytime     │
│    and set different rates for      │
│    different session types.         │
│                                     │
│         [Next →]                    │
└─────────────────────────────────────┘
```

**Screen 4 — Quick Availability**
```
┌─────────────────────────────────────┐
│ When are you available?             │
│                                     │
│ Tap the times you coach:            │
│                                     │
│        AM    PM    Eve              │
│ Mon    [ ]   [✓]   [ ]             │
│ Tue    [ ]   [✓]   [ ]             │
│ Wed    [ ]   [ ]   [✓]             │
│ Thu    [ ]   [✓]   [ ]             │
│ Fri    [ ]   [ ]   [ ]             │
│ Sat    [✓]   [✓]   [ ]             │
│ Sun    [ ]   [ ]   [ ]             │
│                                     │
│ You can fine-tune exact times later │
│                                     │
│         [Next →]                    │
└─────────────────────────────────────┘
```

**Screen 5 — Ready!**
```
┌─────────────────────────────────────┐
│                                     │
│           🎉                        │
│                                     │
│   Your profile is live!             │
│                                     │
│   Parents can now find and          │
│   book sessions with you.           │
│                                     │
│   ┌──────────────────────────┐     │
│   │ Share your profile:      │     │
│   │ clubroom.app/coach/you   │     │
│   │ [Copy] [Share] [QR]     │     │
│   └──────────────────────────┘     │
│                                     │
│   What's next?                      │
│   → Fine-tune your availability     │
│   → Add qualifications              │
│   → Create a trial session          │
│                                     │
│       [Go to Dashboard]            │
└─────────────────────────────────────┘
```

Quick, painless, gets coach live in under 2 minutes.

## Task 2: Parent First-Time Experience

**File**: `components/onboarding/parent-welcome.tsx`

3-screen flow:

**Screen 1**: "Welcome! Let's set up for [child name]" (already entered during signup)
**Screen 2**: Child details (age, skill level, what they want to improve — big tappable cards)
**Screen 3**: "Here are coaches near you!" → Shows 3 featured coaches + trial sessions available

Gets parent to discovery in under 1 minute.

## Task 3: Achievement Celebrations

**File**: `components/celebrations/`

Full-screen celebration overlays for key moments:

**Badge Earned** (`badge-celebration.tsx`):
```
┌─────────────────────────────────────┐
│                                     │
│        ✨ 🏅 ✨                    │
│                                     │
│     "First Touch Master"            │
│                                     │
│     Awarded to Jake B.              │
│     by Coach Marcus                 │
│                                     │
│     "Exceptional close control      │
│      in today's session"            │
│                                     │
│  [confetti animation]               │
│                                     │
│  [Share with Family]  [Close]       │
│                                     │
└─────────────────────────────────────┘
```

- Confetti animation (use `react-native-confetti-cannon` or similar)
- Badge icon bounces in
- Sound effect (optional, subtle)
- Share button generates image card
- Auto-dismiss after 5 seconds if not interacted with

**Goal Completed** (`goal-celebration.tsx`):
```
┌─────────────────────────────────────┐
│                                     │
│         🎯 GOAL!                   │
│                                     │
│    "Master 10 consecutive          │
│     keepy-ups"                      │
│                                     │
│         ✅ COMPLETED                │
│                                     │
│    Progress: 3/3 milestones        │
│    ████████████████ 100%           │
│                                     │
│  [confetti animation]               │
│                                     │
│  [Share] [Set New Goal] [Close]    │
│                                     │
└─────────────────────────────────────┘
```

**Coach Milestone** (`coach-milestone.tsx`):
```
┌─────────────────────────────────────┐
│                                     │
│         🌟                          │
│                                     │
│    50 Sessions Completed!           │
│                                     │
│    You've coached 50 sessions      │
│    on Clubroom. Keep going!        │
│                                     │
│  [Share Achievement] [Close]       │
│                                     │
└─────────────────────────────────────┘
```

**Coach milestones**: 10, 25, 50, 100, 250, 500 sessions. Also: first 5-star review, 10 athletes on roster, first trial conversion.

**New Review** (`review-celebration.tsx`):
```
┌─────────────────────────────────────┐
│                                     │
│    ⭐⭐⭐⭐⭐ New Review!           │
│                                     │
│    "Brilliant coach. My son's      │
│     confidence has improved         │
│     so much."                       │
│                                     │
│    — Sarah M.                      │
│                                     │
│  [Share on Profile] [Close]        │
│                                     │
└─────────────────────────────────────┘
```

## Task 4: One-Tap Actions

**File**: Various — notification handlers + quick action components

Match invite response from notification:

```
┌─ Push Notification ─────────────────┐
│ U12s vs Arsenal — Sat 8 Feb 10am   │
│ Is Jake available?                   │
│                                     │
│ [✅ Available] [❌ Unavailable]     │
└─────────────────────────────────────┘
```

Parent taps directly from notification — no need to open the app, find the match, and respond. ONE TAP.

Same for session invites:
```
┌─ Push Notification ─────────────────┐
│ Coach Marcus invited Jake to a      │
│ session — Tue 4 Feb 4pm             │
│                                     │
│ [✅ Accept] [View Details]          │
└─────────────────────────────────────┘
```

## Task 5: Smart Session Reminders

**File**: `services/reminder-service.ts`

Auto-generated reminders at 24h and 1h before session:

**24h reminder**:
```
┌─ Push Notification ─────────────────┐
│ Tomorrow: Jake's session with       │
│ Coach Marcus                         │
│ ⏰ 4:00pm · 📍 Hackney Downs Park │
│ Focus: Passing & Movement           │
│                                     │
│ [Get Directions] [View Details]    │
└─────────────────────────────────────┘
```

**1h reminder**:
```
┌─ Push Notification ─────────────────┐
│ In 1 hour: Jake's session           │
│ 📍 Hackney Downs Park              │
│ Don't forget: shin pads, water     │
│                                     │
│ [Get Directions]                    │
└─────────────────────────────────────┘
```

- Location-aware: includes "Get Directions" link (opens Maps)
- Equipment reminder if coach listed equipment in session plan
- Weather check: "⛈️ Heavy rain forecast — check with coach" (using simple weather API)

## Task 6: Micro-Interactions & Polish

**File**: Various UI components

Small touches that make the app feel premium:

| Interaction | Animation |
|-------------|-----------|
| Pull-to-refresh | Bouncy football icon |
| Tab switch | Smooth cross-fade (not hard cut) |
| Card tap | Subtle scale down (0.98) on press |
| Toggle switch | Haptic feedback |
| Favourite coach | Heart fills with colour + scale pop |
| Send message | Swoosh sound + message slides up |
| Complete drill | Checkmark draws itself ✓ |
| Badge award | Badge spins in from top |
| Booking confirmed | Green checkmark pulse |
| Session complete | Card sweeps away with satisfaction |
| Skill level up | Number counts up with glow |
| Star rating | Stars fill left-to-right with delay |

Keep these SUBTLE. No over-the-top animation. Just enough to feel responsive and alive.

## Task 7: Empty States That Educate

Every empty state should tell the user what to do next:

| Screen | Empty State |
|--------|------------|
| Bookings (parent) | [illustration] "No sessions booked yet. Find a coach and book your first session." [Find Coaches] |
| Roster (coach) | [illustration] "Your roster is empty. Athletes appear here after their first session with you." |
| Badges (athlete) | [illustration] "No badges yet. Keep training — your coach will award badges as you improve!" |
| Messages | [illustration] "No conversations yet. Messages with coaches appear here after booking." |
| Videos | [illustration] "No videos yet. Your coach will share session clips here." |
| Goals | [illustration] "No goals set. Work with your coach to set your first training goal." [Set a Goal] |
| Club feed | [illustration] "It's quiet here. Be the first to post!" [Create Post] |

Use simple, football-themed illustrations. Not generic stock art.

## Acceptance Criteria

- [ ] Coach first-time flow: 5 screens, gets profile live in <2 minutes
- [ ] Parent first-time flow: 3 screens, gets to discovery in <1 minute
- [ ] Badge earned triggers full-screen confetti celebration with share button
- [ ] Goal completed triggers celebration with share button
- [ ] Coach milestones celebrated (10, 25, 50, 100 sessions + first review + etc.)
- [ ] Match invite: one-tap "Available/Unavailable" from notification
- [ ] Session invite: one-tap "Accept" from notification
- [ ] 24h and 1h session reminders with location + directions link
- [ ] All micro-interactions implemented (press states, transitions, haptics)
- [ ] All empty states have contextual message + CTA
- [ ] Celebrations are shareable as images (organic marketing)

## Files Changed

| File | Action |
|------|--------|
| `components/onboarding/coach-welcome.tsx` | CREATE |
| `components/onboarding/parent-welcome.tsx` | CREATE |
| `components/celebrations/badge-celebration.tsx` | CREATE |
| `components/celebrations/goal-celebration.tsx` | CREATE |
| `components/celebrations/coach-milestone.tsx` | CREATE |
| `components/celebrations/review-celebration.tsx` | CREATE |
| `components/celebrations/confetti.tsx` | CREATE — reusable confetti |
| `services/reminder-service.ts` | CREATE — auto session reminders |
| `services/milestone-service.ts` | CREATE — track coach milestones |
| All screen files | MODIFY — add micro-interactions |
| All list screens | MODIFY — add contextual empty states |
| `constants/milestones.ts` | CREATE — milestone definitions |
| `constants/empty-states.ts` | CREATE — empty state copy per screen |
