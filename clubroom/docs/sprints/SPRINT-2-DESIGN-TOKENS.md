# Sprint 2: Design System Token Compliance

**Duration**: 5-7 days
**Goal**: Replace all 181+ hardcoded values with design tokens

---

## 2.1 Hardcoded Spacing (18 violations)

Replace numeric gap/padding/margin with `Spacing.*`:

- [ ] `app/settings/cancellation-policy.tsx:98` — `gap: 2` → `Spacing.micro`
- [ ] `app/settings/smart-slots.tsx:87` — `gap: 2` → `Spacing.micro`
- [ ] `app/verification/insurance.tsx` — `gap: 2` → `Spacing.micro`
- [ ] `components/progress/squad-leaderboard.tsx:207` — `gap: 4` → `Spacing.xxs`
- [ ] `components/progress/share-report-card.tsx` (2x) — `gap: 4` → `Spacing.xxs`
- [ ] `components/progress/monthly-story.tsx` — `gap: 3` → `Spacing.micro`
- [ ] `components/progress/cosmetic-selector.tsx` — `gap: 4` → `Spacing.xxs`
- [ ] `components/bookings/create-session-type-selector.tsx` — `gap: 24` → `Spacing.md`
- [ ] `components/bookings/create-session-extras.tsx` — `gap: 20` → `Spacing.sm`
- [ ] `components/bookings/CreateSessionForm.tsx` — `padding: 20, gap: 24` → `Spacing.sm`, `Spacing.md`
- [ ] `components/development/coach-observation-modal.tsx` — `gap: 2` → `Spacing.micro`
- [ ] `components/family/medical-special-needs-form-sections.tsx` — `gap: 4` → `Spacing.xxs`
- [ ] `components/coach/session-type-chips.tsx` — `gap: 2` → `Spacing.micro`
- [ ] `components/sessions/session-registrations.tsx` — `gap: 2` → `Spacing.micro`
- [ ] `components/session/rating-bar.tsx:164` — `gap: 3` → `Spacing.micro`
- [ ] `components/progress/coach-says-card.tsx:556` — `marginHorizontal: 2` → `Spacing.micro`
- [ ] `components/progress/squad-leaderboard.tsx:218` — `paddingVertical: 6` → `Spacing.xs`

---

## 2.2 Hardcoded Border Radius (25 violations)

Replace with `Radii.*`:

- [ ] `components/discover/map-content.native.tsx:100` — `borderRadius: 2` → `Radii.xs`
- [ ] `components/progress/coach-says-card.tsx:555` — `borderRadius: 2` → `Radii.xs`
- [ ] `components/progress/position-pentagon.tsx` — `borderRadius: 2` → `Radii.xs`
- [ ] `components/bookings/series-booking-group.tsx` (2x) — `borderRadius: 2` → `Radii.xs`
- [ ] `components/group/whos-going-card.tsx` — `borderRadius: 16` → `Radii.card`
- [ ] `components/group/session-child-badge.tsx` — `borderRadius: 3` → `Radii.xs`
- [ ] `components/family/family-calendar-sections.tsx` — `borderRadius: 3` → `Radii.xs`
- [ ] `components/family/child-switcher.tsx` — `borderRadius: 3.5` → `Radii.xs`
- [ ] `components/coach/adjust-day-modal.tsx` — `borderRadius: 2` → `Radii.xs`
- [ ] `components/coach/session-type-modal.tsx` — `borderRadius: 2` → `Radii.xs`
- [ ] `components/coach/week-pattern-slot-row.tsx` — `borderRadius: 3` → `Radii.xs`
- [ ] `components/parent/decline-reason-sheet.tsx` — `borderRadius: 2` → `Radii.xs`
- [ ] `components/availability/day-editor-existing-blocks.tsx` — `borderRadius: 3` → `Radii.xs`
- [ ] `app/book/[coachId]/schedule.tsx` — `borderRadius: 32` → `Radii['2xl']`
- [ ] `components/club/MatchesPanel.tsx` — `borderRadius: 28` → `Radii.xl`
- [ ] `components/discover/map-content.web.tsx` — `borderRadius: 28` → `Radii.xl`
- [ ] `components/discover/map-content.native.tsx` — `borderRadius: 28` → `Radii.xl`
- [ ] `components/progress/monthly-story.tsx` — `borderRadius: 36` → `Radii['2xl']`
- [ ] `components/progress/squad-leaderboard.tsx:237` — `borderRadius: 14` → `Radii.md`

---

## 2.3 Hardcoded Font Sizes (16 violations)

Replace with `Typography.*`:

- [ ] `components/ui/notification-bell.tsx` — `fontSize: 10` → `Typography.micro.fontSize`
- [ ] `components/discover/FilterBar.tsx` — `fontSize: 11` → `Typography.micro.fontSize`
- [ ] `components/progress/squad-leaderboard.tsx:228` — `fontSize: 14` → `Typography.bodySmall.fontSize`
- [ ] `components/group/child-selector.tsx` — `fontSize: 10` → `Typography.micro.fontSize`
- [ ] `components/primitives/chip.tsx:53` — `fontSize: 11` → `Typography.micro.fontSize`
- [ ] `components/coach/scheduling-rules-sections.tsx` — `fontSize: 13` → `Typography.small.fontSize`
- [ ] `components/coach/profile-tabs.tsx` — `fontSize: 15` → `Typography.body.fontSize`
- [ ] `components/social/session-announcement-card.tsx` — `fontSize: 11` → `Typography.micro.fontSize`
- [ ] `app/(tabs)/bookings/[id].tsx` (2x) — `fontSize: 14/12` → `Typography.bodySmall/caption`
- [ ] `app/(tabs)/_layout.tsx` — `fontSize: 10` → `Typography.micro.fontSize`

**Need new Typography tokens** for display/hero sizes:
- [ ] Add to `constants/theme.ts`: `hero: { fontSize: 28 }`, `heroLarge: { fontSize: 32 }`, `displayLarge: { fontSize: 34 }`
- [ ] Then fix: `components/progress/share-report-card.tsx`, `coach-says-card.tsx`, `player-card-front.tsx`, `position-pentagon.tsx`, `primitives/section-header.tsx`

---

## 2.4 Hardcoded Shadows (8 violations)

Replace with `Shadows[scheme].*`:

- [ ] `components/ui/empty-state.tsx` → `Shadows[scheme].card`
- [ ] `components/discover/PriceRangeSlider.tsx` → `Shadows[scheme].subtle`
- [ ] `components/discover/map-content.native.tsx` → `Shadows[scheme].subtle`
- [ ] `components/progress/player-card.tsx` → `Shadows[scheme].cardHover`
- [ ] `components/notification/notification-toast.tsx` → `Shadows[scheme].card`

---

## 2.5 Hardcoded Colors (4 violations)

- [ ] `components/progress/squad-leaderboard.tsx` — `'#FF6B35', '#3B82F6', '#8B5CF6'` → move to theme or use `colors.*` semantic tokens
- [ ] `components/discover/map-content.native.tsx` — `shadowColor: '#000'` → `colors.text`

---

## 2.6 React Native Image → expo-image (20 files)

Replace `import { Image } from 'react-native'` with `import { Image } from 'expo-image'`:

- [ ] `components/club/FeedPost.tsx`
- [ ] `components/club/ClubHeader.tsx`
- [ ] `components/club/member-profile-card.tsx`
- [ ] `components/ui/primitives/Avatar.tsx`
- [ ] `components/settings/settings-profile-card.tsx`
- [ ] `components/video/video-upload-sections.tsx`
- [ ] `components/bookings/unified-booking-sections.tsx`
- [ ] `components/bookings/UnifiedBookingCard.tsx`
- [ ] `components/bookings/booking-info-cards.tsx`
- [ ] `components/group/group-session-hero.tsx`
- [ ] `components/group/group-session-card.tsx`
- [ ] `components/notification/muted-coaches-list-sections.tsx`
- [ ] `components/family/add-child-basic-step-sections.tsx`
- [ ] `components/family/FamilyMemberCard.tsx`
- [ ] `components/coach/public-profile-hero.tsx`
- [ ] `components/coach/profile-tabs.tsx`
- [ ] `components/coach/coach-detail-hero.tsx`
- [ ] `components/coach/profile-header-sections.tsx`
- [ ] `components/coach/profile-post-card.tsx`
- [ ] `components/social/feed-post-card.tsx`

---

## 2.7 Raw View+flex → Column primitive (15+ files)

Replace `<View style={{ flex: 1 }}>` with `<Column flex>`:

- [ ] `components/progress/skill-level-card.tsx:70`
- [ ] `components/development/dev-session-info.tsx:34`
- [ ] `components/auth/onboarding-step-basic-info.tsx`
- [ ] `components/user/home-screen-sections.tsx`
- [ ] `components/group/whos-going-card.tsx`
- [ ] `components/coach/scheduling-rules-sections.tsx`
- [ ] `components/group/group-session-details.tsx`
- [ ] `components/badges/quick-recognition-modal.tsx`
- [ ] `components/group/family-registration-card.tsx`
- [ ] `components/invite/rsvp-button-group.tsx`
- [ ] `components/squad/squad-members-card.tsx`
- [ ] `components/group/roll-call-modal.tsx`
- [ ] `components/family/sharing-invite-modal.tsx`
- [ ] `components/coach/block-date-sections.tsx`
- [ ] `components/social/club-post-selectors.tsx`

---

## Definition of Done
- [ ] Zero hardcoded hex colors outside theme.ts
- [ ] Zero hardcoded spacing/radius/font-size/shadow values
- [ ] Zero RN Image imports (all expo-image)
- [ ] Zero raw View+flexDirection patterns
- [ ] All existing tests pass
- [ ] Visual spot-check on 5 key screens in simulator
