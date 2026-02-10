# P3-COMPONENTS-B — Decompose Bloated Sections (club through health)

**Category**: Component Layer (70 → 80)
**Scope**: components/club/, components/community/, components/compare/, components/development/, components/discover/, components/drills/, components/event/, components/family/, components/health/ ONLY.
**Run**: Parallel with P3-A, P3-C. No file overlap.

## Components to Decompose (20 files, all >250 lines)

| File | Lines | Target |
|------|-------|--------|
| components/community/carpool-offer-sections.tsx | 370 | < 200 |
| components/development/skill-radar-sections.tsx | 364 | < 200 |
| components/health/body-part-selector-sections.tsx | 360 | < 200 |
| components/family/spending-chart-sections.tsx | 349 | < 200 |
| components/event/event-card-sections.tsx | 345 | < 200 |
| components/drills/drill-card-sections.tsx | 318 | < 200 |
| components/family/add-child-basic-step-sections.tsx | 314 | < 200 |
| components/event/attendee-card-sections.tsx | 313 | < 200 |
| components/community/group-chat-section-sections.tsx | 312 | < 200 |
| components/club/group-chat-sections.tsx | 303 | < 200 |
| components/health/recovery-timeline-sections.tsx | 302 | < 200 |
| components/event/RSVPButton-sections.tsx | 290 | < 200 |
| components/drills/video-player-sections.tsx | 289 | < 200 |
| components/discover/map-view-placeholder-sections.tsx | 286 | < 200 |
| components/club/welcome-flow-sections.tsx | 286 | < 200 |
| components/event/check-in-button-sections.tsx | 277 | < 200 |
| components/event/attendee-list-sections.tsx | 274 | < 200 |
| components/compare/CoachColumn-sections.tsx | 269 | < 200 |
| components/family/upcoming-sessions-sections.tsx | 269 | < 200 |
| components/community/ParentGroupCard-sections.tsx | 327 | < 200 |

## Decomposition Pattern
Same as P3-COMPONENTS-A.md:
1. Read file, identify logical groups
2. Extract each group to a new sub-component file (80-150 lines each)
3. Update parent to compose sub-components
4. Every new component: `memo()` + typed Props + StyleSheet.create

## Priority Order (do largest first)
1. carpool-offer-sections (370) — split into offer-details + offer-actions + offer-passengers
2. skill-radar-sections (364) — split into radar-chart + radar-legend + radar-stats
3. body-part-selector-sections (360) — split into body-map + part-list + severity-indicator
4. spending-chart-sections (349) — split into chart-view + period-selector + category-breakdown
5. event-card-sections (345) — split into event-header + event-details + event-rsvp

Continue through list in descending size order.

## Quality Gate
- [ ] All 20 files are now < 200 lines
- [ ] All new sub-components wrapped in memo()
- [ ] All new sub-components have typed Props
- [ ] No new TypeScript errors

## Do NOT Touch
- components/ directories owned by P3-A or P3-C
- app/, services/
