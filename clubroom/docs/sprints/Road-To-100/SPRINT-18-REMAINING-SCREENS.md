# Sprint 18: All Remaining Screens

> **Phase:** 2 — Screen Decomposition (FINAL SPRINT)
> **Target:** 56 screens decomposed to <250 lines each
> **Quality Bar:** This completes Phase 2. After this sprint, ZERO screens should be over 250 lines.
> **Estimated Effort:** 12-16 hours (recommend splitting into 4 parallel agent batches)

---

## Pre-Flight Checklist

Before writing ANY code:

1. **Read `CLAUDE.md`** — memorize architecture rules
2. **Read `hooks/use-screen.ts`** — `useScreen()` API
3. **Read `components/ui/screen-states.tsx`** — `LoadingState`, `ErrorState`, `EmptyState`
4. **Read `components/primitives/index.ts`** — `Row`, `Column`, `Center`, `Spacer`, `SurfaceCard`
5. **Read Sprints 13-17 patterns** — all decomposition patterns are established by now. REUSE them.
6. **Check `components/` directories** for components already created in Sprints 13-17. Do NOT recreate existing components.

---

## Parallel Agent Batch Strategy

This sprint has 56 screens. Recommend splitting into 4 parallel agent batches by feature group. Each batch is independent — no cross-batch dependencies.

| Batch | Feature Groups | Screens | Estimated Hours |
|-------|---------------|---------|----------------|
| **A** | Roster, Drills, Earnings, Invites | 12 | 3-4h |
| **B** | Family, Children, Health | 10 | 3-4h |
| **C** | Goals, Skills, Videos, Availability | 13 | 3-4h |
| **D** | Settings, Verification, Packages, Referrals, Admin, Other | 21 | 3-4h |

Each batch agent should:
1. Read this document (full sprint doc)
2. Read `CLAUDE.md`
3. Read `hooks/use-screen.ts` and `components/ui/screen-states.tsx`
4. Process screens in their batch sequentially (largest first)
5. Run TypeScript compilation after each screen
6. Run full test suite after completing all screens in the batch

---

## Batch A: Roster, Drills, Earnings, Invites (12 screens)

### Roster & Athletes (5 screens)

| # | File | Lines | Archetype | Variant | Dir |
|---|------|-------|-----------|---------|-----|
| A1 | `app/roster/[athleteId]/index.tsx` | 1076 | Detail | detail | `components/roster/` |
| A2 | `app/invites.tsx` | 751 | List | list | `components/invite/` |
| A3 | `app/roster/[athleteId]/emergency.tsx` | 537 | Form | form | `components/roster/` |
| A4 | `app/roster/consents.tsx` | 421 | List | list | `components/roster/` |
| A5 | `app/roster/[athleteId]/add-to-session.tsx` | <300 | Form | form | `components/roster/` |

**A1: `app/roster/[athleteId]/index.tsx` (1076 lines) — Athlete Profile**

This is the LARGEST file in Batch A. Detail screen showing full athlete profile within the coach's roster.

Decomposition plan:
1. **Read the entire file.** Identify: athlete header (photo, name, age, sport), contact info, parent info, session history, notes, medical info, skill levels, badges.
2. **Use `useScreen()`** to load athlete profile + related data.
3. **Create sub-components** in `components/roster/`:
   - `components/roster/athlete-profile-header.tsx` — Avatar, name, age, sport, level
   - `components/roster/athlete-contact-info.tsx` — Parent name, phone, email
   - `components/roster/athlete-session-history.tsx` — Recent sessions attended
   - `components/roster/athlete-notes-section.tsx` — Coach notes about this athlete
   - `components/roster/athlete-medical-info.tsx` — Medical notes, allergies (sensitive)
   - `components/roster/athlete-skill-overview.tsx` — Key skills at a glance
   - `components/roster/athlete-action-bar.tsx` — Message parent, Add to session, Edit
4. Screen file: <250 lines.

**A2: `app/invites.tsx` (751 lines) — All Invites List**

Decomposition plan:
1. **Use `useScreen()`** + FlatList.
2. **Reuse** `components/invite/invite-list-card.tsx` from Sprint 13 if it exists.
3. **Create if needed:**
   - `components/invite/invite-tab-bar.tsx` — Sent/Received/All tabs
4. Filter with local state + `useMemo`. <250 lines.

**A3: `app/roster/[athleteId]/emergency.tsx` (537 lines) — Emergency Contacts**

Decomposition plan:
1. **Create sub-components** in `components/roster/`:
   - `components/roster/emergency-contact-card.tsx` — Contact name, phone, relationship (memo!)
   - `components/roster/emergency-contact-form.tsx` — Add/edit contact form fields
2. Screen file: KeyboardAvoidingView. `useScreen()`. <250 lines.

**A4: `app/roster/consents.tsx` (421 lines) — Consents Management**

Decomposition plan:
1. **Create sub-components** in `components/roster/`:
   - `components/roster/consent-card.tsx` — Consent item with status (signed/pending) (memo!)
   - `components/roster/consent-header.tsx` — Summary + filter
2. Screen file: FlatList. <250 lines.

**A5: `app/roster/[athleteId]/add-to-session.tsx` (<300 lines)**

Close to target. Add `useScreen()` + 4 state branches if missing. Minor extraction if needed. <250 lines.

---

### Drills (3 screens)

| # | File | Lines | Archetype | Variant | Dir |
|---|------|-------|-----------|---------|-----|
| A6 | `app/drills/assign.tsx` | 685 | Form | form | `components/drills/` |
| A7 | `app/drills/library.tsx` | 415 | List | list | `components/drills/` |
| A8 | `app/drills/index.tsx` | 392 | List | list | `components/drills/` |

**A6: `app/drills/assign.tsx` (685 lines) — Assign Drills**

Decomposition plan:
1. **Create sub-components** in `components/drills/`:
   - `components/drills/assign-drill-picker.tsx` — Drill selection from library (searchable)
   - `components/drills/assign-athlete-picker.tsx` — Athlete multi-select
   - `components/drills/assign-schedule.tsx` — Due date, frequency settings
   - `components/drills/assign-submit-bar.tsx` — Assign button
2. Screen file: KeyboardAvoidingView. <250 lines.

**A7: `app/drills/library.tsx` (415 lines) — Drill Library**

Decomposition plan:
1. **Create sub-components** in `components/drills/`:
   - `components/drills/drill-card.tsx` — Drill card with name, difficulty, sport (memo!)
   - `components/drills/drill-filter-bar.tsx` — Filter by sport, difficulty, category
2. Screen file: `useScreen()` + FlatList + pull-to-refresh. <250 lines.

**A8: `app/drills/index.tsx` (392 lines) — Drills Dashboard**

Decomposition plan:
1. **Create sub-components** in `components/drills/`:
   - `components/drills/drill-assigned-section.tsx` — Assigned drills summary
   - `components/drills/drill-quick-actions.tsx` — "Assign drill", "Browse library" buttons
2. Screen file: `useScreen()` + ScrollView. <250 lines.

---

### Earnings & Wallet (3 screens)

| # | File | Lines | Archetype | Variant | Dir |
|---|------|-------|-----------|---------|-----|
| A9 | `app/earnings.tsx` | 904 | Dashboard | card | `components/earnings/` |
| A10 | `app/wallet/promo.tsx` | 399 | Form/List | form | `components/wallet/` |
| A11 | `app/payment/methods.tsx` | <300 | List | list | `components/payment/` |

**A9: `app/earnings.tsx` (904 lines) — Earnings Dashboard**

Decomposition plan:
1. **Read the file.** Identify: earnings summary, chart, transaction history, payout info.
2. **Use `useScreen()`** to load earnings data.
3. **Create sub-components** in `components/earnings/`:
   - `components/earnings/earnings-summary-card.tsx` — Total, this month, pending
   - `components/earnings/earnings-chart.tsx` — Earnings over time chart
   - `components/earnings/earnings-transaction-list.tsx` — Transaction history (FlatList, memo items!)
   - `components/earnings/earnings-transaction-card.tsx` — Individual transaction (memo!)
   - `components/earnings/earnings-payout-section.tsx` — Next payout date, payout method
4. Screen file: <250 lines.

**A10: `app/wallet/promo.tsx` (399 lines) — Promo Codes**

1. Extract `components/wallet/promo-code-card.tsx` (memo!) + `promo-input-section.tsx`
2. `useScreen()`. <250 lines.

**A11: `app/payment/methods.tsx` (<300 lines)**

Close to target. Add `useScreen()` + 4 states. Minor extraction if needed. <250 lines.

---

### Batch A Verification

```bash
wc -l app/roster/\[athleteId\]/index.tsx app/invites.tsx app/roster/\[athleteId\]/emergency.tsx app/roster/consents.tsx app/roster/\[athleteId\]/add-to-session.tsx app/drills/assign.tsx app/drills/library.tsx app/drills/index.tsx app/earnings.tsx app/wallet/promo.tsx app/payment/methods.tsx
```

---

## Batch B: Family, Children, Health (10 screens)

### Family & Children (7 screens)

| # | File | Lines | Archetype | Variant | Dir |
|---|------|-------|-----------|---------|-----|
| B1 | `app/family/sharing.tsx` | 656 | Form/Detail | form | `components/family/` |
| B2 | `app/child/[id]/emergency.tsx` | 490 | Form | form | `components/family/` |
| B3 | `app/children/badges/[childId].tsx` | 465 | Grid | card | `components/family/` |
| B4 | `app/family/spending.tsx` | 446 | Dashboard | card | `components/family/` |
| B5 | `app/child/[id]/medical.tsx` | 443 | Form | form | `components/family/` |
| B6 | `app/family/index.tsx` | 386 | Dashboard | card | `components/family/` |
| B7 | `app/family/calendar.tsx` | 324 | Calendar | calendar | `components/family/` |

**B1: `app/family/sharing.tsx` (656 lines) — Family Sharing**

Decomposition plan:
1. **Create sub-components** in `components/family/`:
   - `components/family/sharing-member-list.tsx` — Family members with permissions (FlatList, memo!)
   - `components/family/sharing-member-card.tsx` — Member card with toggle permissions (memo!)
   - `components/family/sharing-invite-section.tsx` — Invite family member (email/link)
   - `components/family/sharing-permissions.tsx` — Permission settings (view bookings, manage payments, etc.)
2. Screen file: `useScreen()`. <250 lines.

**B2: `app/child/[id]/emergency.tsx` (490 lines) — Child Emergency Contacts**

Similar pattern to roster emergency contacts (Batch A3). Reuse `components/roster/emergency-contact-card.tsx` if possible, or create `components/family/child-emergency-card.tsx`.
1. Extract form and list components.
2. `useScreen()` + KeyboardAvoidingView. <250 lines.

**B3: `app/children/badges/[childId].tsx` (465 lines) — Child's Badges**

1. Reuse `components/development/badge-grid-card.tsx` from Sprint 17 if it exists.
2. Create `components/family/child-badge-header.tsx` — child name + badge count.
3. `useScreen()` + FlatList numColumns grid. <250 lines.

**B4: `app/family/spending.tsx` (446 lines) — Family Spending**

1. **Create sub-components** in `components/family/`:
   - `components/family/spending-summary-card.tsx` — Total spent, this month
   - `components/family/spending-per-child.tsx` — Spending breakdown per child
   - `components/family/spending-transaction-list.tsx` — Transaction history
2. `useScreen()` + ScrollView. <250 lines.

**B5: `app/child/[id]/medical.tsx` (443 lines) — Child Medical Info**

1. **Create sub-components** in `components/family/`:
   - `components/family/medical-info-section.tsx` — Conditions, allergies, medications
   - `components/family/medical-contacts.tsx` — Doctor, specialist contacts
   - `components/family/medical-notes.tsx` — Additional notes textarea
2. KeyboardAvoidingView. `useScreen()`. <250 lines.

**B6: `app/family/index.tsx` (386 lines) — Family Dashboard**

1. Extract: `components/family/family-member-grid.tsx`, `family-upcoming-sessions.tsx`, `family-quick-actions.tsx`.
2. `useScreen()` + ScrollView. <250 lines.

**B7: `app/family/calendar.tsx` (324 lines) — Family Calendar**

Close to target. Extract calendar view if >250 lines. Use `LoadingState variant="calendar"`. <250 lines.

---

### Health (3 screens)

| # | File | Lines | Archetype | Variant | Dir |
|---|------|-------|-----------|---------|-----|
| B8 | `app/health/index.tsx` | 451 | Dashboard | card | `components/health/` |
| B9 | `app/health/[id].tsx` | 441 | Detail | detail | `components/health/` |
| B10 | `app/health/injuries.tsx` | 314 | List | list | `components/health/` |

**B8: `app/health/index.tsx` (451 lines) — Health Dashboard**

1. **Create sub-components** in `components/health/`:
   - `components/health/health-summary-card.tsx` — Current status overview
   - `components/health/health-injury-list.tsx` — Active injuries/conditions
   - `components/health/health-quick-actions.tsx` — Log injury, view history
2. `useScreen()` + ScrollView. <250 lines.

**B9: `app/health/[id].tsx` (441 lines) — Health Record Detail**

1. **Create sub-components** in `components/health/`:
   - `components/health/health-record-header.tsx` — Condition name, severity, date
   - `components/health/health-record-timeline.tsx` — Update history
   - `components/health/health-record-actions.tsx` — Update status, clear, edit
2. `useScreen()` + 4 states. <250 lines.

**B10: `app/health/injuries.tsx` (314 lines) — Injury List**

Close to target. Extract `components/health/injury-card.tsx` (memo!). `useScreen()` + FlatList. <250 lines.

---

### Batch B Verification

```bash
wc -l app/family/sharing.tsx app/child/\[id\]/emergency.tsx app/children/badges/\[childId\].tsx app/family/spending.tsx app/child/\[id\]/medical.tsx app/family/index.tsx app/family/calendar.tsx app/health/index.tsx app/health/\[id\].tsx app/health/injuries.tsx
```

---

## Batch C: Goals, Skills, Videos, Availability (13 screens)

### Goals & Skills (4 screens)

| # | File | Lines | Archetype | Variant | Dir |
|---|------|-------|-----------|---------|-----|
| C1 | `app/goals/[id].tsx` | 670 | Detail | detail | `components/goals/` |
| C2 | `app/skills/[category].tsx` | 572 | List | list | `components/skills/` |
| C3 | `app/goals/index.tsx` | 430 | List | list | `components/goals/` |
| C4 | `app/skills/index.tsx` | 311 | List | list | `components/skills/` |

**C1: `app/goals/[id].tsx` (670 lines) — Goal Detail**

1. **Create sub-components** in `components/goals/`:
   - `components/goals/goal-header.tsx` — Goal title, target, progress ring
   - `components/goals/goal-progress-bar.tsx` — Visual progress (animated)
   - `components/goals/goal-milestones.tsx` — Milestone checklist
   - `components/goals/goal-activity-log.tsx` — Recent activity toward goal
   - `components/goals/goal-actions.tsx` — Update progress, edit, complete
2. `useScreen()` + 4 states. ScrollView. <250 lines.

**C2: `app/skills/[category].tsx` (572 lines) — Skill Category**

1. **Create sub-components** in `components/skills/`:
   - `components/skills/skill-category-header.tsx` — Category name, icon, description
   - `components/skills/skill-list-card.tsx` — Skill card with level indicator (memo!)
   - `components/skills/skill-progress-indicator.tsx` — Level 1-5 visual indicator
2. `useScreen()` + FlatList. <250 lines.

**C3: `app/goals/index.tsx` (430 lines) — Goals List**

1. Create `components/goals/goal-card.tsx` (memo!) + `goal-filter-bar.tsx`.
2. `useScreen()` + FlatList + pull-to-refresh. <250 lines.

**C4: `app/skills/index.tsx` (311 lines) — Skills Overview**

Close to target. Extract `components/skills/skill-category-card.tsx` (memo!). <250 lines.

---

### Videos (5 screens)

| # | File | Lines | Archetype | Variant | Dir |
|---|------|-------|-----------|---------|-----|
| C5 | `app/videos/annotate/[id].tsx` | 563 | Editor | detail | `components/video/` |
| C6 | `app/videos/review/[id].tsx` | 538 | Detail | detail | `components/video/` |
| C7 | `app/videos/[id].tsx` | 481 | Detail | detail | `components/video/` |
| C8 | `app/videos/upload.tsx` | 346 | Form | form | `components/video/` |
| C9 | `app/videos/index.tsx` | 321 | List | list | `components/video/` |

**C5: `app/videos/annotate/[id].tsx` (563 lines) — Video Annotation Editor**

This is a specialized screen with video player + annotation tools.

1. **Create sub-components** in `components/video/`:
   - `components/video/annotation-player.tsx` — Video player with annotation overlay
   - `components/video/annotation-toolbar.tsx` — Drawing tools (pen, arrow, circle, text)
   - `components/video/annotation-timeline.tsx` — Timeline scrubber with annotation markers
   - `components/video/annotation-list.tsx` — List of annotations at timestamps
2. Screen file: `useScreen()` to load video + existing annotations. <250 lines.

**Note:** Video player components may inherently need >250 lines due to playback controls. If so, split the player controls into their own component.

**C6: `app/videos/review/[id].tsx` (538 lines) — Video Review**

1. **Create sub-components** in `components/video/`:
   - `components/video/review-player.tsx` — Video player with annotation display (view-only)
   - `components/video/review-feedback-section.tsx` — Coach feedback text
   - `components/video/review-annotation-markers.tsx` — Visual annotation markers overlay
2. `useScreen()` + 4 states. <250 lines.

**C7: `app/videos/[id].tsx` (481 lines) — Video Detail**

1. **Create sub-components** in `components/video/`:
   - `components/video/video-detail-player.tsx` — Video player with controls
   - `components/video/video-info-card.tsx` — Title, date, athlete, duration
   - `components/video/video-actions.tsx` — Annotate, Share, Delete buttons
2. `useScreen()` + 4 states. <250 lines.

**C8: `app/videos/upload.tsx` (346 lines) — Video Upload**

1. Extract `components/video/upload-picker.tsx` + `upload-metadata-form.tsx`.
2. KeyboardAvoidingView. <250 lines.

**C9: `app/videos/index.tsx` (321 lines) — Video Library**

Close to target. Extract `components/video/video-card.tsx` (memo!). `useScreen()` + FlatList. <250 lines.

---

### Availability (4 screens)

| # | File | Lines | Archetype | Variant | Dir |
|---|------|-------|-----------|---------|-----|
| C10 | `app/availability/scheduling-rules.tsx` | 597 | Form | form | `components/availability/` |
| C11 | `app/availability/calendar.tsx` | 508 | Calendar | calendar | `components/availability/` |
| C12 | `app/availability/edit-template.tsx` | 388 | Form | form | `components/availability/` |
| C13 | `app/availability/add-template.tsx` | 315 | Form | form | `components/availability/` |

**C10: `app/availability/scheduling-rules.tsx` (597 lines) — Scheduling Rules**

1. **Create sub-components** in `components/availability/`:
   - `components/availability/rules-advance-booking.tsx` — Max advance booking days
   - `components/availability/rules-notice-period.tsx` — Minimum notice (hours)
   - `components/availability/rules-buffer-time.tsx` — Buffer between sessions
   - `components/availability/rules-same-day.tsx` — Same-day booking toggle
   - `components/availability/rules-submit-bar.tsx` — Save button
2. KeyboardAvoidingView + ScrollView. `useScreen()`. <250 lines.

**C11: `app/availability/calendar.tsx` (508 lines) — Availability Calendar**

1. **Create sub-components** in `components/availability/`:
   - `components/availability/availability-calendar-grid.tsx` — Calendar with available slots highlighted
   - `components/availability/availability-day-slots.tsx` — Slots for selected day
   - `components/availability/availability-slot-card.tsx` — Individual slot (memo!)
2. `useScreen()` + `LoadingState variant="calendar"`. <250 lines.

**C12: `app/availability/edit-template.tsx` (388 lines) — Edit Template**

1. Extract form sections: `components/availability/template-day-selector.tsx`, `template-time-ranges.tsx`.
2. KeyboardAvoidingView. <250 lines.

**C13: `app/availability/add-template.tsx` (315 lines) — Add Template**

Close to target. Reuse components from C12. <250 lines.

---

### Batch C Verification

```bash
wc -l app/goals/\[id\].tsx app/goals/index.tsx app/skills/\[category\].tsx app/skills/index.tsx app/videos/annotate/\[id\].tsx app/videos/review/\[id\].tsx app/videos/\[id\].tsx app/videos/upload.tsx app/videos/index.tsx app/availability/scheduling-rules.tsx app/availability/calendar.tsx app/availability/edit-template.tsx app/availability/add-template.tsx
```

---

## Batch D: Settings, Verification, Packages, Referrals, Admin, Other (21 screens)

### Settings (8 screens)

| # | File | Lines | Archetype | Variant | Dir |
|---|------|-------|-----------|---------|-----|
| D1 | `app/settings/coaching.tsx` | 487 | Form | form | `components/settings/` |
| D2 | `app/settings/calendar-sync.tsx` | 366 | Form | form | `components/settings/` |
| D3 | `app/settings/account.tsx` | 350 | Form | form | `components/settings/` |
| D4 | `app/settings/help.tsx` | 349 | List | list | `components/settings/` |
| D5 | `app/settings/index.tsx` | 329 | List | list | `components/settings/` |
| D6 | `app/settings/notifications/preferences.tsx` | 330 | Form | form | `components/settings/` |
| D7 | `app/settings/appearance.tsx` | 314 | Form | form | `components/settings/` |

All settings screens follow the same pattern:
1. **Reuse** `components/settings/settings-group.tsx` and `settings-row.tsx` from Sprint 14 if created.
2. **Each settings screen** extracts its specific form sections.
3. **Toggle settings** use Switch components within settings rows.
4. Most are close to target — extract 1-2 sub-components + add `useScreen()` if loading user data.

**D1: `app/settings/coaching.tsx` (487 lines) — Coaching Settings**

1. **Create sub-components** in `components/settings/`:
   - `components/settings/coaching-session-defaults.tsx` — Default session duration, price
   - `components/settings/coaching-booking-rules.tsx` — Auto-accept, approval required
   - `components/settings/coaching-visibility.tsx` — Profile visibility, searchable toggle
2. KeyboardAvoidingView + ScrollView. <250 lines.

**D2-D7:** Similar patterns. Each needs 1-2 sub-component extractions. All <250 lines.

For D4 (`help.tsx`): This is a static list of help topics/FAQ. May not need `useScreen()` at all — just ScrollView with SurfaceCard links. Extract `components/settings/help-topic-card.tsx` (memo!).

For D6 (`notifications/preferences.tsx`): Extract `components/settings/notification-toggle-group.tsx` — group of toggles per notification type.

For D7 (`appearance.tsx`): Extract `components/settings/theme-selector.tsx` — light/dark/system toggle.

---

### Verification (4 screens)

| # | File | Lines | Archetype | Variant | Dir |
|---|------|-------|-----------|---------|-----|
| D8 | `app/verification/credentials.tsx` | 459 | Form | form | `components/verification/` |
| D9 | `app/verification/index.tsx` | 354 | Dashboard | card | `components/verification/` |
| D10 | `app/verification/id.tsx` | 337 | Form | form | `components/verification/` |
| D11 | `app/verification/background.tsx` | 327 | Form | form | `components/verification/` |

**D8: `app/verification/credentials.tsx` (459 lines) — Credentials Upload**

1. **Create sub-components** in `components/verification/`:
   - `components/verification/credential-upload-card.tsx` — Upload area with status (pending/verified/rejected) (memo!)
   - `components/verification/credential-list.tsx` — List of uploaded credentials
   - `components/verification/credential-status-badge.tsx` — Status badge component
2. `useScreen()`. <250 lines.

**D9: `app/verification/index.tsx` (354 lines) — Verification Dashboard**

1. Extract: `components/verification/verification-progress.tsx` (checklist with status per item), `verification-action-card.tsx`.
2. `useScreen()` + 4 states. <250 lines.

**D10-D11:** Similar form patterns. Extract upload sections and status displays. Each <250 lines.

---

### Packages, Referrals, Badges, Other (9 screens)

| # | File | Lines | Archetype | Variant | Dir |
|---|------|-------|-----------|---------|-----|
| D12 | `app/discover-sessions.tsx` | 496 | List | card | `components/discover/` |
| D13 | `app/admin/promo-codes.tsx` | 496 | List | list | `components/admin/` |
| D14 | `app/packages/manage.tsx` | 455 | List | list | `components/packages/` |
| D15 | `app/packages/[id].tsx` | 455 | Detail | detail | `components/packages/` |
| D16 | `app/referrals/invite.tsx` | 462 | Form | form | `components/referrals/` |
| D17 | `app/invoices/[id].tsx` | 413 | Detail | detail | `components/invoices/` |
| D18 | `app/analytics/retention.tsx` | 412 | Dashboard | card | `components/analytics/` |
| D19 | `app/referrals/index.tsx` | 385 | Dashboard | card | `components/referrals/` |
| D20 | `app/events/create.tsx` | 378 | Form | form | `components/event/` |
| D21 | `app/badges/index.tsx` | 369 | Grid | card | `components/badges/` |
| D22 | `app/events/[id]/attendees.tsx` | 316 | List | list | `components/event/` |
| D23 | `app/book/[coachId]/multi-week.tsx` | 322 | Form | form | `components/booking/` |
| D24 | `app/development/athlete-session/[sessionId].tsx` | 303 | Detail | detail | `components/development/` |

**D12: `app/discover-sessions.tsx` (496 lines) — Discover Sessions**

1. **Create sub-components** in `components/discover/`:
   - `components/discover/discover-search-bar.tsx` — Search + location filter
   - `components/discover/discover-session-card.tsx` — Session card with coach, time, price (memo!)
   - `components/discover/discover-filter-chips.tsx` — Sport, price range, date filter chips
2. `useScreen()` + FlatList + pull-to-refresh. <250 lines.

**D13: `app/admin/promo-codes.tsx` (496 lines) — Admin Promo Codes**

1. **Create sub-components** in `components/admin/`:
   - `components/admin/promo-code-card.tsx` — Code, usage count, status (memo!)
   - `components/admin/promo-create-form.tsx` — Create new promo code form
2. `useScreen()` + FlatList. <250 lines.

**D14: `app/packages/manage.tsx` (455 lines) — Manage Packages**

1. **Create sub-components** in `components/packages/`:
   - `components/packages/package-card.tsx` — Package card with sessions count, price (memo!)
   - `components/packages/package-list-header.tsx` — Title + "Create package" button
2. `useScreen()` + FlatList. <250 lines.

**D15: `app/packages/[id].tsx` (455 lines) — Package Detail**

1. **Create sub-components** in `components/packages/`:
   - `components/packages/package-header.tsx` — Name, price, description
   - `components/packages/package-sessions.tsx` — Included sessions list
   - `components/packages/package-actions.tsx` — Edit, deactivate, share
2. `useScreen()` + 4 states. <250 lines.

**D16: `app/referrals/invite.tsx` (462 lines) — Refer a Friend**

1. **Create sub-components** in `components/referrals/`:
   - `components/referrals/referral-code-card.tsx` — Unique referral code + copy button
   - `components/referrals/referral-share-section.tsx` — Share via WhatsApp/SMS/Email
   - `components/referrals/referral-rewards.tsx` — What you earn for referrals
2. `useScreen()`. <250 lines.

**D17: `app/invoices/[id].tsx` (413 lines) — Invoice Detail**

1. **Create sub-components** in `components/invoices/`:
   - `components/invoices/invoice-header.tsx` — Invoice number, date, status
   - `components/invoices/invoice-line-items.tsx` — Line items table
   - `components/invoices/invoice-total.tsx` — Subtotal, tax, total
   - `components/invoices/invoice-actions.tsx` — Download PDF, Send, Mark paid
2. `useScreen()` + 4 states. <250 lines.

**D18: `app/analytics/retention.tsx` (412 lines) — Retention Analytics**

1. Reuse `components/analytics/` from Sprint 17.
2. Create: `components/analytics/retention-chart.tsx`, `retention-cohort-table.tsx`.
3. `useScreen()`. <250 lines.

**D19-D24:** All close to or under target. Each needs 1-2 sub-component extractions + `useScreen()` + 4 state branches if missing. Follow the established patterns.

---

### Batch D Verification

```bash
wc -l app/settings/coaching.tsx app/settings/calendar-sync.tsx app/settings/account.tsx app/settings/help.tsx app/settings/index.tsx app/settings/notifications/preferences.tsx app/settings/appearance.tsx app/verification/credentials.tsx app/verification/index.tsx app/verification/id.tsx app/verification/background.tsx app/discover-sessions.tsx app/admin/promo-codes.tsx app/packages/manage.tsx app/packages/\[id\].tsx app/referrals/invite.tsx app/referrals/index.tsx app/badges/index.tsx app/events/create.tsx app/events/\[id\]/attendees.tsx app/invoices/\[id\].tsx app/analytics/retention.tsx app/book/\[coachId\]/multi-week.tsx app/development/athlete-session/\[sessionId\].tsx
```

---

## Final Verification (ALL Batches)

After ALL 4 batches complete, run these from the `clubroom/` directory:

```bash
# 1. TypeScript compilation (MUST pass with zero errors)
npx tsc -p tsconfig.test.json

# 2. Run ALL tests (MUST pass — zero regressions)
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js

# 3. Count screens still over 250 lines (target: 0)
find app/ -name "*.tsx" -exec sh -c 'lines=$(wc -l < "$1"); if [ "$lines" -gt 250 ]; then echo "$lines $1"; fi' _ {} \; | sort -rn

# 4. Verify useScreen usage across all screens (spot check — should be widespread)
grep -rl "useScreen" app/ | wc -l

# 5. Verify no Colors.light in any screen
grep -r "Colors\.light\." app/ | grep -v node_modules | head -10

# 6. Verify no TouchableOpacity anywhere
grep -r "TouchableOpacity" app/ components/ | grep -v node_modules | head -10

# 7. Verify no raw flexDirection in new sub-components (spot check)
grep -rn "flexDirection" components/roster/ components/drills/ components/earnings/ components/family/ components/health/ components/goals/ components/skills/ components/video/ components/availability/ components/settings/ components/verification/ components/discover/ components/packages/ components/referrals/ components/invoices/ components/carpool/ 2>/dev/null | head -20
```

---

## Sub-Component Directory Structure (New directories from this sprint)

```
components/
  roster/
    athlete-profile-header.tsx
    athlete-contact-info.tsx
    athlete-session-history.tsx
    athlete-notes-section.tsx
    athlete-medical-info.tsx
    athlete-skill-overview.tsx
    athlete-action-bar.tsx
    emergency-contact-card.tsx
    emergency-contact-form.tsx
    consent-card.tsx
    consent-header.tsx
  drills/
    assign-drill-picker.tsx
    assign-athlete-picker.tsx
    assign-schedule.tsx
    assign-submit-bar.tsx
    drill-card.tsx
    drill-filter-bar.tsx
    drill-assigned-section.tsx
    drill-quick-actions.tsx
  earnings/
    earnings-summary-card.tsx
    earnings-chart.tsx
    earnings-transaction-list.tsx
    earnings-transaction-card.tsx
    earnings-payout-section.tsx
  family/
    sharing-member-list.tsx
    sharing-member-card.tsx
    sharing-invite-section.tsx
    sharing-permissions.tsx
    child-emergency-card.tsx
    child-badge-header.tsx
    spending-summary-card.tsx
    spending-per-child.tsx
    spending-transaction-list.tsx
    medical-info-section.tsx
    medical-contacts.tsx
    medical-notes.tsx
    family-member-grid.tsx
    family-upcoming-sessions.tsx
    family-quick-actions.tsx
  health/
    health-summary-card.tsx
    health-injury-list.tsx
    health-quick-actions.tsx
    health-record-header.tsx
    health-record-timeline.tsx
    health-record-actions.tsx
    injury-card.tsx
  goals/
    goal-header.tsx
    goal-progress-bar.tsx
    goal-milestones.tsx
    goal-activity-log.tsx
    goal-actions.tsx
    goal-card.tsx
    goal-filter-bar.tsx
  skills/
    skill-category-header.tsx
    skill-list-card.tsx
    skill-progress-indicator.tsx
    skill-category-card.tsx
  video/
    annotation-player.tsx
    annotation-toolbar.tsx
    annotation-timeline.tsx
    annotation-list.tsx
    review-player.tsx
    review-feedback-section.tsx
    review-annotation-markers.tsx
    video-detail-player.tsx
    video-info-card.tsx
    video-actions.tsx
    upload-picker.tsx
    upload-metadata-form.tsx
    video-card.tsx
  availability/
    rules-advance-booking.tsx
    rules-notice-period.tsx
    rules-buffer-time.tsx
    rules-same-day.tsx
    rules-submit-bar.tsx
    availability-calendar-grid.tsx
    availability-day-slots.tsx
    availability-slot-card.tsx
    template-day-selector.tsx
    template-time-ranges.tsx
  settings/
    coaching-session-defaults.tsx
    coaching-booking-rules.tsx
    coaching-visibility.tsx
    notification-toggle-group.tsx
    theme-selector.tsx
    help-topic-card.tsx
    (settings-group.tsx — from Sprint 14)
    (settings-row.tsx — from Sprint 14)
  verification/
    credential-upload-card.tsx
    credential-list.tsx
    credential-status-badge.tsx
    verification-progress.tsx
    verification-action-card.tsx
  discover/
    discover-search-bar.tsx
    discover-session-card.tsx
    discover-filter-chips.tsx
  packages/
    package-card.tsx
    package-list-header.tsx
    package-header.tsx
    package-sessions.tsx
    package-actions.tsx
  referrals/
    referral-code-card.tsx
    referral-share-section.tsx
    referral-rewards.tsx
  invoices/
    invoice-header.tsx
    invoice-line-items.tsx
    invoice-total.tsx
    invoice-actions.tsx
  admin/
    promo-code-card.tsx
    promo-create-form.tsx
    (invite-code-card.tsx — from Sprint 14)
  wallet/
    promo-code-card.tsx (or reuse from admin)
    promo-input-section.tsx
  carpool/
    (from Sprint 17)
```

---

## Common Pitfalls

1. **This is the biggest sprint.** Use parallel batches. Do NOT try to do all 56 screens sequentially.
2. **Check existing components first.** Sprints 13-17 created many sub-components. Before creating a new component, check if one already exists that can be reused or extended.
3. **Close-to-target screens** (<350 lines) may only need `useScreen()` + 4 state branches + 1-2 minor extractions. Don't over-decompose.
4. **Settings screens** are mostly static. Many may not need `useScreen()` at all — only if they load user-specific data. Static settings lists can just use ScrollView.
5. **Verification screens** deal with file uploads. Keep upload logic in the component, not in a hook.
6. **Video screens** involve media playback. Video player wrappers may be complex. It's OK for a video player component to be 200+ lines, but the SCREEN file must be <250.
7. **Invoice screens** must be formatted precisely. Use monospaced font for numbers and proper alignment.
8. **After each batch completes**, run TypeScript compilation. Do NOT wait until all 4 batches finish to compile — catch errors early.
9. **If a screen file is already <250 lines**, it still needs `useScreen()` + 4 state branches if missing. The line count target is necessary but not sufficient.
10. **Barrel exports:** For new component directories, create `index.ts` files that export all components for clean imports: `import { GoalCard, GoalHeader } from '@/components/goals'`.
