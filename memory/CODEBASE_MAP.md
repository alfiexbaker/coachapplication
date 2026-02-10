# Clubroom Codebase Map

> Auto-generated 2026-02-09. ~185 screens, ~580 components, ~124 services, ~130 hooks.
> All paths relative to `clubroom/`.

---

## 1. SCREENS (`app/`)

### Root Layout
- `app/_layout.tsx` — Root layout (providers, nav container)

### Tab Screens (`app/(tabs)/`)
- `_layout.tsx` — Tab bar layout
- `index.tsx` — Home (Coach: dashboard, Parent: discover)
- `athletes.tsx` — Coach's athlete roster
- `availability.tsx` — Coach availability overview
- `badges.tsx` — Badges tab
- `bookings/_layout.tsx` — Bookings stack layout
- `bookings/index.tsx` — Bookings list (upcoming/past)
- `bookings/[id].tsx` — Booking detail
- `bookings/objectives.tsx` — Session objectives
- `bookings/report-problem.tsx` — Report booking problem
- `bookings/session-feedback.tsx` — Post-session feedback
- `bookings/statistics.tsx` — Booking statistics
- `children.tsx` — Parent's children hub
- `club-hub.tsx` — Club hub tab
- `coach-profile.tsx` — Coach profile tab
- `earnings.tsx` — Earnings tab
- `edit-profile.tsx` — Edit profile
- `feed.tsx` — Social feed tab
- `messages.tsx` — Messages tab
- `more.tsx` — More menu
- `notifications.tsx` — Notifications tab
- `profile.tsx` — User profile tab
- `roster.tsx` — Coach roster tab
- `schedule.tsx` — Schedule tab
- `settings.tsx` — Settings shortcut
- `wallet.tsx` — Wallet tab
- `admin/invite-codes.tsx` — Admin invite codes

### Modal Screens (`app/(modal)/`)
- `add-child.tsx` — Add child modal
- `create-club-post.tsx` — Create club post
- `create-post.tsx` — Create social post
- `create-squad.tsx` — Create squad
- `post-detail.tsx` — Post detail modal

### Academy (`app/academy/`)
- `create.tsx` — Create academy
- `join.tsx` — Join academy
- `[id].tsx` — Academy detail
- `[id]/branding.tsx` — Academy branding
- `[id]/settings.tsx` — Academy settings
- `[id]/staff.tsx` — Academy staff

### Admin (`app/admin/`)
- `promo-codes.tsx` — Promo codes management
- `promo-codes/create.tsx` — Create promo code

### Analytics (`app/analytics/`)
- `_layout.tsx` — Analytics layout
- `dashboard.tsx` — Analytics dashboard
- `[athleteId].tsx` — Athlete analytics
- `retention.tsx` — Retention analytics
- `revenue.tsx` — Revenue analytics

### Athlete (`app/athlete/`)
- `journal.tsx` — Athlete journal

### Availability (`app/availability/`)
- `add-template.tsx` — Add availability template
- `block-date.tsx` — Block a date
- `calendar.tsx` — Availability calendar
- `edit-template.tsx` — Edit availability template
- `scheduling-rules.tsx` — Scheduling rules

### Badges (`app/badges/`)
- `index.tsx` — Badges list

### Booking Flow (`app/book/`)
- `[coachId]/_layout.tsx` — Booking wizard layout (BookingFlowProvider)
- `[coachId]/session-type.tsx` — Step 1: Session type
- `[coachId]/schedule.tsx` — Step 2: Schedule
- `[coachId]/details.tsx` — Step 3: Details
- `[coachId]/multi-week.tsx` — Multi-week booking
- `[coachId]/review.tsx` — Step 4: Review
- `[coachId]/confirmation.tsx` — Booking confirmation

### Bookings (`app/bookings/` + `app/booking/`)
- `booking/[id]/cancel.tsx` — Cancel booking
- `bookings/[id]/counter.tsx` — Counter-offer
- `bookings/[id]/negotiate.tsx` — Negotiate booking
- `bookings/recurring.tsx` — Recurring bookings
- `bookings/subscribe.tsx` — Subscribe to recurring

### Carpool (`app/carpool/`)
- `index.tsx` — Carpool hub

### Chat (`app/chat/`)
- `[threadId].tsx` — Chat thread

### Child (`app/child/`)
- `[id]/emergency.tsx` — Child emergency contacts
- `[id]/medical.tsx` — Child medical info

### Children Badges (`app/children/`)
- `badges/[childId].tsx` — Child's badges

### Club (`app/club/`)
- `create.tsx` — Create club
- `invite-members.tsx` — Invite members
- `settings.tsx` — Club settings
- `training-schedule.tsx` — Training schedule
- `[id].tsx` — Club detail
- `[clubId]/_layout.tsx` — Club layout
- `[clubId]/branding.tsx` — Club branding
- `[clubId]/calendar.tsx` — Club calendar
- `[clubId]/dashboard.tsx` — Club dashboard
- `[clubId]/member/[memberId].tsx` — Member detail
- `squad/[id].tsx` — Squad detail
- `squad/create.tsx` — Create squad

### Coach (`app/coach/`)
- `[id].tsx` — Coach detail
- `[coachId]/public.tsx` — Public coach profile
- `coach-invites.tsx` — Coach invites (root level)

### Community (`app/community/`)
- `index.tsx` — Community hub
- `[groupId].tsx` — Group detail

### Compare (`app/compare/`)
- `index.tsx` — Compare coaches
- `[ids].tsx` — Side-by-side comparison

### Confirm Booking
- `confirm-booking.tsx` — Confirm booking (root level)

### Development (`app/development/`)
- `my-progress.tsx` — My progress
- `badges.tsx` — Development badges
- `session/[sessionId].tsx` — Session development notes
- `athlete/[athleteId].tsx` — Athlete development
- `athlete/[athleteId]/special-needs.tsx` — Special needs
- `athlete-session/[sessionId].tsx` — Athlete session detail
- `child-progress/[childId].tsx` — Child progress

### Discover (`app/discover-sessions.tsx` + `app/discover/`)
- `discover-sessions.tsx` — Discover sessions (root level)
- `discover/filters.tsx` — Discovery filters
- `discover/map.tsx` — Map discovery

### Drills (`app/drills/`)
- `index.tsx` — Drills hub
- `create.tsx` — Create drill
- `library.tsx` — Drill library
- `assign.tsx` — Assign drill
- `challenges.tsx` — Drill challenges
- `create-challenge.tsx` — Create challenge
- `[id].tsx` — Drill detail

### Earnings
- `earnings.tsx` — Earnings (root level)

### Events (`app/events/`)
- `index.tsx` — Events list
- `create.tsx` — Create event
- `[id].tsx` — Event detail
- `[id]/attendees.tsx` — Event attendees
- `[id]/rsvp.tsx` — Event RSVP

### Family (`app/family/`)
- `index.tsx` — Family dashboard
- `calendar.tsx` — Family calendar
- `sharing.tsx` — Family sharing
- `spending.tsx` — Family spending

### Favourites (`app/favourites/`)
- `index.tsx` — Favourites list

### Goals (`app/goals/`)
- `index.tsx` — Goals list
- `create.tsx` — Create goal
- `[id].tsx` — Goal detail

### Group Sessions (`app/group-sessions/`)
- `index.tsx` — Group sessions list
- `create.tsx` — Create group session
- `[id].tsx` — Group session detail
- `[id]/roster.tsx` — Group session roster

### Health (`app/health/`)
- `index.tsx` — Health hub
- `log.tsx` — Log health entry
- `injuries.tsx` — Injuries list
- `[id].tsx` — Health detail

### Invites
- `invites.tsx` — Invites (root level)

### Invoices (`app/invoices/`)
- `index.tsx` — Invoices list
- `[id].tsx` — Invoice detail

### Matches (`app/matches/`)
- `index.tsx` — Matches list
- `create.tsx` — Create match
- `[id].tsx` — Match detail

### Packages (`app/packages/`)
- `index.tsx` — Packages browse/my-packages
- `manage.tsx` — Manage packages (coach)
- `[id].tsx` — Package detail

### Payment (`app/payment/`)
- `methods.tsx` — Payment methods
- `add-card.tsx` — Add payment card

### Rate Coach
- `rate-coach.tsx` — Rate a coach (root level)

### Referrals (`app/referrals/`)
- `index.tsx` — Referrals dashboard
- `invite.tsx` — Send referral invite

### Review
- `review/[bookingId].tsx` — Review a booking

### Roster (`app/roster/`)
- `index.tsx` — Roster list
- `consents.tsx` — Consent management
- `[athleteId]/index.tsx` — Athlete detail
- `[athleteId]/emergency.tsx` — Athlete emergency info
- `[athleteId]/add-to-session.tsx` — Add athlete to session
- `[athleteId]/raise-concern.tsx` — Raise concern about athlete

### Session Invites (`app/session-invites/`)
- `index.tsx` — Session invites list
- `create.tsx` — Create session invite
- `group.tsx` — Group invite
- `squad.tsx` — Squad invite
- `[id].tsx` — Invite detail

### Session Notes
- `session-notes/[bookingId].tsx` — Session notes

### Session (`app/session/`)
- `[id]/complete.tsx` — Complete session
- `[id]/rsvp.tsx` — Session RSVP

### Sessions
- `sessions/create.tsx` — Create session

### Settings (`app/settings/`)
- `_layout.tsx` — Settings layout
- `index.tsx` — Settings hub
- `account.tsx` — Account settings
- `appearance.tsx` — Appearance (theme)
- `calendar-sync.tsx` — Calendar sync
- `coaching.tsx` — Coaching settings
- `help.tsx` — Help & FAQ
- `privacy.tsx` — Privacy settings
- `privacy-policy.tsx` — Privacy policy
- `terms.tsx` — Terms of service
- `notifications/_layout.tsx` — Notifications layout
- `notifications/index.tsx` — Notification settings
- `notifications/preferences.tsx` — Notification preferences

### Skills (`app/skills/`)
- `_layout.tsx` — Skills layout
- `index.tsx` — Skill tree
- `[category].tsx` — Skill category

### Squads (`app/squads/`)
- `[id]/invite.tsx` — Squad invite

### Verification (`app/verification/`)
- `index.tsx` — Verification hub
- `id.tsx` — ID verification
- `background.tsx` — Background check
- `credentials.tsx` — Credentials

### Videos (`app/videos/`)
- `index.tsx` — Videos list
- `upload.tsx` — Upload video
- `[id].tsx` — Video detail
- `annotate/[id].tsx` — Annotate video
- `review/[id].tsx` — Review video

### Waitlist (`app/waitlist/`)
- `index.tsx` — Waitlist view
- `manage.tsx` — Manage waitlist

### Wallet
- `wallet/promo.tsx` — Wallet promo codes
- `book-coach.tsx` — Book a coach (root level)

---

## 2. COMPONENTS (`components/`)

### Root Components
- `themed-text.tsx` — ThemedText (Typography variant wrapper)
- `themed-view.tsx` — ThemedView (background color wrapper)
- `error-boundary.tsx` — Error boundary

### Layout Primitives (`components/primitives/`)
- `row.tsx` — Row (horizontal flex, gap/align/justify)
- `column.tsx` — Column (vertical flex, gap/align)
- `center.tsx` — Center (flex centering)
- `spacer.tsx` — Spacer (vertical/horizontal space)
- `surface-card.tsx` — SurfaceCard (primary card, 266+ usages, pressable, animated)
- `clickable.tsx` — Clickable (Pressable replacement with scale + haptics)
- `button.tsx` — Button (variant: primary/secondary/outline/ghost/destructive)
- `badge.tsx` — Badge
- `chip.tsx` — Chip
- `page-container.tsx` — Page container
- `page-header.tsx` — Page header
- `screen-header.tsx` — Screen header
- `section-header.tsx` — Section header
- `selection-tile.tsx` — Selection tile
- `stat-card.tsx` — Stat card
- `index.ts` — Barrel export

### UI Primitives (`components/ui/primitives/`)
- `Avatar.tsx` — Avatar (sm/md/lg/xl)
- `Badge.tsx` — UI Badge
- `Button.tsx` — UI Button
- `Card.tsx` — Card (elevated/bordered/flat)
- `Chip.tsx` — UI Chip
- `DateTimeField.tsx` — Date/time picker field
- `Divider.tsx` — Divider line
- `Input.tsx` — Text input
- `ListItem.tsx` — List item
- `LoadingScreen.tsx` — Full loading screen
- `ProgressBar.tsx` — Progress bar
- `Section.tsx` — Section wrapper
- `StatusBanner.tsx` — Status banner
- `Tag.tsx` — Tag label

### UI Utilities (`components/ui/`)
- `collapsible.tsx` — Collapsible section
- `empty-state.tsx` — Empty state component
- `screen-states.tsx` + `screen-states-sections.tsx` — Loading/Error/Empty states
- `skeleton.tsx` — Skeleton loader
- `status-badge.tsx` — Status badge
- `toast.tsx` — Toast notification
- `notification-bell.tsx` — Notification bell icon
- `offline-banner.tsx` — Offline banner
- `message-status.tsx` — Message delivery status

### academy/ (12 files)
- `academy-card.tsx` → sections: `academy-card-sections.tsx`
- `academy-banner.tsx` — Academy banner
- `academy-staff-card.tsx` — Staff member card
- `branding-color-picker.tsx` — Color picker
- `branding-contact-form.tsx` — Contact form
- `branding-preview.tsx` — Branding preview
- `create-academy-steps.tsx` — Multi-step creation
- `staff-edit-modal.tsx` — Edit staff
- `staff-invite-modal.tsx` — Invite staff
- `staff-role-picker.tsx` — Role picker

### admin/ (4 files)
- `users-screen.tsx` — Admin users
- `invite-code-card.tsx` — Invite code card
- `create-code-modal.tsx` — Create code modal

### analytics/ (30 files)
- `enhanced-stats.tsx` → sections: `enhanced-stat-card.tsx`, `stats-metrics.tsx`, `stats-row.tsx`
- `CancellationChart.tsx` → sections: `cancellation-chart-sections.tsx`
- `PeakHoursHeatmap.tsx` → sections: `peak-hours-heatmap-sections.tsx`
- `progress-chart.tsx` → sections: `progress-chart-sections.tsx`
- `session-timeline.tsx` → sections: `session-timeline-sections.tsx`
- `goal-progress.tsx` → sections: `goal-progress-sections.tsx`
- `skill-radar.tsx` → sections: `skill-radar-chart.tsx`, `skill-radar-list.tsx`, `skill-radar-helpers.ts`
- `skill-progress-bar.tsx` → helpers: `skill-progress-helpers.ts`, `skill-progress-item.tsx`, `skill-category-group.tsx`
- Standalone: `AnalyticsStatCard.tsx`, `RetentionCard.tsx`, `RevenueChart.tsx`, `analytics-performance-card.tsx`, `analytics-session-types.tsx`, `analytics-top-skills.tsx`, `athlete-goal-card.tsx`, `athlete-skill-bar.tsx`, `athlete-stat-card.tsx`, `mini-sparkline.tsx`, `retention-funnel.tsx`, `retention-recommendations.tsx`, `revenue-detail-cards.tsx`, `skill-summary-card.tsx`

### athlete/ (22 files)
- `progress-screen.tsx` → tabs: `progress-badges-tab.tsx`, `progress-goals-tab.tsx`, `progress-skills-tab.tsx`, `progress-profile-card.tsx`
- `athlete-overview.tsx` — Overview section
- `athlete-hero.tsx` — Hero section
- `athlete-quick-actions.tsx` — Quick actions
- `athlete-stats-row.tsx` — Stats row
- `athlete-sessions.tsx` → sections: `athlete-sessions-sections.tsx`
- `athlete-progress.tsx` → sections: `athlete-progress-sections.tsx`
- `athlete-notes-tab.tsx` → sections: `athlete-notes-tab-sections.tsx`
- `athlete-contact-card.tsx` — Contact info
- `athlete-emergency-card.tsx` — Emergency info
- `athlete-next-session-card.tsx` — Next session
- `athlete-special-needs-summary.tsx` — Special needs
- `athletes-stats-bar.tsx` — Stats bar
- `needs-attention-section.tsx` — Attention flags

### auth/ (16 files)
- `login-screen.tsx` → sections: `login-screen-sections.tsx`
- `coach-signup-screen.tsx` → sections: `coach-signup-sections.tsx`
- `onboarding-screen.tsx` → steps: `onboarding-step-account-type.tsx`, `onboarding-step-basic-info.tsx`, `onboarding-step-location.tsx`, `onboarding-step-coach.tsx`, `onboarding-step-athlete.tsx`, `onboarding-step-complete.tsx`
- `SignupTypeSelector.tsx` → sections: `signup-type-selector-sections.tsx`
- `onboarding-progress-bar.tsx` — Progress indicator
- Helpers: `onboarding-types.ts`, `use-onboarding.ts`

### badges/ (17 files)
- `badge-award-modal.tsx` → sections: `badge-award-sections.tsx`, helpers: `badge-award-helpers.ts`
- `badge-card.tsx` → sections: `badge-card-sections.tsx`
- `badge-grid.tsx` → sections: `badge-grid-sections.tsx`
- Standalone: `badge-category-carousel.tsx`, `badge-cta-section.tsx`, `badge-level-card.tsx`, `badge-list-section.tsx`, `badge-session-selector.tsx`, `badge-share-section.tsx`, `badge-timeline-section.tsx`, `child-badge-card.tsx`, `child-level-card.tsx`

### booking/ (18 files)
- `cancel-flow.tsx` → sections: `cancel-flow-cards.tsx`, `cancel-reason-picker.tsx`, `cancel-refund-preview.tsx`, `cancel-reschedule-step.tsx`, `cancel-policy-tiers.tsx`
- `reschedule-request.tsx` → sections: `reschedule-actions.tsx`, helpers: `reschedule-helpers.ts`
- `decline-invite.tsx` → sections: `decline-invite-sections.tsx`
- `no-show-category-sheet.tsx` — No-show categories
- Standalone: `add-to-calendar.tsx`, `cancellation-policy-card.tsx`, `cash-payment-banner.tsx`, `confirm-booking-payment.tsx`, `confirm-booking-summary.tsx`

### bookings/ (28 files)
- `UnifiedBookingCard.tsx` → sections: `unified-booking-sections.tsx`
- `multi-week-picker.tsx` → sections: `multi-week-picker-sections.tsx`
- `series-booking-group.tsx` → sections: `series-booking-group-sections.tsx`
- `CreateSessionForm.tsx` → sections: `create-session-date-picker.tsx`, `create-session-extras.tsx`, `create-session-type-selector.tsx`
- Standalone: `BookingsList.tsx`, `CoachTabNavigation.tsx`, `QuickActions.tsx`, `booking-coach-view.tsx`, `booking-info-cards.tsx`, `booking-notes-card.tsx`, `booking-parent-view.tsx`, `booking-participants-card.tsx`, `child-selector.tsx`, `multi-week-confirmation.tsx`, `objective-card.tsx`, `objective-modal.tsx`, `pending-invites-section.tsx`, `recent-sessions-card.tsx`, `skills-progress-card.tsx`, `stats-grid.tsx`, `stats-quick-links.tsx`

### calendar/ (4 files)
- `CalendarExportButton.tsx`, `CalendarProviderSelect.tsx`, `SyncSettingsCard.tsx`

### celebrations/ (3 files)
- `badge-celebration.tsx`, `confetti.tsx`, `goal-celebration.tsx`

### club/ (44 files)
- `ClubHeader.tsx` → sections: `club-header-menu.tsx`
- `branding-editor.tsx` → sections: `branding-editor-sections.tsx`
- `group-chat.tsx` → sections: `group-chat-sections.tsx`
- `bulk-message.tsx` → sections: `bulk-message-compose.tsx`, `bulk-message-sent.tsx`
- `welcome-flow.tsx` → sections: `welcome-flow-sections.tsx`
- `SessionsPanel.tsx` → sections: `sessions-panel-sections.tsx`
- Settings: `settings-details-section.tsx`, `settings-invites-section.tsx`, `settings-members-section.tsx`, `settings-squads-section.tsx`
- Calendar: `calendar-grid.tsx`, `calendar-event-list.tsx`, `calendar-squad-filter.tsx`, `weekly-calendar-view.tsx`
- Members: `member-profile-card.tsx`, `member-role-management.tsx`, `member-squad-assignments.tsx`, `member-danger-zone.tsx`
- Invite: `invite-manual-tab.tsx`, `invite-past-sessions-tab.tsx`, `invite-role-selector.tsx`
- Dashboard: `club-dashboard-widgets.tsx`, `club-stats-row.tsx`, `club-detail-stats.tsx`
- Standalone: `EventsPanel.tsx`, `FeedPost.tsx`, `JoinClubCard.tsx`, `MatchesPanel.tsx`, `MembersPanel.tsx`, `TeamsPanel.tsx`, `club-admin-actions.tsx`, `club-feed-filters.tsx`, `club-feed-list-header.tsx`, `club-no-membership.tsx`, `training-attendance-card.tsx`, `training-card.tsx`, `upcoming-events-carousel.tsx`

### coach/ (91 files — largest component group)
- `coach-card.tsx` → sections: `coach-card-header.tsx`, `coach-card-availability.tsx`, `coach-card-reviews.tsx`, `coach-card-shared.tsx`, `coach-card-compact.tsx`, `coach-card-discovery.tsx`, `coach-card-favourite.tsx`
- `coach-card-cta.tsx` → sections: `coach-card-cta-sections.tsx`
- `coach-card-services.tsx` → sections: `coach-card-services-sections.tsx`
- `analytics-screen.tsx` → sections: `analytics-screen-sections.tsx`
- `availability-grid.tsx` → sections: `availability-grid-sections.tsx`
- `availability-week-grid.tsx` → sections: `availability-week-grid-sections.tsx`
- `availability-tutorial.tsx` → sections: `availability-tutorial-sections.tsx`
- `availability-setup-wizard.tsx` — Full setup wizard
- `blocked-dates-editor.tsx` → sections: `blocked-dates-sections.tsx`, `blocked-dates-calendar.tsx`
- `block-date-modal.tsx` → sections: `block-date-sections.tsx`, helpers: `block-date-helpers.ts`
- `cancellation-policy-editor.tsx` → sections: `cancellation-policy-cards.tsx`, helpers: `cancellation-policy-helpers.ts`
- `profile-header.tsx` → sections: `profile-header-sections.tsx`
- `profile-quick-actions.tsx` → sections: `profile-quick-actions-sections.tsx`
- `profile-tabs.tsx` → tabs: `profile-tab-bar.tsx`, `profile-tab-about.tsx`, `profile-tab-posts.tsx`
- `review-response.tsx` → sections: `review-response-sections.tsx`
- `scheduling-rules-editor.tsx` → sections: `scheduling-rules-editor-sections.tsx`, config: `scheduling-rules-editor-config.ts`
- `scheduling-rules-modal.tsx` → sections: `scheduling-rules-sections.tsx`, `scheduling-rules-summary.tsx`, `scheduling-option-picker.tsx`
- `session-type-modal.tsx` → sections: `session-type-modal-sections.tsx`
- `share-profile.tsx` → sections: `share-profile-sections.tsx`
- `slot-picker.tsx` → sections: `slot-picker-sections.tsx`
- `smart-slots.tsx` → sections: `smart-slots-cards.tsx`, `smart-slots-heatmap.tsx`, data: `smart-slots-data.ts`
- `travel-radius-picker.tsx` → sections: `travel-radius-picker-sections.tsx`
- `trial-session-editor.tsx` → sections: `trial-session-editor-sections.tsx`
- `week-pattern-grid.tsx` → sections: `week-pattern-setup-mode.tsx`, `week-pattern-slot-row.tsx`, types: `week-pattern-types.ts`
- `time-off-sheet.tsx` → steps: `time-off-form-step.tsx`, `time-off-confirm-step.tsx`, `time-off-remove-step.tsx`
- `invite-athlete-modal.tsx` → sections: `invite-athlete-filters.tsx`, `invite-athlete-list.tsx`
- `invite-session-flow.tsx` → sections: `invite-session-steps.tsx`
- `adjust-day-modal.tsx` → sections: `adjust-day-modal-sections.tsx`
- `development-screen.tsx` → sections: `development-sections.tsx`
- `onboarding-checklist.tsx` → sections: `onboarding-checklist-sections.tsx`
- Templates: `template-day-section.tsx`, `template-options-section.tsx`, `template-time-section.tsx`
- Public profile: `public-profile-hero.tsx`, `public-profile-about.tsx`, `public-profile-credentials.tsx`, `public-profile-reviews.tsx`, `public-profile-specialties.tsx`
- Coach detail: `coach-detail-hero.tsx`, `coach-detail-about.tsx`, `coach-detail-reviews.tsx`, `coach-detail-sessions.tsx`
- Standalone: `booking-request.tsx`, `day-editor-sheet.tsx`, `earnings-projection.tsx`, `filter-panel.tsx`, `filter-panel-sections.tsx`, `profile-analytics.tsx`, `profile-post-card.tsx`, `recurring-session-actions.tsx`, `recurring-template-modal.tsx`, `session-type-chips.tsx`, `similar-coaches.tsx`, `trial-discovery-preview.tsx`

### community/ (16 files)
- `ParentGroupCard.tsx` → sections: `ParentGroupCard-sections.tsx`
- `CarpoolOfferCard.tsx` → sections: `carpool-offer-sections.tsx`
- `CreateGroupForm.tsx` → sections: `create-group-form-sections.tsx`
- `group-chat-section.tsx` → sections: `group-chat-section-sections.tsx`
- `group-members-modal.tsx` → sections: `group-members-modal-sections.tsx`
- Standalone: `GroupList.tsx`, `carpool-create-modal.tsx`, `carpool-request-modal.tsx`, `community-tab-content.tsx`, `group-role-picker.tsx`

### compare/ (5 files)
- `CoachColumn.tsx` → sections: `CoachColumn-sections.tsx`
- `CompareBar.tsx`, `CompareButton.tsx`, `ComparisonTable.tsx`

### consent/ (4 files)
- `ConsentBadge.tsx`, `ConsentCard.tsx`, `ConsentFilter.tsx`, `ConsentGrid.tsx`

### development/ (29 files)
- `goal-editor.tsx` → sections: `goal-editor-sections.tsx`, helpers: `goal-editor-helpers.ts`
- `progress-report.tsx` → sections: `progress-report-sections.tsx`
- `progress-timeline.tsx` → sections: `progress-timeline-sections.tsx`
- `session-journal.tsx` → sections: `session-journal-sections.tsx`
- `session-recap-card.tsx` → sections: `session-recap-card-sections.tsx`
- `skill-radar.tsx` → sections: `skill-radar-sections.tsx`
- Session detail: `dev-session-card.tsx`, `dev-session-info.tsx`, `dev-session-media.tsx`, `dev-session-notes.tsx`, `dev-session-ratings.tsx`, `dev-session-skills.tsx`, `dev-session-visibility.tsx`
- Special needs: `dev-special-needs-card.tsx`, `special-needs-hero.tsx`, `special-needs-accommodations.tsx`, `special-needs-disabilities.tsx`, `special-needs-notes-section.tsx`
- Standalone: `child-progress-stats.tsx`, `dev-athlete-hero.tsx`, `dev-progression-card.tsx`

### discover/ (29 files)
- `booking-flow.tsx` → sections: `booking-flow-scheduler.tsx`, `booking-flow-stepper.tsx`, `booking-flow-summary.tsx`, types: `booking-flow-types.ts`
- `FilterModal.tsx` → sections: `filter-modal-sections.tsx`
- `FilterBar.tsx` → sections: `filter-bar-sections.tsx`
- `CoachMarker.tsx` → sections: `coach-marker-sections.tsx`
- `map-view-placeholder.tsx` → sections: `map-view-placeholder-sections.tsx`
- `search-suggestions.tsx` → sections: `search-suggestions-sections.tsx`
- `featured-coaches.tsx` → sections: `featured-coach-card.tsx`, data: `featured-coaches-data.ts`
- Standalone: `MapView.tsx`, `PriceRangeSlider.tsx`, `RatingFilter.tsx`, `coach-marker.tsx`, `featured-section.tsx`, `filter-tray.tsx`, `map-bottom-sheet.tsx`, `map-cluster-overlay.tsx`, `map-coach-card.tsx`, `map-coach-list-row.tsx`, `map-preview.tsx`, `session-offering-card.tsx`

### drills/ (23 files)
- `DrillCard.tsx` → sections: `drill-card-sections.tsx`
- `DrillForm.tsx` → sections: `drill-form-sections.tsx`, constants: `drill-form-constants.ts`
- `DrillList.tsx` → sections: `drill-list-sections.tsx`
- `VideoPlayer.tsx` → sections: `video-player-sections.tsx`
- `AssignmentCard.tsx` → helpers: `assignment-card-helpers.ts`, compact: `assignment-card-compact.tsx`
- Standalone: `DifficultyBadge.tsx`, `DrillCoachNotes.tsx`, `DrillCompletionSection.tsx`, `DrillFeedbackCard.tsx`, `DrillInfoHeader.tsx`, `DrillInstructions.tsx`, `assign-drill-form.tsx`, `challenge-card.tsx`, `challenge-stats-bar.tsx`, `drill-category-filter.tsx`, `drill-stats-card.tsx`, `drill-tab-filter.tsx`

### earnings/ (4 files)
- `earnings-balance-card.tsx`, `earnings-withdraw-modal.tsx`, `transaction-list-item.tsx`

### event/ (20 files)
- `RSVPButton.tsx` → sections: `RSVPButton-sections.tsx`, `rsvp-button-sections.tsx`
- `AttendeeCard.tsx` → sections: `attendee-card-sections.tsx`
- `AttendeeList.tsx` → sections: `attendee-list-sections.tsx`
- `CheckInButton.tsx` → sections: `check-in-button-sections.tsx`
- `event-card.tsx` → sections: `event-card-sections.tsx`
- Create flow: `create-event-type-step.tsx`, `create-event-details-step.tsx`, `create-event-schedule-step.tsx`, `create-event-audience-step.tsx`, `create-event-review-step.tsx`
- Standalone: `event-athlete-selector.tsx`, `event-attendance-section.tsx`, `rsvp-buttons.tsx`

### family/ (27 files)
- `FamilyCalendar.tsx` → sections: `family-calendar-sections.tsx`
- `SpendingChart.tsx` → sections: `spending-chart-sections.tsx`
- `UpcomingSessionsList.tsx` → sections: `upcoming-sessions-sections.tsx`
- `add-child-basic-step.tsx` → sections: `add-child-basic-step-sections.tsx`
- `add-child-emergency-step.tsx` → sections: `add-child-emergency-step-sections.tsx`
- `add-child-medical-step.tsx` — Medical step
- `medical-special-needs-form.tsx` → sections: `medical-special-needs-form-sections.tsx`
- Children hub: `children-child-card.tsx`, `children-hub-sections.tsx`, `children-quick-actions.tsx`, `children-recent-badges.tsx`, `children-stats-row.tsx`
- Sharing: `sharing-guardians-section.tsx`, `sharing-invite-modal.tsx`, `sharing-pending-invites.tsx`
- Standalone: `FamilyMemberCard.tsx`, `family-quick-actions.tsx`, `medical-tag-list-form.tsx`, `next-session-card.tsx`, `spending-comparison-card.tsx`, `spending-transactions.tsx`

### favourites/ (3 files)
- `FavouriteButton.tsx`, `FavouriteCoachCard.tsx`, `FavouritesList.tsx`

### forms/ (3 files)
- `FormButton.tsx`, `FormInput.tsx`, `FormSection.tsx`

### goals/ (15 files)
- `GoalCard.tsx` → sections: `goal-card-sections.tsx`
- `GoalList.tsx` → sections: `goal-list-sections.tsx`
- `MilestoneList.tsx` → sections: `milestone-list-sections.tsx`
- `GoalForm.tsx` — Goal creation form
- Detail: `goal-hero-section.tsx`, `goal-milestones-section.tsx`, `goal-actions-section.tsx`, `goal-meta-card.tsx`
- Standalone: `CategoryBadge.tsx`, `ProgressRing.tsx`, `goal-celebration-modal.tsx`, `goal-preview-card.tsx`

### group/ (14 files)
- Create flow: `create-session-type-step.tsx`, `create-session-details-step.tsx`, `create-session-schedule-step.tsx`, `create-session-pricing-step.tsx`, `create-session-invite-step.tsx`, `create-session-review-step.tsx`
- Detail: `group-session-card.tsx`, `group-session-hero.tsx`, `group-session-details.tsx`, `group-session-coach-actions.tsx`
- Standalone: `participant-card.tsx`, `injury-report-modal.tsx`, `roll-call-modal.tsx`, `waitlist-banner.tsx`

### health/ (16 files)
- `BodyPartSelector.tsx` → sections: `body-part-selector-sections.tsx`
- `InjuryCard.tsx` → sections: `injury-card-sections.tsx`
- `RecoveryTimeline.tsx` → sections: `recovery-timeline-sections.tsx`
- `SeverityPicker.tsx` → sections: `severity-picker-sections.tsx`
- `InjuryForm.tsx` — Injury form
- Standalone: `add-recovery-note.tsx`, `health-stats-card.tsx`, `health-status-card.tsx`, `injury-details-sections.tsx`, `injury-details-step.tsx`, `injury-step-indicator.tsx`, `injury-summary-card.tsx`

### invite/ (40 files — second largest)
- `attendee-list-modal.tsx` → sections: `attendee-list-modal-sections.tsx`
- Create wizard: `create-mode-step.tsx`, `create-type-step.tsx`, `create-details-step.tsx`, `create-slots-step.tsx`, `create-athlete-step.tsx`, `create-existing-step.tsx`, `create-club-step.tsx`, `create-confirm-step.tsx`, `create-confirm-summary.tsx`
- Group invite: `group-target-step.tsx`, `group-session-details-step.tsx`, `group-preview-step.tsx`, `group-confirm-step.tsx`
- Squad invite: `squad-select-step.tsx`, `squad-details-step.tsx`, `squad-members-step.tsx`, `squad-confirm-step.tsx`, `squad-result-step.tsx`
- Standalone: `avatar-stack.tsx`, `chip-selector.tsx`, `cover-image-hero.tsx`, `invite-action-bar.tsx`, `invite-card.tsx`, `invite-counter-display.tsx`, `invite-counter-propose.tsx`, `invite-details-card.tsx`, `invite-filter-bar.tsx`, `invite-list-card.tsx`, `invite-person-card.tsx`, `invite-slot-list.tsx`, `invite-status-banner.tsx`, `invite-type-card.tsx`, `location-map-preview.tsx`, `rsvp-button-group.tsx`, `sent-invites-banner.tsx`, `time-slot-form.tsx`, `wizard-footer.tsx`, `wizard-header.tsx`, `wizard-nav-buttons.tsx`, `wizard-step-indicator.tsx`
- Hooks: `use-group-invite.ts`, `use-squad-invite.ts`

### invoices/ (9 files)
- `DownloadButton.tsx` → sections: `download-button-sections.tsx`
- `InvoiceCard.tsx` → sections: `invoice-card-sections.tsx`
- `InvoiceList.tsx` → sections: `invoice-list-sections.tsx`
- `InvoicePreview.tsx` → sections: `invoice-preview-sections.tsx`

### match/ (15 files)
- `match-card.tsx` → sections: `match-card-sections.tsx`
- `availability-response.tsx` → sections: `availability-response-sections.tsx`
- `lineup-selector.tsx` → sections: `lineup-selector-sections.tsx`
- Create flow: `create-match-details.tsx`, `create-match-schedule.tsx`, `create-match-squad.tsx`, `create-match-review.tsx`
- Standalone: `match-availability-stats.tsx`, `match-coach-actions.tsx`, `match-header-card.tsx`, `match-player-list.tsx`

### messaging/ (14 files)
- `message-composer.tsx` → sections: `message-composer-sections.tsx`
- Standalone: `attachment-picker.tsx`, `attachment-preview.tsx`, `chat-input.tsx`, `conversation-row.tsx`, `group-conversation-row.tsx`, `group-threads-section.tsx`, `message-bubble.tsx`, `messages-search-bar.tsx`, `messages-view-toggle.tsx`, `thread-summary.tsx`, `typing-indicator.tsx`

### negotiate/ (10 files)
- `CounterOfferCard.tsx` → sections: `counter-offer-card-sections.tsx`
- `NegotiationTimeline.tsx` → sections: `negotiation-timeline-event.tsx`, helpers: `negotiation-timeline-helpers.ts`
- `TimeProposalForm.tsx` → sections: `time-proposal-sections.tsx`, helpers: `time-proposal-helpers.ts`
- Standalone: `AcceptRejectButtons.tsx`, `reject-modal.tsx`

### notification/ (15 files)
- `MutedCoachesList.tsx` → sections: `muted-coaches-list-sections.tsx`
- `NotificationTypeList.tsx` → sections: `notification-type-list-sections.tsx`
- `QuietHoursSelector.tsx` → sections: `quiet-hours-sections.tsx`
- Standalone: `ChannelToggle.tsx`, `notification-card.tsx`, `notification-day-groups.tsx`, `notification-filter-bar.tsx`, `notification-filter-chip.tsx`, `notification-toast.tsx`, `notifications-actions-bar.tsx`, `notifications-panel.tsx`

### onboarding/ (8 files)
- `coach-welcome.tsx` → screens: `coach-welcome-screens.tsx`, data: `coach-welcome-data.ts`
- `parent-welcome.tsx` → screens: `parent-welcome-screens.tsx` → sections: `parent-welcome-screens-sections.tsx`, data: `parent-welcome-data.ts`

### packages/ (9 files)
- `CreatePackageForm.tsx` → sections: `create-package-sections.tsx`, constants: `create-package-constants.ts`
- `MyPackages.tsx` → sections: `my-packages-sections.tsx`
- Standalone: `PackageCard.tsx`, `PackageList.tsx`, `PurchaseButton.tsx`

### parent/ (22 files)
- `discover-screen.tsx` → sections: `discover-header.tsx`, `discover-coach-list.tsx`, `discover-club-hub.tsx`, `discover-pending-invites.tsx`, `discover-review-prompt.tsx`
- `development-screen.tsx` → tabs: `dev-child-selector.tsx`, `dev-profile-card.tsx`, `dev-progress-tab.tsx`, `dev-goals-tab.tsx`, `dev-badges-tab.tsx`
- `onboarding-checklist.tsx` → sections: `onboarding-checklist-sections.tsx`
- `multi-week-invite-card.tsx` → sections: `multi-week-invite-card-sections.tsx`
- `session-invite-card.tsx` → sections: `session-invite-sections.tsx`, helpers: `session-invite-helpers.ts`
- Standalone: `decline-reason-sheet.tsx`, `kids-screen.tsx`

### payment/ (5 files)
- `payment-modal.tsx` → sections: `payment-modal-sections.tsx`
- Standalone: `card-form.tsx`, `card-list-item.tsx`

### profile/ (12 files)
- Edit sections: `edit-basic-info.tsx`, `edit-certifications-section.tsx`, `edit-children-section.tsx`, `edit-contact-info.tsx`, `edit-experience-section.tsx`, `edit-languages-section.tsx`, `edit-photo-section.tsx`, `edit-pricing-section.tsx`, `edit-specialties-section.tsx`
- Standalone: `achievement-badge.tsx`, `social-links.tsx`, `social-links-editor.tsx`

### progress/ (13 files)
- `progress-dashboard.tsx` — Dashboard view
- `session-feedback-card.tsx` → sections: `session-feedback-sections.tsx`
- `skill-level-card.tsx` → helpers: `skill-level-helpers.ts`, grid: `skill-level-grid.tsx`
- Standalone: `progress-badges-section.tsx`, `progress-badges-tab.tsx`, `progress-goals-section.tsx`, `progress-goals-tab.tsx`, `progress-level-banner.tsx`, `progress-overview-card.tsx`, `progress-parent-summary.tsx`

### promo/ (10 files)
- `PromoCodeCard.tsx` → sections: `promo-code-card-sections.tsx`
- `CreateCodeForm.tsx` → sections: `create-code-sections.tsx`
- `PromoCodeInput.tsx` → sections: `promo-code-input-sections.tsx`
- `CodeUsageList.tsx` → sections: `code-usage-list-sections.tsx`
- Standalone: `promo-usage-modal.tsx`

### recurring/ (12 files)
- `RecurringCard.tsx` → sections: `recurring-card-content.tsx`, `recurring-card-modals.tsx`, helpers: `recurring-card-helpers.ts`
- `RecurringList.tsx` → sections: `recurring-list-sections.tsx`
- `FrequencyPicker.tsx` → sections: `frequency-picker-sections.tsx`
- `SubscribeForm.tsx` → sections: `subscribe-coach-header.tsx`, `subscribe-options-section.tsx`, `subscribe-schedule-section.tsx`, `subscribe-summary.tsx`

### referrals/ (9 files)
- `ReferralCodeCard.tsx` → sections: `referral-code-card-sections.tsx`
- `ReferralHistory.tsx` → sections: `referral-history-sections.tsx`
- `ReferralStats.tsx` → sections: `referral-stats-sections.tsx`
- `ShareButton.tsx` → sections: `share-button-sections.tsx`

### review/ (5 files)
- `rating-form.tsx`, `rating-stars.tsx`, `review-card.tsx`, `review-form.tsx`, `coach-select-list.tsx`

### roster/ (15 files)
- `removal-confirmation-modal.tsx` → sections: `removal-confirmation-sections.tsx`
- Standalone: `athlete-card.tsx`, `athlete-filters.tsx`, `athlete-notes.tsx`, `athlete-row.tsx`, `athlete-status-modal.tsx`, `athlete-tab-bar.tsx`, `athlete-tag-modal.tsx`, `roster-filter-chips.tsx`, `roster-list.tsx`, `roster-quick-actions.tsx`, `roster-search-bar.tsx`, `roster-selection-bar.tsx`

### safety/ (17 files)
- `EmergencyContactCard.tsx` → sections: `emergency-contact-card-sections.tsx`
- `EmergencyQuickCard.tsx` → sections: `emergency-quick-card-sections.tsx`
- `MedicalAlertBadge.tsx` → sections: `MedicalAlertBadge-sections.tsx`, `medical-alert-badge-sections.tsx`
- `SafetyChecklist.tsx` → sections: `safety-checklist-sections.tsx`
- `emergency-banner.tsx` → sections: `emergency-banner-sections.tsx`
- `medical-card.tsx` → sections: `medical-card-sections.tsx`
- `report-flow.tsx` → sections: `report-flow-sections.tsx`
- Standalone: `block-user.tsx`, `emergency-details.tsx`

### schedule/ (10 files)
- Standalone: `schedule-availability-segment.tsx`, `schedule-day-detail.tsx`, `schedule-quick-actions.tsx`, `schedule-rules-summary.tsx`, `schedule-segment-control.tsx`, `schedule-session-item.tsx`, `schedule-today-card.tsx`, `schedule-week-strip.tsx`
- Types: `schedule-types.ts`

### session/ (18 files)
- `rsvp-flow.tsx` → sections: `rsvp-flow-sections.tsx`
- `rsvp-summary.tsx` → sections: `rsvp-summary-sections.tsx`
- Create wizard: `create-details-step.tsx`, `create-schedule-step.tsx`, `create-invite-step.tsx`, `create-review-step.tsx`, `create-step-indicator.tsx`, `create-footer-bar.tsx`
- Complete flow: `attendance-step.tsx`, `notes-step.tsx`, `review-step.tsx`, `badges-step.tsx`, `completion-step-indicator.tsx`
- Standalone: `session-notes-form.tsx`, `session-notes-view.tsx`, `wizard-nav-buttons.tsx`
- Types: `create-session-types.ts`

### sessions/ (8 files)
- `session-detail-modal.tsx` — Detail modal
- `session-offering-card.tsx` → sections: `session-offering-card-sections.tsx`
- Standalone: `session-booking-options.tsx`, `session-info-section.tsx`, `session-instance-manager.tsx`, `session-registrations.tsx`

### settings/ (14 files)
- Hub: `settings-nav-hub.tsx`, `settings-profile-card.tsx`, `settings-row.tsx`
- Sections: `settings-account-section.tsx`, `settings-alerts-section.tsx`, `settings-payments-section.tsx`, `settings-preferences-section.tsx`, `settings-privacy-section.tsx`, `settings-support-section.tsx`, `settings-sign-out-section.tsx`
- Standalone: `coaching-rows.tsx`, `faq-card.tsx`, `settings-notification-toggles.tsx`

### skills/ (7 files)
- `SkillNode.tsx` → sections: `SkillNode-sections.tsx`
- `SkillTreeView.tsx` → sections: `skill-tree-sections.tsx`
- Standalone: `ProgressBadge.tsx`, `SkillConnection.tsx`, `skill-node-detail-modal.tsx`

### social/ (16 files)
- `feed-post-card.tsx` → sections: `feed-post-card-sections.tsx`, `feed-post-actions.tsx`, `feed-post-origin-badge.tsx`
- `feed-filters.tsx` → sections: `feed-filters-sections.tsx`
- `comment-card.tsx` → sections: `comment-card-sections.tsx`
- Standalone: `comment-input.tsx`, `comment-preview.tsx`, `create-post-form.tsx`, `club-post-event-fields.tsx`, `club-post-selectors.tsx`, `post-detail-card.tsx`, `session-announcement-card.tsx`, `social-feed.tsx`

### squad/ (20 files)
- `BulkInviteButton.tsx` → sections: `bulk-invite-button-sections.tsx`
- `InviteResultCard.tsx` → sections: `invite-result-sections.tsx`
- `SquadMemberSelect.tsx` → sections: `squad-member-select-sections.tsx`
- `squad-picker.tsx` → sections: `squad-picker-sections.tsx`
- `squad-invite-modal.tsx` — Invite modal
- Standalone: `inline-squad-selector.tsx`, `squad-add-members.tsx`, `squad-confirm-step.tsx`, `squad-danger-zone.tsx`, `squad-info-card.tsx`, `squad-invite-history.tsx`, `squad-invite-session-form.tsx`, `squad-members-card.tsx`, `squad-preview-step.tsx`, `squad-quick-actions.tsx`, `squad-select-step.tsx`

### user/ (4 files)
- `home-screen.tsx` → sections: `home-screen-sections.tsx`
- `find-coach-screen.tsx` → sections: `find-coach-screen-sections.tsx`

### verification/ (4 files)
- `credential-card.tsx`, `credential-form.tsx`, `verification-badge.tsx`, `verification-item-row.tsx`

### video/ (19 files)
- `AnnotationForm.tsx` → sections: `annotation-form-sections.tsx`
- `AnnotationPanel.tsx` → sections: `annotation-panel-sections.tsx`
- `AnnotationBadge.tsx` → sections: `annotation-badge-sections.tsx`, `annotation-badge.tsx`
- `TimelineBar.tsx` → sections: `timeline-bar-sections.tsx`
- `video-player.tsx` → sections: `video-player-sections.tsx`
- `video-upload.tsx` → sections: `video-upload-sections.tsx`
- Standalone: `AnnotationMarker.tsx`, `quick-annotation-bar.tsx`, `video-annotation.tsx`, `video-card.tsx`, `video-detail-actions.tsx`, `video-details-card.tsx`, `video-info-section.tsx`
- Helpers: `video-annotation-helpers.ts`

### waitlist/ (7 files)
- `WaitlistButton.tsx` → sections: `waitlist-button-sections.tsx`
- `WaitlistManage.tsx` → sections: `waitlist-manage-sections.tsx`
- Standalone: `WaitlistCard.tsx`, `WaitlistPosition.tsx`

### wallet/ (0 .tsx files in dir — uses wallet primitives directly)

---

## 3. SERVICES (`services/`)

### Infrastructure
- `api-client.ts` — Single data access layer (AsyncStorage wrapper, offline queue, rate limiter)
- `api-contracts.ts` — API type contracts
- `base-service.ts` — Base class (Map cache, 30s TTL, CRUD, `Result<T>`)
- `event-bus.ts` — Typed pub/sub (51+ events, `emitTyped`/`onTyped`)
- `service-subscribers.ts` — Cross-service event wiring
- `offline-queue.ts` — Offline operation queue
- `storage-service.ts` — Low-level storage utilities

### Single-File Services (44)
| Service | Domain |
|---------|--------|
| `academy-service.ts` | Academy CRUD |
| `analytics-service.ts` | Analytics facade |
| `auth-service.ts` | Authentication |
| `availability-service.ts` | Coach availability |
| `badge-service.ts` | Badge/achievement |
| `block-service.ts` | User blocking |
| `booking-service.ts` | Booking facade (re-exports module) |
| `calendar-service.ts` | Calendar operations |
| `calendar-sync-subscriber.ts` | Calendar sync events |
| `cancellation-service.ts` | Cancellation logic |
| `challenge-service.ts` | Drill challenges |
| `child-service.ts` | Child profiles |
| `club-service.ts` | Club CRUD |
| `coach-service.ts` | Coach profiles |
| `coach-venue-service.ts` | Coach venues |
| `comment-service.ts` | Comments |
| `community-service.ts` | Community facade |
| `comparison-service.ts` | Coach comparison |
| `concern-service.ts` | Concern reports (extends BaseService) |
| `consent-service.ts` | Parental consents |
| `counter-offer-service.ts` | Counter-offers |
| `discover-service.ts` | Discovery/search |
| `drill-service.ts` | Drills CRUD |
| `event-service.ts` | Events facade |
| `family-service.ts` | Family facade (re-exports module) |
| `favourite-service.ts` | Favourites |
| `follow-service.ts` | Following |
| `group-session-service.ts` | Group sessions facade |
| `injury-service.ts` | Injury tracking |
| `invite-hold-service.ts` | Invite holds |
| `invoice-service.ts` | Invoices |
| `match-service.ts` | Match management |
| `messaging-service.ts` | Messaging |
| `multi-week-booking-service.ts` | Multi-week bookings |
| `notification-service.ts` | Notifications facade |
| `notification-trigger.ts` | Notification triggers |
| `package-service.ts` | Session packages |
| `progress-service.ts` | Progress facade |
| `promo-service.ts` | Promo codes |
| `push-notification-service.ts` | Push notifications |
| `recurring-booking-service.ts` | Recurring bookings |
| `referral-service.ts` | Referrals |
| `report-service.ts` | Reports |
| `reschedule-service.ts` | Rescheduling |
| `review-service.ts` | Reviews |
| `roster-service.ts` | Roster (extends BaseService) |
| `rsvp-service.ts` | RSVPs |
| `safety-service.ts` | Safety features |
| `scheduling-rules-service.ts` | Scheduling rules |
| `seen-service.ts` | Seen/read tracking |
| `session-template-service.ts` | Session templates |
| `social-feed-service.ts` | Social feed |
| `squad-group-service.ts` | Squad groups |
| `squad-service.ts` | Squads |
| `trial-service.ts` | Trial sessions |
| `verification-service.ts` | Coach verification |
| `video-service.ts` | Video management |
| `waitlist-service.ts` | Waitlists |
| `wallet-service.ts` | Wallet facade |

### Service Modules (12 directories)
| Module | Files |
|--------|-------|
| `analytics/` | `analytics-tracking-service.ts`, `analytics-query-service.ts`, `analytics-export-service.ts`, `index.ts` |
| `booking/` | `booking-crud-service.ts`, `booking-status-service.ts`, `booking-search-service.ts`, `index.ts` |
| `community/` | `community-group-service.ts`, `community-carpool-service.ts`, `community-messaging-service.ts`, `index.ts` |
| `earnings/` | `earnings-report-service.ts`, `earnings-calculator-service.ts`, `payout-service.ts`, `index.ts` |
| `event/` | `event-crud-service.ts`, `event-display-service.ts`, `event-attendance-service.ts`, `event-rsvp-service.ts`, `index.ts` |
| `family/` | `family-relationship-service.ts`, `family-member-service.ts`, `family-permission-service.ts`, `types.ts`, `index.ts` |
| `group-session/` | `session-crud-service.ts`, `session-display-service.ts`, `session-registration-service.ts`, `session-scheduling-service.ts`, `index.ts` |
| `invite/` | `session-invite-service.ts`, `squad-invite-service.ts`, `bulk-invite-service.ts`, `match-invite-service.ts`, `event-invite-service.ts`, `invite-rsvp-service.ts`, `invite-share-service.ts`, `repeat-invite-helper.ts`, `index.ts` |
| `notification/` | `notification-store.ts`, `notification-sender.ts`, `notification-preferences.ts`, `index.ts` |
| `progress/` | `progress-skills-service.ts`, `progress-goals-service.ts`, `progress-feedback-service.ts`, `progress-report-service.ts`, `index.ts` |
| `skills/` | `skill-definition-service.ts`, `skill-progress-service.ts`, `skill-achievement-service.ts`, `index.ts` |
| `wallet/` | `wallet-crud-service.ts`, `wallet-payment-service.ts`, `wallet-transaction-service.ts`, `wallet-utils-service.ts`, `index.ts` |

---

## 4. HOOKS (`hooks/`)

### Infrastructure Hooks
- `use-screen.ts` — Screen state machine (loading/error/empty/success + refresh + events)
- `useTheme.ts` — `{ colors, scheme, isDark }` from theme
- `use-auth.tsx` — Auth context
- `use-color-scheme.ts` — Color scheme detection
- `use-form.ts` — Form state management
- `use-feature-flag.ts` — Feature flags
- `useConnectionStatus.ts` — Online/offline status
- `useOfflineQueue.ts` — Offline queue
- `usePushNotifications.ts` — Push notification setup
- `theme-provider.tsx` — Theme context provider

### Data Hooks (`hooks/data/`)
- `useAthleteData.ts` — Athlete data fetching
- `useClubData.ts` — Club data fetching
- `useCoachData.ts` — Coach data fetching

### Screen Hooks (1 per screen, ~120 hooks)
| Hook | Screen |
|------|--------|
| `use-academy-branding.ts` | Academy branding |
| `use-academy-detail.ts` | Academy detail |
| `use-academy-settings.ts` | Academy settings |
| `use-academy-staff.ts` | Academy staff |
| `use-account-settings.ts` | Account settings |
| `use-add-child.ts` | Add child modal |
| `use-add-template.ts` | Add availability template |
| `use-analytics-dashboard.ts` | Analytics dashboard |
| `use-appearance.ts` | Appearance settings |
| `use-athlete-analytics.ts` | Athlete analytics |
| `use-athlete-detail.ts` | Athlete detail |
| `use-athlete-development.ts` | Athlete development |
| `use-athlete-progress.ts` | Athlete progress |
| `use-athlete-session-detail.ts` | Athlete session detail |
| `use-attendees.ts` | Event attendees |
| `use-availability-calendar.ts` | Availability calendar |
| `use-availability-wizard.ts` | Availability wizard |
| `use-background-check.ts` | Background check |
| `use-badge-award.ts` | Badge award |
| `use-badges-screen.ts` | Badges screen |
| `use-blocked-dates.ts` | Blocked dates |
| `use-book-coach.ts` | Book coach |
| `use-booking-cancel.ts` | Cancel booking |
| `use-booking-detail.ts` | Booking detail |
| `use-booking-persona.ts` | Booking persona detection |
| `use-bookings.ts` | Bookings list |
| `use-calendar-sync.ts` | Calendar sync |
| `use-cancel-flow.ts` | Cancel flow |
| `use-carpool.ts` | Carpool |
| `use-child-badges.ts` | Child badges |
| `use-child-progress.ts` | Child progress |
| `use-children-hub.ts` | Children hub |
| `use-club-calendar.ts` | Club calendar |
| `use-club-dashboard.ts` | Club dashboard |
| `use-club-detail.ts` | Club detail |
| `use-club-hub.ts` | Club hub tab |
| `use-club-invite.ts` | Club invite |
| `use-club-settings.ts` | Club settings |
| `use-coach-detail.ts` | Coach detail |
| `use-coach-development.ts` | Coach development |
| `use-coach-invites.ts` | Coach invites |
| `use-coach-profile.ts` | Coach profile |
| `use-coach-welcome.ts` | Coach welcome |
| `use-coaching-settings.ts` | Coaching settings |
| `use-community-hub.ts` | Community hub |
| `use-confirm-booking.ts` | Confirm booking |
| `use-consents.ts` | Consents |
| `use-counter-offer.ts` | Counter offer |
| `use-create-academy.ts` | Create academy |
| `use-create-club-post.ts` | Create club post |
| `use-create-club.ts` | Create club |
| `use-create-code-form.ts` | Create promo code |
| `use-create-event.ts` | Create event |
| `use-create-group-session.ts` | Create group session |
| `use-create-invite.ts` | Create invite |
| `use-create-match.ts` | Create match |
| `use-create-package-form.ts` | Create package |
| `use-create-post.ts` | Create post |
| `use-create-session.ts` | Create session |
| `use-create-squad.ts` | Create squad |
| `use-credentials.ts` | Credentials |
| `use-day-editor.ts` | Day editor |
| `use-dev-badges.ts` | Development badges |
| `use-dev-session.ts` | Development session |
| `use-discover-sessions.ts` | Discover sessions |
| `use-drill-assign.ts` | Assign drill |
| `use-drill-form.ts` | Drill form |
| `use-drill-library.ts` | Drill library |
| `use-drills-screen.ts` | Drills screen |
| `use-earnings.ts` | Earnings |
| `use-edit-profile.ts` | Edit profile |
| `use-edit-template.ts` | Edit template |
| `use-emergency-access.ts` | Emergency access |
| `use-emergency-contacts.ts` | Emergency contacts |
| `use-event-attendees.ts` | Event attendees |
| `use-event-detail.ts` | Event detail |
| `use-event-rsvp.ts` | Event RSVP |
| `use-family-calendar.ts` | Family calendar |
| `use-family-dashboard.ts` | Family dashboard |
| `use-family-sharing.ts` | Family sharing |
| `use-family-spending.ts` | Family spending |
| `use-goal-detail.ts` | Goal detail |
| `use-goals-dashboard.ts` | Goals dashboard |
| `use-group-roster.ts` | Group roster |
| `use-group-session.ts` | Group session detail |
| `use-group-sessions.ts` | Group sessions list |
| `use-health-detail.ts` | Health detail |
| `use-health-hub.ts` | Health hub |
| `use-help-screen.ts` | Help screen |
| `use-help-settings.ts` | Help settings |
| `use-home-screen.ts` | Home screen |
| `use-id-verification.ts` | ID verification |
| `use-injuries.ts` | Injuries |
| `use-invite-athletes.ts` | Invite athletes |
| `use-invite-codes.ts` | Invite codes |
| `use-invite-session-flow.ts` | Invite session flow |
| `use-invites.ts` | Invites |
| `use-invoice-detail.ts` | Invoice detail |
| `use-match-detail.ts` | Match detail |
| `use-matches-screen.ts` | Matches screen |
| `use-medical-info.ts` | Medical info |
| `use-member-management.ts` | Member management |
| `use-messages.ts` | Messages |
| `use-multi-week.ts` | Multi-week booking |
| `use-my-progress.ts` | My progress |
| `use-negotiate.ts` | Negotiate |
| `use-notification-prefs.ts` | Notification preferences |
| `use-notifications.ts` | Notifications |
| `use-objectives.ts` | Objectives |
| `use-package-detail.ts` | Package detail |
| `use-package-manage.ts` | Package management |
| `use-parent-development.ts` | Parent development |
| `use-post-detail.ts` | Post detail |
| `use-promo-codes.ts` | Promo codes |
| `use-public-profile.ts` | Public profile |
| `use-rate-coach.ts` | Rate coach |
| `use-recurring-template-form.ts` | Recurring template |
| `use-referral-invite.ts` | Referral invite |
| `use-referrals.ts` | Referrals |
| `use-retention-analytics.ts` | Retention analytics |
| `use-revenue-analytics.ts` | Revenue analytics |
| `use-schedule.ts` | Schedule |
| `use-scheduling-rules-editor.ts` | Scheduling rules editor |
| `use-scheduling-rules.ts` | Scheduling rules |
| `use-session-completion.ts` | Session completion |
| `use-session-detail-modal.ts` | Session detail modal |
| `use-session-note.ts` | Session notes |
| `use-settings-hub.ts` | Settings hub |
| `use-skill-category.ts` | Skill category |
| `use-skills-screen.ts` | Skills screen |
| `use-special-needs.ts` | Special needs |
| `use-squad-detail.ts` | Squad detail |
| `use-squad-invite-modal.ts` | Squad invite modal |
| `use-squad-invite.ts` | Squad invite |
| `use-statistics.ts` | Statistics |
| `use-subscribe-form.ts` | Subscribe form |
| `use-subscribe.ts` | Subscribe |
| `use-time-off-form.ts` | Time off |
| `use-training-schedule.ts` | Training schedule |
| `use-verification-hub.ts` | Verification hub |
| `use-verification.ts` | Verification |
| `use-video-annotate.ts` | Video annotate |
| `use-video-detail.ts` | Video detail |
| `use-video-review.ts` | Video review |
| `use-video-upload.ts` | Video upload |
| `use-videos-list.ts` | Videos list |
| `use-videos-screen.ts` | Videos screen |
| `use-wallet-promo.ts` | Wallet promo |
| `use-wallet.ts` | Wallet |

---

## 5. CONSTANTS & TYPES

### Constants (`constants/`)
| File | Purpose |
|------|---------|
| `theme.ts` | Design tokens: Colors, Typography, Spacing, Radii, Shadows, Components, Borders, withAlpha() |
| `storage-keys.ts` | 90+ AsyncStorage keys by domain |
| `app-types.ts` | User, CoachProfile, UserProfile, ChildRelationship, Session, Booking |
| `session-types.ts` | Session, invite, availability, booking type definitions |
| `user-types.ts` | UserRole, SkillLevel, normalizeUserRole |
| `booking-types.ts` | Booking-specific types |
| `club-types.ts` | Club, Squad, ClubMember types |
| `event-types.ts` | Event, RSVP types |
| `family-types.ts` | Family relationship types |
| `financial-types.ts` | Earnings, invoice, payment types |
| `notification-types.ts` | Notification types and payloads |
| `analytics-types.ts` | Analytics data types |
| `comment-types.ts` | Comment types |
| `skill-types.ts` | Skill, Goal types |
| `social-types.ts` | Social feed types |
| `video-types.ts` | Video, annotation types |
| `error-types.ts` | Error type definitions |
| `types.ts` | Shared/legacy types |
| `progression.ts` | Progression system data |
| `session-plan-templates.ts` | Session plan templates |
| `styles.ts` | Shared styles |
| `config.ts` | App config (imports expo-constants) |
| `mock-data.ts` | Mock data for development |

### Types (`types/`)
- `result.ts` — `Result<T, ServiceError>`, `ok()`, `err()`, `notFound()`, `storageError()`
- `index.ts` — Type barrel export

### Context (`context/`)
- `booking-flow-context.tsx` — Booking wizard state

### Navigation (`navigation/`)
- `routes.ts` — Route constants (`Routes.*`)

### Utils (`utils/`)
- `logger.ts` — `createLogger()` factory
- `format.ts` — Date/number/currency formatting
- `scale.ts` — `scaleFont()` for responsive text
- `validation.ts` — Input validation helpers
- `calendar-helpers.ts` — Calendar utilities
- `contact-actions.ts` — Contact action helpers
- `user-helpers.ts` — User role/status helpers

---

## 6. COUNTS SUMMARY

| Layer | Count |
|-------|-------|
| Screens (app/*.tsx) | ~185 |
| Component directories | 60 |
| Component files (total) | ~580 |
| Services (single-file) | ~66 |
| Service modules (directories) | 12 |
| Service module files | ~58 |
| Hooks | ~130 |
| Constants files | 23 |
| Utils | 7 |
| UI Primitives | 14 |
| Layout Primitives | 6 |
