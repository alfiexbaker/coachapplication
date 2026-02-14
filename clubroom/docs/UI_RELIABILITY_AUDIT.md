# UI Reliability Audit (Mobile-First)

This is the UI quality gate for Clubroom.  
Goal: every important flow works on real phones without overlap, dead actions, clipped text, or broken navigation.

## 1) Audit Commands (Run Every PR)

```bash
npm run lint:ui-actions
npm run audit:ui
npm run typecheck
```

## 2) Device Matrix (Must Pass)

Test each critical flow on:

1. iPhone SE (375x667) - smallest iOS baseline
2. iPhone 13/14/15 (390x844)
3. iPhone 15 Pro Max (430x932)
4. Pixel 5 (393x851)
5. Pixel 8 Pro (412x915)
6. Tablet portrait (768x1024)
7. Tablet landscape (1024x768)

Test with:

1. Default text size
2. Large accessibility text
3. Light + dark mode
4. Slow network simulation

## 3) 30 Core Flows to Validate

1. Login (coach)
2. Login (parent)
3. Feed list load
4. Feed post detail open
5. Feed comments open + submit
6. Create post (personal)
7. Create post (club)
8. Development list
9. Open feedback from development row
10. Session feedback submit
11. Open badges from feedback
12. Roster list
13. Add athlete to new session
14. Add athlete to existing session
15. Sessions list (coach)
16. Create session wizard step 1
17. Create session wizard step 2
18. Create session wizard step 3
19. Create session wizard step 4
20. Session invites list
21. Session invite create
22. Club home open
23. Club manage/settings open
24. Club branding/settings edit
25. Club invite code create/share/delete
26. Team/squad open
27. Team member manage
28. Messages thread list
29. Chat thread send message/media
30. Earnings + withdraw flow

## 4) Fail Conditions (Block Release)

1. Any dead CTA or duplicate path to same destination without clear purpose
2. Any clipped primary action/button text
3. Any name/label wrapping into unreadable stacked lines in list rows
4. Any content hidden under notch/safe-area or bottom tab bar
5. Any hydration/runtime UI error in console (example: nested button)
6. Any role breach (parent can access coach-only action)

## 5) Priority Fix Order

1. P0 - Runtime UI errors and broken interactions
2. P1 - Navigation/access dead ends and safe-area issues
3. P2 - Layout quality (alignment, spacing, truncation, visual hierarchy)
4. P3 - Copy tightening and density tuning

## 6) Current Known Risks (Wave 1 Baseline)

From `npm run audit:ui`:

1. Multiple app screens flagged as missing explicit safe-area shell.
2. Fixed large-width blocks exist (example: login screen 360/470).
3. Absolute-position usage is common in analytics/hero/cards and needs review on smallest phones.
4. Spacer-view header hacks remain in some modals.

From runtime logs/screens:

1. Nested button DOM error still appears in feed cards.
2. Unexpected text node inside View appears.
3. Route warning for missing nested `manage` route appears.

## 7) Definition of "Google-grade" Quality for This App

1. One action = one clear outcome.
2. No duplicated top-level paths for same job unless explicitly role/scenario-based.
3. Consistent touch targets (44px+), spacing rhythm, and header patterns.
4. Truncation and single-line strategy for list rows.
5. Responsive layout first, fixed widths only for icons/avatars.
6. Every page is visually stable from 375px width through tablet.
