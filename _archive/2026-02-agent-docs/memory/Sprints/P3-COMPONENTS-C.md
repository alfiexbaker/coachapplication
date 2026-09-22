# P3-COMPONENTS-C — Decompose Bloated Sections (goals through z)

**Category**: Component Layer (70 → 80)
**Scope**: components/goals/, components/invoices/, components/match/, components/messaging/, components/negotiate/, components/notification/, components/onboarding/, components/payment/, components/safety/, components/skills/, components/social/, components/squad/, components/user/, components/video/, components/waitlist/ ONLY.
**Run**: Parallel with P3-A, P3-B. No file overlap.

## Components to Decompose (20 files, all >250 lines)

| File | Lines | Target |
|------|-------|--------|
| components/invoices/invoice-preview-sections.tsx | 410 | < 200 |
| components/squad/invite-result-sections.tsx | 404 | < 200 |
| components/waitlist/waitlist-manage-sections.tsx | 338 | < 200 |
| components/waitlist/waitlist-button-sections.tsx | 335 | < 200 |
| components/messaging/message-composer-sections.tsx | 333 | < 200 |
| components/negotiate/counter-offer-card-sections.tsx | 324 | < 200 |
| components/video/annotation-panel-sections.tsx | 322 | < 200 |
| components/invoices/invoice-list-sections.tsx | 319 | < 200 |
| components/user/find-coach-screen-sections.tsx | 317 | < 200 |
| components/squad/squad-member-select-sections.tsx | 316 | < 200 |
| components/social/feed-filters-sections.tsx | 311 | < 200 |
| components/safety/report-flow-sections.tsx | 309 | < 200 |
| components/negotiate/time-proposal-sections.tsx | 307 | < 200 |
| components/onboarding/parent-welcome-screens-sections.tsx | 302 | < 200 |
| components/video/video-upload-sections.tsx | 296 | < 200 |
| components/payment/payment-modal-sections.tsx | 296 | < 200 |
| components/notification/quiet-hours-sections.tsx | 286 | < 200 |
| components/skills/SkillNode-sections.tsx | 284 | < 200 |
| components/goals/goal-card-sections.tsx | 280 | < 200 |
| components/match/lineup-selector-sections.tsx | 265 | < 200 |

## Decomposition Pattern
Same as P3-COMPONENTS-A.md:
1. Read file, identify logical groups
2. Extract to sub-component files (80-150 lines each)
3. Parent composes sub-components
4. Every new component: `memo()` + typed Props + StyleSheet.create

## Priority Order (largest first)
1. invoice-preview-sections (410) — split: preview-header + preview-line-items + preview-totals + preview-footer
2. invite-result-sections (404) — split: result-summary + result-list + result-actions
3. waitlist-manage-sections (338) — split: manage-list + manage-actions + manage-stats
4. waitlist-button-sections (335) — split: button-states + button-animation
5. message-composer-sections (333) — split: composer-input + composer-attachments + composer-actions

## Quality Gate
- [ ] All 20 files are now < 200 lines
- [ ] All new sub-components wrapped in memo()
- [ ] All new sub-components have typed Props
- [ ] No new TypeScript errors

## Do NOT Touch
- components/ directories owned by P3-A or P3-B
- app/, services/
