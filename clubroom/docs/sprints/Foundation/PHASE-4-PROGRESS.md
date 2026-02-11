# Phase 4B-4G Progress Tracker

> Superseded by `docs/sprints/Foundation/PHASE-4-LIVE-TRACKER.md` for active execution tracking.

## 4D: Old Animated API → Reanimated (11 files)
- [ ] components/coach/travel-radius-picker.tsx
- [ ] components/coach/travel-radius-picker-sections.tsx
- [ ] components/coach/availability-tutorial.tsx
- [ ] components/coach/availability-tutorial-sections.tsx
- [ ] components/ui/screen-states-sections.tsx
- [ ] components/coach/day-editor-sheet.tsx
- [ ] components/celebrations/badge-celebration.tsx
- [ ] components/celebrations/goal-celebration.tsx
- [ ] components/notification/notification-toast.tsx
- [ ] components/compare/CompareBar.tsx
- [ ] components/celebrations/confetti.tsx
- [ ] components/discover/map-bottom-sheet.tsx (Animated.timing only)
- [ ] components/roster/athlete-row.tsx (imports Animated)
- [ ] app/settings/coaching.tsx (imports Animated)

## 4E: Hardcoded hex colors → withAlpha/palette (non-test, non-theme files)
Need to audit — many are decorative comments or in theme.ts itself.
Files with hex colors in actual code (not comments):
- [ ] components/academy/academy-card.tsx — #FFFFFF decorative
- [ ] components/academy/academy-card-sections.tsx — #FFFFFF decorative
- [ ] components/profile/social-links.tsx
- [ ] components/calendar/CalendarProviderSelect.tsx
- [ ] components/academy/academy-staff-card.tsx
- [ ] components/celebrations/confetti.tsx
- [ ] components/discover/MapView.tsx
- [ ] components/club/branding-editor-sections.tsx
- [ ] components/club/feed-cards/match-result-card.tsx
- [ ] components/themed-text.tsx
- [ ] components/discover/PriceRangeSlider.tsx
- [ ] components/celebration-overlay.tsx
- [ ] components/badges/badge-award-modal.tsx
- [ ] components/badges/badge-timeline-section.tsx
- [ ] components/invoices/invoice-list-sections.tsx
- [ ] components/badges/badge-share-section.tsx
- [ ] components/badges/badge-card-sections.tsx
- [ ] components/drills/video-player-sections.tsx
- [ ] components/drills/drill-list-sections.tsx
- [ ] components/roster/athlete-filters.tsx
- [ ] components/event/attendee-list-sections.tsx
- [ ] components/goals/ProgressRing.tsx
- [ ] components/primitives/surface-card.tsx
- [ ] components/availability/wizard-step-hours.tsx
- [ ] components/athlete/progress-badges-tab.tsx
- [ ] components/analytics/session-timeline-sections.tsx
- [ ] components/analytics/progress-chart-sections.tsx

Files with rgba() in actual code:
- [ ] components/group/group-session-hero.tsx
- [ ] components/video/video-card.tsx
- [ ] components/video/video-upload-sections.tsx
- [ ] components/discover/map-preview.tsx
- [ ] components/messaging/attachment-picker.tsx
- [ ] components/messaging/thread-summary.tsx
- [ ] components/roster/athlete-tag-modal.tsx
- [ ] components/roster/athlete-status-modal.tsx
- [ ] components/roster/removal-confirmation-modal.tsx
- [ ] components/match/match-card-sections.tsx

## 4B: Pressable → Clickable (~238 files, ~493 usages)
SKIP files that legitimately need Pressable (primitives, gesture handlers):
- SKIP: components/primitives/clickable.tsx (IS the wrapper)
- SKIP: components/primitives/surface-card.tsx (complex animated pressable)
- SKIP: components/primitives/button.tsx (already a primitive)
- SKIP: components/haptic-tab.tsx (tab bar item)
- SKIP: components/forms/FormButton.tsx (form primitive)
- SKIP: components/forms/FormInput.tsx (form primitive)

All other files with <Pressable need migration.
(Too many to list individually — will batch by directory)

## 4C: flexDirection: 'row' → Row primitive
Forward-looking rule for new screens only. No bulk migration needed.
Status: N/A — documented as convention

## 4F: accessibilityLabel audit
Focus on interactive elements (Clickable, Button, Pressable) missing labels.
Will audit after 4B migration.

## 4G: Touch target ≥44px audit
Focus on minHeight/hitSlop on interactive elements.
Will audit after 4B migration.

---
Last updated: Starting work
