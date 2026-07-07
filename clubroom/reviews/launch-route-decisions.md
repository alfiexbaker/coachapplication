# Launch Route Decision Queue

Generated: 2026-07-04T00:32:35.135Z
Routes classified: 152
Routes queued: 0

## All Route Decisions

- keep: 152

## Queued Route Work



## Queue


## Full Decision Matrix

| Route file | Action | Priority | PDOS | Verdict | Risks | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `app/_layout.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/(modal)/add-child.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | sensitive-read-audit-check | child-profile-api-authority, child-trust-sensitive-api-authority, child-profile-write-api-authority |
| `app/(modal)/create-club-post.tsx` | keep | P3 | PDOS-02 | COMMUNICATION-REVIEW | - | post-api-authority |
| `app/(modal)/create-squad.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/(modal)/edit-child-profile.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | sensitive-read-audit-check | child-profile-api-authority, child-trust-sensitive-api-authority, child-profile-write-api-authority |
| `app/(modal)/edit-child-sen.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | sensitive-read-audit-check | child-profile-api-authority, child-trust-sensitive-api-authority, child-profile-write-api-authority |
| `app/(modal)/post-detail.tsx` | keep | P3 | PDOS-02 | COMMUNICATION-REVIEW | comment-control-check | post-api-authority, comment-api-authority |
| `app/(tabs)/_layout.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/(tabs)/admin/invite-codes.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/(tabs)/athletes.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | - | - |
| `app/(tabs)/availability.tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/(tabs)/bookings/_layout.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/(tabs)/bookings/[id].tsx` | keep | P3 | PDOS-06 | PAID-CORE | money-hard-wall-check | invoice-read-api-authority, invoice-reconciler-api-authority, invoice-manual-receipt-api-authority, booking-series-api-authority |
| `app/(tabs)/bookings/index.tsx` | keep | P3 | PDOS-06 | PAID-CORE | - | - |
| `app/(tabs)/bookings/report-problem.tsx` | keep | P3 | PDOS-06 | PAID-CORE | sensitive-read-audit-check | safeguarding-api-authority |
| `app/(tabs)/bookings/session-feedback.tsx` | keep | P3 | PDOS-06 | PAID-CORE | stale-placeholder-check | - |
| `app/(tabs)/children.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | - | - |
| `app/(tabs)/club-hub.tsx` | keep | P3 | PDOS-10 | OPS-CORE | comment-control-check | match-api-authority |
| `app/(tabs)/coach-profile.tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/(tabs)/earnings.tsx` | keep | P3 | PDOS-09 | COMMERCIAL-CORE | - | - |
| `app/(tabs)/edit-profile.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | child-profile-api-authority, child-trust-sensitive-api-authority, child-profile-write-api-authority |
| `app/(tabs)/feed.tsx` | keep | P3 | PDOS-02 | COMMUNICATION-REVIEW | comment-control-check | - |
| `app/(tabs)/index.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/(tabs)/messages.tsx` | keep | P3 | PDOS-02 | COMMUNICATION-REVIEW | - | - |
| `app/(tabs)/more.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/(tabs)/notifications.tsx` | keep | P3 | PDOS-02 | COMMUNICATION-REVIEW | - | - |
| `app/(tabs)/profile.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/(tabs)/roster.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | - | - |
| `app/(tabs)/schedule.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | scheduling-policy-api-authority |
| `app/(tabs)/settings.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/+html.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/availability/add-template.tsx` | keep | P3 | PDOS-03 | PROTECT | spinner-check | - |
| `app/availability/block-date.tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/availability/calendar.tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/availability/edit-template.tsx` | keep | P3 | PDOS-03 | PROTECT | spinner-check | - |
| `app/book-coach.tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/book/[coachId]/_layout.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/book/[coachId]/confirmation.tsx` | keep | P3 | PDOS-04 | PAID-CORE | spinner-check | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/book/[coachId]/details.tsx` | keep | P3 | PDOS-04 | PAID-CORE | - | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/book/[coachId]/index.tsx` | keep | P3 | PDOS-04 | PAID-CORE | - | - |
| `app/book/[coachId]/multi-week.tsx` | keep | P3 | PDOS-04 | PAID-CORE | - | - |
| `app/book/[coachId]/review.tsx` | keep | P3 | PDOS-04 | PAID-CORE | money-hard-wall-check | scheduling-policy-api-authority, child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/book/[coachId]/schedule.tsx` | keep | P3 | PDOS-04 | PAID-CORE | - | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/book/[coachId]/session-type.tsx` | keep | P3 | PDOS-04 | PAID-CORE | - | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/booking/[id]/cancel.tsx` | keep | P3 | PDOS-06 | PAID-CORE | money-hard-wall-check | booking-cancel-api-authority, scheduling-policy-api-authority |
| `app/bookings/subscribe.tsx` | keep | P3 | PDOS-06 | PAID-CORE | - | booking-series-api-authority |
| `app/chat/[threadId].tsx` | keep | P3 | PDOS-02 | COMMUNICATION-REVIEW | - | - |
| `app/chat/index.tsx` | keep | P3 | PDOS-02 | COMMUNICATION-REVIEW | - | - |
| `app/child/[id]/emergency.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | sensitive-read-audit-check | athlete-medical-api-authority |
| `app/child/[id]/medical.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | sensitive-read-audit-check | athlete-medical-api-authority |
| `app/club/[clubId]/_layout.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/club/[clubId]/calendar.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/club/[clubId]/dashboard.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/club/[clubId]/member/[memberId].tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/club/[id].tsx` | keep | P3 | PDOS-10 | OPS-CORE | comment-control-check | match-api-authority, post-api-authority |
| `app/club/[id]/activity/[activityId].tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/club/[id]/schedule.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/club/create.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/club/invite-members.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/club/my-clubs.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/club/settings.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/club/setup-complete.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/club/squad/[id].tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/club/squad/[id]/schedule.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/club/squad/create.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/club/training-schedule.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/coach-invites.tsx` | keep | P3 | PDOS-02 | COMMUNICATION-REVIEW | - | - |
| `app/coach/[coachId]/public.tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/coach/[id].tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/coach/invite.tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/community/[groupId].tsx` | keep | P3 | PDOS-02 | COMMUNICATION-REVIEW | - | community-chat-api-authority |
| `app/development/athlete/[athleteId]/_layout.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/development/athlete/[athleteId]/index.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | - | child-profile-api-authority, child-trust-sensitive-api-authority, child-profile-write-api-authority |
| `app/development/athlete/[athleteId]/special-needs.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | sensitive-read-audit-check | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/development/child-progress/[childId].tsx` | keep | P3 | PDOS-08 | DEVELOPMENT-CORE | sensitive-read-audit-check | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/development/media-gallery.tsx` | keep | P3 | PDOS-08 | DEVELOPMENT-CORE | - | - |
| `app/development/my-progress.tsx` | keep | P3 | PDOS-08 | DEVELOPMENT-CORE | - | - |
| `app/development/progress-loop.tsx` | keep | P3 | PDOS-08 | DEVELOPMENT-CORE | - | - |
| `app/development/session-history.tsx` | keep | P3 | PDOS-08 | DEVELOPMENT-CORE | - | - |
| `app/development/session/[sessionId].tsx` | keep | P3 | PDOS-08 | DEVELOPMENT-CORE | - | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/discover-sessions.tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/discover/map.tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/earnings.tsx` | keep | P3 | PDOS-09 | COMMERCIAL-CORE | money-hard-wall-check | invoice-read-api-authority, invoice-reconciler-api-authority, invoice-manual-receipt-api-authority, invoice-adjustment-api-authority |
| `app/events/[id].tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/events/[id]/attendees.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/events/[id]/rsvp.tsx` | keep | P3 | PDOS-10 | OPS-CORE | spinner-check | - |
| `app/events/create.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/events/index.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/family/[legacy].tsx` | keep | P3 | PDOS-06 | TRUST-CORE | - | - |
| `app/family/calendar.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | - | - |
| `app/family/index.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | - | - |
| `app/family/recurring.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | - | booking-series-api-authority |
| `app/family/sharing.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | - | - |
| `app/favourites/index.tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/group-sessions/[id].tsx` | keep | P3 | PDOS-04 | PAID-CORE | - | group-session-api-authority |
| `app/group-sessions/[id]/roster.tsx` | keep | P3 | PDOS-04 | PAID-CORE | - | group-session-api-authority, child-profile-api-authority, child-trust-sensitive-api-authority, athlete-injury-api-authority |
| `app/group-sessions/create.tsx` | keep | P3 | PDOS-04 | PAID-CORE | - | - |
| `app/group-sessions/index.tsx` | keep | P3 | PDOS-04 | PAID-CORE | - | - |
| `app/health/[id].tsx` | keep | P3 | PDOS-06 | TRUST-CORE | - | athlete-injury-api-authority |
| `app/health/index.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | - | athlete-injury-api-authority |
| `app/health/injuries.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | sensitive-read-audit-check | athlete-injury-api-authority |
| `app/health/log.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | - | child-profile-api-authority, child-trust-sensitive-api-authority, athlete-injury-api-authority |
| `app/invites.tsx` | keep | P3 | PDOS-02 | COMMUNICATION-REVIEW | - | - |
| `app/invoices/[id].tsx` | keep | P3 | PDOS-09 | COMMERCIAL-CORE | money-hard-wall-check | invoice-read-api-authority, invoice-reconciler-api-authority, invoice-manual-receipt-api-authority, invoice-payment-session-api-authority, invoice-adjustment-api-authority |
| `app/invoices/index.tsx` | keep | P3 | PDOS-09 | COMMERCIAL-CORE | - | invoice-read-api-authority |
| `app/manage/[legacy].tsx` | keep | P3 | PDOS-05 | OPS-CORE | - | - |
| `app/manage/bookings.tsx` | keep | P3 | PDOS-05 | OPS-CORE | - | club-work-assignment-api-authority |
| `app/manage/head-coach.tsx` | keep | P3 | PDOS-05 | OPS-CORE | - | - |
| `app/manage/index.tsx` | keep | P3 | PDOS-05 | OPS-CORE | - | - |
| `app/matches/[id].tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | match-api-authority |
| `app/matches/create.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | match-api-authority |
| `app/matches/index.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | match-api-authority |
| `app/profile/[userId].tsx` | keep | P3 | PDOS-02 | COMMUNICATION-REVIEW | comment-control-check | - |
| `app/review/[bookingId].tsx` | keep | P3 | PDOS-08 | DEVELOPMENT-CORE | - | - |
| `app/roster/[athleteId]/add-to-session.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | - | - |
| `app/roster/[athleteId]/emergency.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | sensitive-read-audit-check | athlete-medical-api-authority |
| `app/roster/[athleteId]/health.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | sensitive-read-audit-check | athlete-injury-api-authority |
| `app/roster/[athleteId]/index.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | sensitive-read-audit-check | athlete-medical-api-authority, child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/roster/[athleteId]/raise-concern.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | sensitive-read-audit-check | safeguarding-api-authority |
| `app/roster/consents.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | sensitive-read-audit-check | athlete-medical-api-authority |
| `app/roster/index.tsx` | keep | P3 | PDOS-06 | TRUST-CORE | - | - |
| `app/session-invites/[id].tsx` | keep | P3 | PDOS-04 | PAID-CORE | - | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/session-invites/create.tsx` | keep | P3 | PDOS-04 | PAID-CORE | - | - |
| `app/session-invites/group.tsx` | keep | P3 | PDOS-04 | PAID-CORE | - | - |
| `app/session-invites/index.tsx` | keep | P3 | PDOS-04 | PAID-CORE | - | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/session-notes/[bookingId].tsx` | keep | P3 | PDOS-07 | OPS-CORE | - | - |
| `app/session/[id]/complete.tsx` | keep | P3 | PDOS-07 | OPS-CORE | - | group-session-api-authority, child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/session/[id]/rsvp.tsx` | keep | P3 | PDOS-07 | OPS-CORE | - | group-session-api-authority |
| `app/sessions/create.tsx` | keep | P3 | PDOS-04 | PAID-CORE | - | booking-series-api-authority, group-session-api-authority |
| `app/settings/_layout.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/settings/account.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/settings/blocked-users.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/settings/calendar-sync.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/settings/cancellation-policy.tsx` | keep | P3 | PDOS-01 | OPS-CORE | money-hard-wall-check | scheduling-policy-api-authority |
| `app/settings/coaching.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | scheduling-policy-api-authority |
| `app/settings/help.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/settings/index.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/settings/notifications/_layout.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/settings/notifications/index.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/settings/notifications/preferences.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/settings/privacy-policy.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/settings/privacy.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/settings/terms.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/settings/travel-radius.tsx` | keep | P3 | PDOS-01 | OPS-CORE | - | - |
| `app/squads/[id]/invite.tsx` | keep | P3 | PDOS-10 | OPS-CORE | - | - |
| `app/verification/background.tsx` | keep | P3 | PDOS-03 | PROTECT | stale-placeholder-check | - |
| `app/verification/credentials.tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/verification/id.tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/verification/index.tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/verification/insurance.tsx` | keep | P3 | PDOS-03 | PROTECT | - | - |
| `app/videos/[id].tsx` | keep | P3 | PDOS-08 | DEVELOPMENT-CORE | - | - |
| `app/videos/upload.tsx` | keep | P3 | PDOS-08 | DEVELOPMENT-CORE | - | - |
