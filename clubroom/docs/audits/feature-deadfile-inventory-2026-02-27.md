# Feature + Dead File Inventory (2026-02-27)

Generated from `app/`, `scripts/ui-flow-checks-50.mjs`, `navigation/routes.ts`, and `docs/audits/architecture-reachability-audit-2026-02-27.json`.

## Snapshot

- App screens (routable): **167**
- Route domains: **47**
- Defined UI flows: **69**
- Likely dead components: **130**
- Dead status split: unreferenced=28, not_reachable_from_app=42, barrel_only_not_reachable=60
- Route mismatches: app-only=8, builder-only=25

## Big Functions -> Sub Functions (Domain -> Routes)

### (tabs) (24)

- /(tabs)
- /(tabs)/admin/invite-codes
- /(tabs)/athletes
- /(tabs)/availability
- /(tabs)/badges
- /(tabs)/bookings
- /(tabs)/bookings/[id]
- /(tabs)/bookings/objectives
- /(tabs)/bookings/report-problem
- /(tabs)/bookings/session-feedback
- /(tabs)/bookings/statistics
- /(tabs)/children
- /(tabs)/club-hub
- /(tabs)/coach-profile
- /(tabs)/earnings
- /(tabs)/edit-profile
- /(tabs)/feed
- /(tabs)/messages
- /(tabs)/more
- /(tabs)/notifications
- /(tabs)/profile
- /(tabs)/roster
- /(tabs)/schedule
- /(tabs)/settings

### settings (15)

- /settings
- /settings/account
- /settings/appearance
- /settings/blocked-dates
- /settings/calendar-sync
- /settings/cancellation-policy
- /settings/coaching
- /settings/help
- /settings/notifications
- /settings/notifications/preferences
- /settings/privacy
- /settings/privacy-policy
- /settings/smart-slots
- /settings/terms
- /settings/travel-radius

### club (10)

- /club/[clubId]/calendar
- /club/[clubId]/dashboard
- /club/[clubId]/member/[memberId]
- /club/[id]
- /club/create
- /club/invite-members
- /club/settings
- /club/squad/[id]
- /club/squad/create
- /club/training-schedule

### development (8)

- /development/athlete/[athleteId]
- /development/athlete/[athleteId]/special-needs
- /development/badges
- /development/child-progress/[childId]
- /development/media-gallery
- /development/my-progress
- /development/session-history
- /development/session/[sessionId]

### (modal) (7)

- /(modal)/add-child
- /(modal)/create-club-post
- /(modal)/create-post
- /(modal)/create-squad
- /(modal)/edit-child-profile
- /(modal)/edit-child-sen
- /(modal)/post-detail

### book (7)

- /book/[coachId]
- /book/[coachId]/confirmation
- /book/[coachId]/details
- /book/[coachId]/multi-week
- /book/[coachId]/review
- /book/[coachId]/schedule
- /book/[coachId]/session-type

### drills (7)

- /drills
- /drills/[id]
- /drills/assign
- /drills/challenges
- /drills/create
- /drills/create-challenge
- /drills/library

### roster (6)

- /roster
- /roster/[athleteId]
- /roster/[athleteId]/add-to-session
- /roster/[athleteId]/emergency
- /roster/[athleteId]/raise-concern
- /roster/consents

### analytics (5)

- /analytics/[athleteId]
- /analytics/[athleteId]/goals
- /analytics/dashboard
- /analytics/retention
- /analytics/revenue

### events (5)

- /events
- /events/[id]
- /events/[id]/attendees
- /events/[id]/rsvp
- /events/create

### family (5)

- /family
- /family/[legacy]
- /family/calendar
- /family/sharing
- /family/spending

### verification (5)

- /verification
- /verification/background
- /verification/credentials
- /verification/id
- /verification/insurance

### availability (4)

- /availability/add-template
- /availability/block-date
- /availability/calendar
- /availability/edit-template

### group-sessions (4)

- /group-sessions
- /group-sessions/[id]
- /group-sessions/[id]/roster
- /group-sessions/create

### health (4)

- /health
- /health/[id]
- /health/injuries
- /health/log

### session-invites (4)

- /session-invites
- /session-invites/[id]
- /session-invites/create
- /session-invites/group

### coach (3)

- /coach/[coachId]/public
- /coach/[id]
- /coach/invite

### goals (3)

- /goals
- /goals/[id]
- /goals/create

### matches (3)

- /matches
- /matches/[id]
- /matches/create

### bookings (2)

- /bookings/[id]/counter
- /bookings/subscribe

### chat (2)

- /chat
- /chat/[threadId]

### child (2)

- /child/[id]/emergency
- /child/[id]/medical

### community (2)

- /community
- /community/[groupId]

### compare (2)

- /compare
- /compare/[ids]

### invoices (2)

- /invoices
- /invoices/[id]

### manage (2)

- /manage
- /manage/[legacy]

### review (2)

- /review/[bookingId]
- /review/create

### session (2)

- /session/[id]/complete
- /session/[id]/rsvp

### videos (2)

- /videos/[id]
- /videos/upload

### athlete (1)

- /athlete/journal

### badges (1)

- /badges

### book-coach (1)

- /book-coach

### booking (1)

- /booking/[id]/cancel

### children (1)

- /children/badges/[childId]

### coach-invites (1)

- /coach-invites

### discover (1)

- /discover/map

### discover-sessions (1)

- /discover-sessions

### earnings (1)

- /earnings

### favourites (1)

- /favourites

### invites (1)

- /invites

### payments (1)

- /payments

### profile (1)

- /profile/[userId]

### rate-coach (1)

- /rate-coach

### referrals (1)

- /referrals/invite

### session-notes (1)

- /session-notes/[bookingId]

### sessions (1)

- /sessions/create

### squads (1)

- /squads/[id]/invite

## Role Flows (Coach / Parent / Athlete)

### coach (30)

- coach_home: Coach opens dashboard -> /
- coach_schedule: Coach opens schedule -> /schedule
- coach_athletes: Coach opens athletes -> /athletes
- coach_feed: Coach opens feed -> /feed
- coach_messages: Coach opens messages -> /messages
- coach_bookings: Coach opens bookings -> /bookings
- coach_settings: Coach opens settings -> /settings
- coach_progress: Coach opens development progress -> /development/my-progress
- coach_goals: Coach opens goals -> /goals
- coach_badges: Coach opens achievements -> /badges
- coach_skills: Coach opens skill trees -> /skills
- coach_discover_sessions: Coach opens discover sessions -> /discover-sessions
- coach_availability_calendar: Coach opens availability calendar -> /availability/calendar
- coach_availability_rules: Coach opens cancellation policy -> /settings/cancellation-policy
- coach_group_sessions: Coach opens group sessions -> /group-sessions/index
- coach_group_sessions_create: Coach opens create group session -> /group-sessions/create
- coach_create_invite_entry: Coach opens create/invite hub -> /sessions/create
- coach_make_appointment: Coach starts booking a new appointment -> /sessions/create | action: clickButton:Book New Session
- coach_invite_existing: Coach starts invite-to-existing flow -> /sessions/create | action: clickButton:Add to Existing Session
- coach_session_invites: Coach opens invite inbox -> /session-invites/index
- coach_session_invites_create_redirect: Coach hits invite redirect -> /session-invites/create
- coach_club_settings: Coach opens club settings -> /club/settings
- coach_club_create: Coach opens create club -> /club/create
- coach_squad_create: Coach opens create squad -> /club/squad/create
- coach_squad_detail: Coach opens squad detail -> /club/squad/squad_u15
- coach_add_member_to_squad: Coach opens add-member panel inside squad -> /club/squad/squad_u15 | action: clickButton:Add
- coach_squad_invite_screen: Coach opens squad invite screen -> /squads/squad_u15/invite
- coach_manage: Coach opens management hub -> /manage
- coach_club_invite_members: Coach opens club invite members -> /club/invite-members
- coach_rate: Coach opens rate screen -> /rate-coach

### parent (24)

- parent_home: Parent opens dashboard -> /
- parent_children: Parent opens children -> /children
- parent_feed: Parent opens feed -> /feed
- parent_messages: Parent opens messages -> /messages
- parent_bookings: Parent opens bookings -> /bookings
- parent_settings: Parent opens settings -> /settings
- parent_family: Parent opens family dashboard -> /family
- parent_family_calendar: Parent opens family calendar -> /family/calendar
- parent_family_spending: Parent opens family spending -> /family/spending
- parent_discover_sessions: Parent opens discover sessions -> /discover-sessions
- parent_favourites: Parent opens favourites -> /favourites
- parent_book_coach: Parent opens find coach -> /book-coach
- parent_progress: Parent opens my progress -> /development/my-progress
- parent_child_progress: Parent opens child progress -> /development/child-progress/user1
- parent_goals: Parent opens goals -> /goals
- parent_skills: Parent opens skills -> /skills
- parent_badges: Parent opens achievements -> /badges
- parent_rate: Parent opens rate coach -> /rate-coach
- parent_book_flow_start: Parent opens book flow home -> /book/coach1
- parent_book_flow_type: Parent opens session-type step -> /book/coach1/session-type
- parent_book_flow_schedule: Parent opens schedule step -> /book/coach1/schedule
- parent_book_flow_details: Parent opens details step -> /book/coach1/details
- parent_book_flow_review: Parent opens review step -> /book/coach1/review
- parent_book_flow_confirmation: Parent opens confirmation step -> /book/coach1/confirmation

### athlete (15)

- athlete_home: Athlete opens dashboard -> /
- athlete_feed: Athlete opens feed -> /feed
- athlete_messages: Athlete opens messages -> /messages
- athlete_bookings: Athlete opens bookings -> /bookings
- athlete_settings: Athlete opens settings -> /settings
- athlete_progress: Athlete opens my progress -> /development/my-progress
- athlete_goals: Athlete opens goals -> /goals
- athlete_skills: Athlete opens skills -> /skills
- athlete_badges: Athlete opens achievements -> /badges
- athlete_analytics: Athlete opens analytics view -> /analytics/user1
- athlete_rate: Athlete opens rate coach -> /rate-coach
- athlete_discover_sessions: Athlete opens discover sessions -> /discover-sessions
- athlete_favourites: Athlete opens favourites -> /favourites
- athlete_find_coach: Athlete opens find coach -> /book-coach
- athlete_chat_list: Athlete opens chat list -> /chat/index

## Dead File Candidates

### Tier 1 (Highest confidence): `unreferenced`

- components/analytics/progress-chart.tsx
- components/analytics/session-timeline.tsx
- components/athlete/athletes-stats-bar.tsx
- components/badges/quick-recognition-modal.tsx
- components/badges/recognition-detail-card.tsx
- components/club/welcome-flow.tsx
- components/coach/adjust-day-modal.tsx
- components/coach/blocked-dates-calendar.tsx
- components/coach/blocked-dates-sections.tsx
- components/coach/cancellation-policy-cards.tsx
- components/coach/review-response.tsx
- components/coach/scheduling-option-picker.tsx
- components/coach/scheduling-rules-summary.tsx
- components/coach/smart-slots.tsx
- components/coach/travel-radius-picker.tsx
- components/event/RSVPButton.tsx
- components/family/children-hub-sections.tsx
- components/family/children-quick-actions.tsx
- components/primitives/selection-tile.tsx
- components/profile/edit-children-section.tsx
- components/progress/cosmetic-selector.tsx
- components/progress/family-highlights.tsx
- components/progress/homework-card.tsx
- components/progress/progress-badges-tab.tsx
- components/progress/progress-goals-tab.tsx
- components/progress/progress-level-banner.tsx
- components/progress/squad-leaderboard.tsx
- components/squad/squad-preview-step.tsx

### Tier 2 (Verify before removal): `not_reachable_from_app`

- components/analytics/progress-chart-sections.tsx (importers=1)
- components/analytics/session-timeline-sections.tsx (importers=1)
- components/auth/signup-type-selector-sections.tsx (importers=1)
- components/bookings/create-session-date-picker.tsx (importers=1)
- components/bookings/create-session-extras.tsx (importers=1)
- components/bookings/create-session-type-selector.tsx (importers=1)
- components/bookings/CreateSessionForm.tsx (importers=2)
- components/club/bulk-message-compose.tsx (importers=1)
- components/club/bulk-message-sent.tsx (importers=1)
- components/club/bulk-message.tsx (importers=2)
- components/club/group-chat-sections.tsx (importers=1)
- components/club/group-chat.tsx (importers=1)
- components/club/welcome-flow-sections.tsx (importers=1)
- components/coach/adjust-day-modal-sections.tsx (importers=1)
- components/coach/review-response-sections.tsx (importers=1)
- components/coach/slot-picker-sections.tsx (importers=1)
- components/coach/slot-picker.tsx (importers=1)
- components/coach/smart-slots-cards.tsx (importers=1)
- components/coach/smart-slots-heatmap.tsx (importers=1)
- components/coach/travel-radius-picker-sections.tsx (importers=1)
- components/development/goal-editor-sections.tsx (importers=1)
- components/development/progress-report-sections.tsx (importers=1)
- components/development/progress-timeline-sections.tsx (importers=1)
- components/development/session-journal-sections.tsx (importers=1)
- components/development/session-journal.tsx (importers=2)
- components/development/session-recap-card-sections.tsx (importers=1)
- components/development/skill-radar-chart-sections.tsx (importers=1)
- components/development/skill-radar-info-sections.tsx (importers=1)
- components/development/skill-radar-sections.tsx (importers=1)
- components/development/skill-radar.tsx (importers=2)
- components/event/RSVPButton-sections.tsx (importers=1)
- components/invite/chip-selector.tsx (importers=3)
- components/invite/create-confirm-summary.tsx (importers=2)
- components/invite/sent-invites-banner.tsx (importers=2)
- components/messaging/attachment-preview.tsx (importers=1)
- components/messaging/message-composer-sections.tsx (importers=1)
- components/parent/onboarding-checklist-sections.tsx (importers=1)
- components/safety/emergency-banner-sections.tsx (importers=1)
- components/safety/medical-card-sections.tsx (importers=1)
- components/safety/report-flow-sections.tsx (importers=1)
- components/ui/filters/FilterChip.tsx (importers=3)
- components/video/annotation-badge-sections.tsx (importers=1)

### Tier 3 (Check barrel exports): `barrel_only_not_reachable`

- components/auth/SignupTypeSelector.tsx (importers=1)
- components/bookings/CoachTabNavigation.tsx (importers=1)
- components/bookings/QuickActions.tsx (importers=1)
- components/club/EventsPanel.tsx (importers=1)
- components/community/GroupList.tsx (importers=1)
- components/compare/CompareBar.tsx (importers=1)
- components/compare/CompareButton.tsx (importers=1)
- components/consent/ConsentBadge.tsx (importers=1)
- components/development/goal-editor.tsx (importers=1)
- components/development/progress-report.tsx (importers=1)
- components/development/progress-timeline.tsx (importers=1)
- components/development/session-recap-card.tsx (importers=1)
- components/favourites/FavouritesList.tsx (importers=1)
- components/forms/FormButton.tsx (importers=1)
- components/forms/FormInput.tsx (importers=1)
- components/invite/create-athlete-step.tsx (importers=1)
- components/invite/create-club-step.tsx (importers=1)
- components/invite/create-confirm-step.tsx (importers=1)
- components/invite/create-details-step.tsx (importers=1)
- components/invite/create-existing-step.tsx (importers=1)
- components/invite/create-mode-step.tsx (importers=1)
- components/invite/create-slots-step.tsx (importers=1)
- components/invite/create-type-step.tsx (importers=1)
- components/invite/group-confirm-step.tsx (importers=1)
- components/invite/group-preview-step.tsx (importers=1)
- components/invite/group-session-details-step.tsx (importers=1)
- components/invite/group-target-step.tsx (importers=1)
- components/invite/squad-confirm-step.tsx (importers=1)
- components/invite/squad-details-step.tsx (importers=1)
- components/invite/squad-members-step.tsx (importers=1)
- components/invite/squad-result-step.tsx (importers=1)
- components/invite/squad-select-step.tsx (importers=1)
- components/invite/time-slot-form.tsx (importers=1)
- components/invite/wizard-footer.tsx (importers=1)
- components/invite/wizard-header.tsx (importers=1)
- components/invite/wizard-nav-buttons.tsx (importers=1)
- components/invite/wizard-step-indicator.tsx (importers=1)
- components/messaging/attachment-picker.tsx (importers=1)
- components/messaging/message-composer.tsx (importers=1)
- components/messaging/thread-summary.tsx (importers=1)
- components/parent/kids-screen.tsx (importers=1)
- components/parent/onboarding-checklist.tsx (importers=1)
- components/payment/card-form.tsx (importers=1)
- components/payment/card-list-item.tsx (importers=1)
- components/profile/achievement-badge.tsx (importers=1)
- components/review/review-card.tsx (importers=1)
- components/roster/athlete-notes.tsx (importers=1)
- components/safety/block-user.tsx (importers=1)
- components/safety/emergency-banner.tsx (importers=1)
- components/safety/medical-card.tsx (importers=1)
- components/safety/report-flow.tsx (importers=1)
- components/social/social-feed.tsx (importers=1)
- components/ui/collapsible.tsx (importers=1)
- components/ui/filters/FilterChipGroup.tsx (importers=1)
- components/ui/filters/FilterSection.tsx (importers=1)
- components/ui/filters/FilterSlider.tsx (importers=1)
- components/ui/filters/FilterToggle.tsx (importers=1)
- components/ui/filters/useFilter.tsx (importers=1)
- components/ui/message-status.tsx (importers=1)
- components/video/AnnotationBadge.tsx (importers=1)

## Route Mismatch Candidates

### App routes without a route-builder

- /availability/edit-template
- /family/[legacy]
- /manage/[legacy]
- /profile
- /session/[id]/rsvp
- /settings/notifications/preferences
- /settings/privacy-policy
- /settings/terms

### Route-builders without an app screen

- /academy/[id]
- /academy/[id]/branding
- /academy/[id]/invite
- /academy/[id]/settings
- /academy/[id]/staff
- /academy/[id]/staff/[staffId]
- /academy/create
- /academy/join
- /admin/promo-codes
- /admin/promo-codes/create
- /availability/scheduling-rules
- /bills
- /bills/create
- /bookings/[id]/negotiate
- /club/[clubId]/branding
- /confirm-booking
- /discover/filters
- /index
- /referrals
- /session-invites/squad
- /skills
- /skills/[category]
- /videos
- /videos/annotate/[id]
- /waitlist

