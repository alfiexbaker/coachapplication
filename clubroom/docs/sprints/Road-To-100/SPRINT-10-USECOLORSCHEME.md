# Sprint 10: Replace useColorScheme with useTheme()

## Objective

Migrate all 386 consumer files from the manual `useColorScheme()` + `Colors[scheme]` pattern to the `useTheme()` hook. After this sprint, only infrastructure files should import `useColorScheme`.

## Current State

- **884 total occurrences** of `useColorScheme` across **390 files**
- **386 consumer files** need migration (4 are infrastructure, excluded below)
- Pattern is identical in every file: import `useColorScheme` + `Colors`, call `useColorScheme() ?? 'light'`, then `Colors[scheme]`

## Infrastructure Files to SKIP

These files DEFINE the theming system. Do NOT modify them:

| File | Reason |
|------|--------|
| `hooks/use-color-scheme.ts` | Defines the hook itself |
| `hooks/use-color-scheme.web.ts` | Web platform variant |
| `hooks/useTheme.ts` | The target hook (consumes useColorScheme internally) |
| `hooks/use-theme-color.ts` | Legacy helper (consumes useColorScheme) |
| `hooks/use-screen.ts` | Uses useTheme internally already |
| `app/_layout.tsx` | Root layout, may need raw scheme for StatusBar/system config |
| `app/(tabs)/_layout.tsx` | Tab bar layout, needs scheme for tab bar styling |
| `app/analytics/_layout.tsx` | Layout file |
| `app/(tabs)/bookings/_layout.tsx` | Layout file |
| `components/error-boundary.tsx` | Class component, cannot use hooks |

## Transformation Pattern

### BEFORE (typical file):
```typescript
import { Colors, Typography, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Inside the component:
const scheme = useColorScheme() ?? 'light';
const palette = Colors[scheme];
// ... uses palette.text, palette.tint, palette.surface, etc.
// ... may use Shadows[scheme].card
```

### AFTER:
```typescript
import { Typography, Spacing, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// Inside the component:
const { colors: palette, scheme } = useTheme();
// ... palette.text, palette.tint, etc. work identically
// ... Shadows[scheme].card still works (scheme is returned by useTheme)
```

### Key rules for the transformation:

1. **Remove** `import { useColorScheme } from '@/hooks/use-color-scheme';`
2. **Add** `import { useTheme } from '@/hooks/useTheme';`
3. **Replace** `const scheme = useColorScheme() ?? 'light';` and `const palette = Colors[scheme];` with `const { colors: palette, scheme } = useTheme();`
4. **If `scheme` is not used anywhere else in the file** (no `Shadows[scheme]`, no `scheme === 'dark'` checks, no other `Colors[scheme]` references), simplify to `const { colors: palette } = useTheme();`
5. **If `Colors` was ONLY used for `Colors[scheme]`**, remove `Colors` from the `@/constants/theme` import. If the import becomes empty, remove the entire import line.
6. **If `Colors` is used elsewhere** (e.g., `typeof Colors.light` for a type, or as a prop type), keep `Colors` in the import.
7. **Sub-components receiving `palette` as a prop**: Leave those alone. They don't call `useColorScheme` themselves -- they receive colors from their parent.
8. **Type annotations using `typeof Colors.light`**: Replace with `ThemeColors` from `@/hooks/useTheme`. Add `import type { ThemeColors } from '@/hooks/useTheme';` if needed.

### Edge case: variable naming

Some files use `colors` instead of `palette`:
```typescript
// BEFORE
const scheme = useColorScheme() ?? 'light';
const colors = Colors[scheme];

// AFTER
const { colors, scheme } = useTheme();
// OR if scheme is not needed:
const { colors } = useTheme();
```

Some files destructure directly from the Colors object -- look for these patterns and handle accordingly.

### Edge case: `useColorScheme` in component props defaults

Some components may have `scheme` as a prop with a default from `useColorScheme()`. These should use `useTheme()` instead:
```typescript
// BEFORE
const scheme = useColorScheme() ?? 'light';
// used as fallback for optional prop

// AFTER
const { scheme } = useTheme();
```

## Verification Commands

Run all commands from `clubroom/` directory:

```bash
# 1. Check that only infrastructure files still import useColorScheme
grep -rl 'useColorScheme' --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v '.tmp-tests' | sort

# Expected output (ONLY these files):
# ./hooks/use-color-scheme.ts
# ./hooks/use-color-scheme.web.ts
# ./hooks/useTheme.ts
# ./hooks/use-theme-color.ts
# ./hooks/use-screen.ts
# ./app/_layout.tsx
# ./app/(tabs)/_layout.tsx
# ./app/analytics/_layout.tsx
# ./app/(tabs)/bookings/_layout.tsx

# 2. Verify no broken imports (Colors still imported where needed)
npx tsc -p tsconfig.test.json

# 3. Run all tests
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js
# Expected: 1760+ tests pass
```

## Agent Batching Strategy

Recommended: **10 parallel agents**, each handling ~39 files. Group by directory to minimize merge conflicts.

### Batch 1: app/(tabs)/ and app/(modal)/ (17 files)
```
app/(modal)/add-child.tsx
app/(modal)/create-club-post.tsx
app/(modal)/create-post.tsx
app/(modal)/create-squad.tsx
app/(modal)/post-detail.tsx
app/(tabs)/admin/invite-codes.tsx
app/(tabs)/athletes.tsx
app/(tabs)/badges.tsx
app/(tabs)/bookings/index.tsx
app/(tabs)/bookings/report-problem.tsx
app/(tabs)/bookings/session-feedback.tsx
app/(tabs)/bookings/statistics.tsx
app/(tabs)/club-hub.tsx
app/(tabs)/coach-profile.tsx
app/(tabs)/feed.tsx
app/(tabs)/index.tsx
app/(tabs)/messages.tsx
app/(tabs)/more.tsx
app/(tabs)/notifications.tsx
app/(tabs)/roster.tsx
app/(tabs)/schedule.tsx
app/(tabs)/settings.tsx
```

### Batch 2: app/academy/, app/admin/, app/availability/, app/badges/, app/book/ (20 files)
```
app/academy/[id].tsx
app/academy/[id]/branding.tsx
app/academy/[id]/settings.tsx
app/academy/[id]/staff.tsx
app/academy/create.tsx
app/academy/join.tsx
app/admin/promo-codes.tsx
app/admin/promo-codes/create.tsx
app/availability/add-template.tsx
app/availability/block-date.tsx
app/availability/calendar.tsx
app/availability/edit-template.tsx
app/availability/scheduling-rules.tsx
app/badges/index.tsx
app/book-coach.tsx
app/book/[coachId]/confirmation.tsx
app/book/[coachId]/details.tsx
app/book/[coachId]/multi-week.tsx
app/book/[coachId]/review.tsx
app/book/[coachId]/schedule.tsx
app/book/[coachId]/session-type.tsx
```

### Batch 3: app/booking/, app/bookings/, app/chat/, app/club/ (17 files)
```
app/booking/[id]/cancel.tsx
app/bookings/[id]/counter.tsx
app/bookings/[id]/negotiate.tsx
app/bookings/recurring.tsx
app/bookings/subscribe.tsx
app/chat/[threadId].tsx
app/club/[clubId]/branding.tsx
app/club/[clubId]/calendar.tsx
app/club/[clubId]/dashboard.tsx
app/club/[clubId]/member/[memberId].tsx
app/club/[id].tsx
app/club/create.tsx
app/club/invite-members.tsx
app/club/settings.tsx
app/club/squad/[id].tsx
app/club/squad/create.tsx
app/club/training-schedule.tsx
```

### Batch 4: app/coach/ through app/goals/ (21 files)
```
app/coach-invites.tsx
app/coach/[coachId]/public.tsx
app/coach/[id].tsx
app/community/[groupId].tsx
app/confirm-booking.tsx
app/development/athlete-session/[sessionId].tsx
app/development/athlete/[athleteId]/special-needs.tsx
app/development/child-progress/[childId].tsx
app/discover-sessions.tsx
app/discover/filters.tsx
app/discover/map.tsx
app/drills/[id].tsx
app/earnings.tsx
app/events/[id]/attendees.tsx
app/events/create.tsx
app/favourites/index.tsx
app/goals/create.tsx
app/group-sessions/[id]/roster.tsx
app/group-sessions/create.tsx
app/health/log.tsx
app/invites.tsx
```

### Batch 5: app/invoices/ through app/wallet/ (20 files)
```
app/invoices/[id].tsx
app/invoices/index.tsx
app/payment/add-card.tsx
app/payment/methods.tsx
app/rate-coach.tsx
app/referrals/invite.tsx
app/review/[bookingId].tsx
app/roster/[athleteId]/index.tsx
app/session-invites/[id].tsx
app/session-invites/create.tsx
app/session-invites/group.tsx
app/session-invites/index.tsx
app/session-invites/squad.tsx
app/session-notes/[bookingId].tsx
app/sessions/create.tsx
app/settings/account.tsx
app/settings/appearance.tsx
app/settings/calendar-sync.tsx
app/settings/help.tsx
app/settings/index.tsx
app/settings/notifications/index.tsx
app/settings/notifications/preferences.tsx
app/settings/privacy-policy.tsx
app/settings/privacy.tsx
app/settings/terms.tsx
app/skills/[category].tsx
app/skills/index.tsx
app/verification/id.tsx
app/videos/[id].tsx
app/videos/review/[id].tsx
app/waitlist/index.tsx
app/waitlist/manage.tsx
app/wallet/promo.tsx
```

### Batch 6: components/a* through components/coach/ (part 1: 40 files)
```
components/ChildSwitcher.tsx
components/academy/academy-card.tsx
components/academy/staff-role-picker.tsx
components/admin/users-screen.tsx
components/analytics/AnalyticsStatCard.tsx
components/analytics/CancellationChart.tsx
components/analytics/PeakHoursHeatmap.tsx
components/analytics/RetentionCard.tsx
components/analytics/RevenueChart.tsx
components/analytics/enhanced-stats.tsx
components/analytics/goal-progress.tsx
components/analytics/progress-chart.tsx
components/analytics/session-timeline.tsx
components/analytics/skill-progress-bar.tsx
components/analytics/skill-radar.tsx
components/athlete/progress-screen.tsx
components/auth/SignupTypeSelector.tsx
components/badges/badge-award-modal.tsx
components/badges/badge-card.tsx
components/badges/badge-grid.tsx
components/booking/cash-payment-banner.tsx
components/booking/no-show-category-sheet.tsx
components/bookings/BookingsList.tsx
components/bookings/CoachTabNavigation.tsx
components/bookings/child-selector.tsx
components/calendar/CalendarExportButton.tsx
components/calendar/CalendarProviderSelect.tsx
components/calendar/SyncSettingsCard.tsx
components/celebration-overlay.tsx
components/celebrations/badge-celebration.tsx
components/celebrations/goal-celebration.tsx
components/club/ClubHeader.tsx
components/club/EventsPanel.tsx
components/club/FeedPost.tsx
components/club/JoinClubCard.tsx
components/club/MatchesPanel.tsx
components/club/MembersPanel.tsx
components/club/SessionsPanel.tsx
components/club/TeamsPanel.tsx
components/club/branding-editor.tsx
```

### Batch 7: components/club/ (part 2) through components/discover/ (40 files)
```
components/club/bulk-message.tsx
components/club/feed-cards/announcement-card.tsx
components/club/feed-cards/badge-award-card.tsx
components/club/feed-cards/event-reminder-card.tsx
components/club/feed-cards/match-result-card.tsx
components/club/feed-cards/session-recap-card.tsx
components/club/group-chat.tsx
components/club/upcoming-events-carousel.tsx
components/club/welcome-flow.tsx
components/coach/adjust-day-modal.tsx
components/coach/availability-grid.tsx
components/coach/availability-week-grid.tsx
components/coach/block-date-modal.tsx
components/coach/cancellation-policy-editor.tsx
components/coach/coach-card-availability.tsx
components/coach/coach-card-reviews.tsx
components/coach/coach-card-services.tsx
components/coach/coach-card.tsx
components/coach/day-editor-sheet.tsx
components/coach/development-screen.tsx
components/coach/earnings-projection.tsx
components/coach/invite-athlete-modal.tsx
components/coach/profile-analytics.tsx
components/coach/profile-post-card.tsx
components/coach/profile-tabs.tsx
components/coach/recurring-session-actions.tsx
components/coach/recurring-template-modal.tsx
components/coach/review-response.tsx
components/coach/scheduling-rules-modal.tsx
components/coach/session-type-chips.tsx
components/coach/share-profile.tsx
components/coach/similar-coaches.tsx
components/coach/slot-picker.tsx
components/coach/time-off-sheet.tsx
components/coach/trial-session-editor.tsx
components/coach/week-pattern-grid.tsx
components/community/CarpoolOfferCard.tsx
components/community/CreateGroupForm.tsx
components/community/GroupList.tsx
components/community/ParentGroupCard.tsx
```

### Batch 8: components/community/ (remaining) through components/invite/ (42 files)
```
components/community/group-chat-section.tsx
components/community/group-members-modal.tsx
components/community/group-role-picker.tsx
components/compare/CoachColumn.tsx
components/compare/CompareBar.tsx
components/compare/CompareButton.tsx
components/compare/ComparisonTable.tsx
components/consent/ConsentBadge.tsx
components/consent/ConsentCard.tsx
components/consent/ConsentFilter.tsx
components/consent/ConsentGrid.tsx
components/development/goal-editor.tsx
components/development/progress-report.tsx
components/development/progress-timeline.tsx
components/development/session-journal.tsx
components/development/session-recap-card.tsx
components/development/skill-radar.tsx
components/discover/FilterModal.tsx
components/discover/PriceRangeSlider.tsx
components/discover/RatingFilter.tsx
components/discover/coach-marker.tsx
components/discover/featured-section.tsx
components/discover/search-suggestions.tsx
components/drills/DrillCoachNotes.tsx
components/drills/DrillCompletionSection.tsx
components/drills/DrillFeedbackCard.tsx
components/drills/DrillForm.tsx
components/drills/DrillInfoHeader.tsx
components/drills/DrillInstructions.tsx
components/drills/DrillList.tsx
components/drills/challenge-card.tsx
components/earnings/transaction-list-item.tsx
components/event/RSVPButton.tsx
components/event/create-event-schedule-step.tsx
components/family/FamilyCalendar.tsx
components/family/FamilyMemberCard.tsx
components/family/UpcomingSessionsList.tsx
components/family/add-child-basic-step.tsx
components/favourites/FavouriteButton.tsx
components/favourites/FavouriteCoachCard.tsx
components/favourites/FavouritesList.tsx
components/forms/FormButton.tsx
```

### Batch 9: components/forms/ (remaining) through components/recurring/ (43 files)
```
components/forms/FormInput.tsx
components/forms/FormSection.tsx
components/goals/GoalCard.tsx
components/goals/GoalForm.tsx
components/goals/GoalList.tsx
components/goals/MilestoneList.tsx
components/goals/ProgressRing.tsx
components/group/create-session-review-step.tsx
components/group/create-session-schedule-step.tsx
components/group/participant-card.tsx
components/health/InjuryCard.tsx
components/health/InjuryForm.tsx
components/health/SeverityPicker.tsx
components/invite/attendee-list-modal.tsx
components/invite/avatar-stack.tsx
components/invite/cover-image-hero.tsx
components/invite/location-map-preview.tsx
components/invite/rsvp-button-group.tsx
components/invoices/DownloadButton.tsx
components/invoices/InvoiceCard.tsx
components/invoices/InvoiceList.tsx
components/invoices/InvoicePreview.tsx
components/match/match-card.tsx
components/messaging/attachment-picker.tsx
components/messaging/chat-input.tsx
components/messaging/message-composer.tsx
components/messaging/typing-indicator.tsx
components/negotiate/AcceptRejectButtons.tsx
components/negotiate/CounterOfferCard.tsx
components/negotiate/NegotiationTimeline.tsx
components/negotiate/TimeProposalForm.tsx
components/notification/ChannelToggle.tsx
components/notification/NotificationTypeList.tsx
components/notification/notification-card.tsx
components/notification/notification-toast.tsx
components/onboarding/coach-welcome.tsx
components/onboarding/parent-welcome.tsx
components/packages/CreatePackageForm.tsx
components/packages/MyPackages.tsx
components/packages/PackageCard.tsx
components/packages/PackageList.tsx
components/packages/PurchaseButton.tsx
components/parent/decline-reason-sheet.tsx
```

### Batch 10: components/parent/ (remaining) through components/waitlist/ (46 files)
```
components/parent/development-screen.tsx
components/parent/discover-screen.tsx
components/parent/kids-screen.tsx
components/parent/multi-week-invite-card.tsx
components/parent/onboarding-checklist.tsx
components/parent/session-invite-card.tsx
components/payment/card-list-item.tsx
components/payment/payment-modal.tsx
components/primitives/badge.tsx
components/primitives/button.tsx
components/primitives/chip.tsx
components/primitives/page-container.tsx
components/primitives/page-header.tsx
components/primitives/screen-header.tsx
components/primitives/section-header.tsx
components/primitives/selection-tile.tsx
components/primitives/stat-card.tsx
components/primitives/surface-card.tsx
components/profile/achievement-badge.tsx
components/profile/social-links-editor.tsx
components/profile/social-links.tsx
components/progress/progress-dashboard.tsx
components/progress/session-feedback-card.tsx
components/progress/skill-level-card.tsx
components/promo/CodeUsageList.tsx
components/promo/CreateCodeForm.tsx
components/promo/PromoCodeCard.tsx
components/promo/PromoCodeInput.tsx
components/recurring/FrequencyPicker.tsx
components/recurring/RecurringCard.tsx
components/recurring/RecurringList.tsx
components/recurring/SubscribeForm.tsx
components/referrals/ReferralCodeCard.tsx
components/referrals/ReferralHistory.tsx
components/referrals/ReferralStats.tsx
components/referrals/ShareButton.tsx
components/review/rating-stars.tsx
components/review/review-card.tsx
components/review/review-form.tsx
components/roster/athlete-card.tsx
components/roster/athlete-filters.tsx
components/roster/athlete-notes.tsx
components/roster/athlete-row.tsx
components/roster/removal-confirmation-modal.tsx
components/safety/EmergencyContactCard.tsx
components/safety/EmergencyQuickCard.tsx
components/safety/MedicalAlertBadge.tsx
components/safety/SafetyChecklist.tsx
components/safety/block-user.tsx
components/safety/emergency-banner.tsx
components/safety/medical-card.tsx
components/safety/report-flow.tsx
components/session/session-notes-form.tsx
components/session/session-notes-view.tsx
components/sessions/session-offering-card.tsx
components/settings/settings-row.tsx
components/skills/ProgressBadge.tsx
components/skills/SkillConnection.tsx
components/skills/SkillNode.tsx
components/skills/SkillTreeView.tsx
components/social/comment-card.tsx
components/social/comment-input.tsx
components/social/comment-preview.tsx
components/social/feed-filters.tsx
components/social/feed-post-card.tsx
components/social/session-announcement-card.tsx
components/social/social-feed.tsx
components/squad/BulkInviteButton.tsx
components/squad/InviteResultCard.tsx
components/squad/SquadMemberSelect.tsx
components/squad/squad-invite-modal.tsx
components/squad/squad-picker.tsx
components/ui/booking/AthletePicker.tsx
components/ui/booking/availability-picker.tsx
components/ui/booking/booking-stepper.tsx
components/ui/booking/booking-wizard.tsx
components/ui/booking/calendar-picker.tsx
components/ui/booking/child-selection-grid.tsx
components/ui/booking/coach-summary-card.tsx
components/ui/booking/objective-selector.tsx
components/ui/booking/service-selection-list.tsx
components/ui/booking/session-type-selector.tsx
components/ui/booking/time-slot-picker.tsx
components/ui/collapsible.tsx
components/ui/empty-state.tsx
components/ui/filters/FilterChip.tsx
components/ui/filters/FilterSection.tsx
components/ui/filters/FilterSlider.tsx
components/ui/filters/FilterToggle.tsx
components/ui/message-status.tsx
components/ui/notification-bell.tsx
components/ui/skeleton.tsx
components/ui/toast.tsx
components/user/find-coach-screen.tsx
components/user/home-screen.tsx
components/verification/verification-badge.tsx
components/video/AnnotationBadge.tsx
components/video/AnnotationPanel.tsx
components/video/video-annotation.tsx
components/video/video-upload.tsx
components/waitlist/WaitlistCard.tsx
components/waitlist/WaitlistManage.tsx
```

## Agent Instructions Template

Each agent should execute this procedure for every file in its batch:

```
For each file in your batch:

1. READ the file completely.

2. IDENTIFY the useColorScheme pattern. Look for:
   a. `import { useColorScheme } from '@/hooks/use-color-scheme';`
   b. `const scheme = useColorScheme() ?? 'light';`
   c. `const palette = Colors[scheme];` (or `const colors = Colors[scheme];`)

3. CHECK if `scheme` is used anywhere ELSE in the file besides the declaration:
   - Search for `Shadows[scheme]`
   - Search for `scheme === 'dark'` or `scheme === 'light'`
   - Search for any other `Colors[scheme]` usage
   - If YES: use `const { colors: palette, scheme } = useTheme();`
   - If NO: use `const { colors: palette } = useTheme();`

4. CHECK if `Colors` is used for anything else besides `Colors[scheme]`:
   - Search for `typeof Colors.light`
   - Search for `Colors.light.` or `Colors.dark.`
   - If Colors is ONLY used for `Colors[scheme]`, remove it from the theme import
   - If Colors is used elsewhere, keep it

5. CHECK for `typeof Colors.light` type annotations:
   - Replace with `ThemeColors` from `@/hooks/useTheme`
   - Add `import type { ThemeColors } from '@/hooks/useTheme';` if needed

6. APPLY the transformation:
   - Remove the useColorScheme import line
   - Add `import { useTheme } from '@/hooks/useTheme';`
   - Replace the two variable declarations with the single useTheme() call
   - Clean up the Colors import if no longer needed

7. VERIFY the file has no syntax errors (check matching braces, etc.)

After all files are done:
- Run: npx tsc -p tsconfig.test.json
- Run: node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js
- Fix any compilation errors or test failures
```

## Expected Outcome

- `useColorScheme` grep returns only the 9 infrastructure files listed above (including `hooks/use-screen.ts` which uses `useTheme` not `useColorScheme` directly -- double check)
- TypeScript compilation passes
- All 1760+ tests pass
- No runtime regressions (colors render identically since `useTheme()` returns the same `Colors[scheme]` object)

## Risk Assessment

**Low risk.** This is a purely mechanical refactor. The `useTheme()` hook internally does exactly `Colors[useColorScheme() ?? 'light']`, so the returned palette object is identical. No behavioral change.

The only risk is:
1. **Missing a `Colors` usage** -- if `Colors` is removed from imports but still referenced elsewhere in the file, TypeScript will catch this at compile time.
2. **Variable naming conflicts** -- if a file already has a `colors` or `palette` variable from another source. Read the file fully before transforming.
