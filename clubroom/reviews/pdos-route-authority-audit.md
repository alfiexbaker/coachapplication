# PDOS Route Authority Audit

Generated: 2026-07-03T22:04:20.126Z
Routes: 152
Needs decision: 0
Needs implementation: 0

## Summary By Sprint

- PDOS-01: 27
- PDOS-02: 11
- PDOS-03: 18
- PDOS-04: 16
- PDOS-05: 4
- PDOS-06: 32
- PDOS-07: 3
- PDOS-08: 9
- PDOS-09: 4
- PDOS-10: 28

## Summary By Verdict

- COMMERCIAL-CORE: 4
- COMMUNICATION-REVIEW: 11
- DEVELOPMENT-CORE: 9
- OPS-CORE: 62
- PAID-CORE: 22
- PROTECT: 18
- TRUST-CORE: 26

## Decision Queue

- None.

## Implementation Risk Queue

- None.

## Full Route Matrix

| Route file | PDOS | Verdict | Loading | Job | Risks | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `app/(modal)/add-child.tsx` | PDOS-06 | TRUST-CORE | submit-only | child profile, medical, emergency, SEN, and readiness context | sensitive-read-audit-check | child-profile-api-authority, child-trust-sensitive-api-authority, child-profile-write-api-authority |
| `app/(modal)/create-club-post.tsx` | PDOS-02 | COMMUNICATION-REVIEW | submit-only | staff-led communication, coach homepage, comments, or operational messaging | - | post-api-authority |
| `app/(modal)/create-squad.tsx` | PDOS-10 | OPS-CORE | submit-only | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/(modal)/edit-child-profile.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child profile, medical, emergency, SEN, and readiness context | sensitive-read-audit-check | child-profile-api-authority, child-trust-sensitive-api-authority, child-profile-write-api-authority |
| `app/(modal)/edit-child-sen.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child profile, medical, emergency, SEN, and readiness context | sensitive-read-audit-check | child-profile-api-authority, child-trust-sensitive-api-authority, child-profile-write-api-authority |
| `app/(modal)/post-detail.tsx` | PDOS-02 | COMMUNICATION-REVIEW | section-skeleton | staff-led communication, coach homepage, comments, or operational messaging | comment-control-check | post-api-authority, comment-api-authority |
| `app/(tabs)/_layout.tsx` | PDOS-01 | OPS-CORE | static | app shell, providers, routing, and account/session frame | - | - |
| `app/(tabs)/admin/invite-codes.tsx` | PDOS-10 | OPS-CORE | warm-first | club invite-code operations and access control | - | - |
| `app/(tabs)/athletes.tsx` | PDOS-06 | TRUST-CORE | warm-first | athlete roster and trust-context entry | - | - |
| `app/(tabs)/availability.tsx` | PDOS-03 | PROTECT | section-skeleton | coach availability and bookable storefront readiness entry | - | - |
| `app/(tabs)/bookings/[id].tsx` | PDOS-06 | PAID-CORE | section-skeleton | booking lifecycle, readiness, cancellation, receipt, and session state | money-hard-wall-check | invoice-read-api-authority, invoice-reconciler-api-authority, invoice-manual-receipt-api-authority, booking-series-api-authority |
| `app/(tabs)/bookings/_layout.tsx` | PDOS-01 | OPS-CORE | static | app shell, providers, routing, and account/session frame | - | - |
| `app/(tabs)/bookings/index.tsx` | PDOS-06 | PAID-CORE | warm-first | booking lifecycle, readiness, cancellation, receipt, and session state | - | - |
| `app/(tabs)/bookings/report-problem.tsx` | PDOS-06 | PAID-CORE | section-skeleton | booking lifecycle, readiness, cancellation, receipt, and session state | sensitive-read-audit-check | safeguarding-api-authority |
| `app/(tabs)/bookings/session-feedback.tsx` | PDOS-06 | PAID-CORE | section-skeleton | booking lifecycle, readiness, cancellation, receipt, and session state | stale-placeholder-check | - |
| `app/(tabs)/children.tsx` | PDOS-06 | TRUST-CORE | warm-first | child readiness, roster, medical, consent, emergency, and trust context | - | - |
| `app/(tabs)/club-hub.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | comment-control-check | match-api-authority |
| `app/(tabs)/coach-profile.tsx` | PDOS-03 | PROTECT | warm-first | storefront, trust, follow, and booking entry | - | - |
| `app/(tabs)/earnings.tsx` | PDOS-09 | COMMERCIAL-CORE | section-skeleton | invoice, payment state, reconciliation, and earnings | - | - |
| `app/(tabs)/edit-profile.tsx` | PDOS-01 | OPS-CORE | section-skeleton | role home, identity, and profile management entry | - | child-profile-api-authority, child-trust-sensitive-api-authority, child-profile-write-api-authority |
| `app/(tabs)/feed.tsx` | PDOS-02 | COMMUNICATION-REVIEW | warm-first | staff-led communication, coach homepage, comments, or operational messaging | comment-control-check | - |
| `app/(tabs)/index.tsx` | PDOS-01 | OPS-CORE | warm-first | role home, identity, and profile management entry | - | - |
| `app/(tabs)/messages.tsx` | PDOS-02 | COMMUNICATION-REVIEW | warm-first | operational messaging and notification entry | - | - |
| `app/(tabs)/more.tsx` | PDOS-01 | OPS-CORE | static | secondary navigation to account, help, and operating settings | - | - |
| `app/(tabs)/notifications.tsx` | PDOS-02 | COMMUNICATION-REVIEW | warm-first | operational messaging and notification entry | - | - |
| `app/(tabs)/profile.tsx` | PDOS-01 | OPS-CORE | section-skeleton | role home, identity, and profile management entry | - | - |
| `app/(tabs)/roster.tsx` | PDOS-06 | TRUST-CORE | static | athlete roster and trust-context entry | - | - |
| `app/(tabs)/schedule.tsx` | PDOS-10 | OPS-CORE | warm-first | schedule and operational activity entry | - | scheduling-policy-api-authority |
| `app/(tabs)/settings.tsx` | PDOS-01 | OPS-CORE | static | account, communication, trust, and operating settings | - | - |
| `app/+html.tsx` | PDOS-01 | OPS-CORE | static | app shell, providers, routing, and account/session frame | - | - |
| `app/_layout.tsx` | PDOS-01 | OPS-CORE | static | app shell, providers, routing, and account/session frame | - | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/availability/add-template.tsx` | PDOS-03 | PROTECT | section-skeleton | coach availability management and bookable storefront readiness | spinner-check | - |
| `app/availability/block-date.tsx` | PDOS-03 | PROTECT | section-skeleton | coach availability blocking and bookable-slot protection | - | - |
| `app/availability/calendar.tsx` | PDOS-03 | PROTECT | section-skeleton | coach availability management and bookable storefront readiness | - | - |
| `app/availability/edit-template.tsx` | PDOS-03 | PROTECT | section-skeleton | coach availability management and bookable storefront readiness | spinner-check | - |
| `app/book-coach.tsx` | PDOS-03 | PROTECT | warm-first | storefront, trust, follow, and booking entry | - | - |
| `app/book/[coachId]/_layout.tsx` | PDOS-01 | OPS-CORE | static | app shell, providers, routing, and account/session frame | - | - |
| `app/book/[coachId]/confirmation.tsx` | PDOS-04 | PAID-CORE | section-skeleton | paid product selection, booking, registration, invite, or package setup | spinner-check | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/book/[coachId]/details.tsx` | PDOS-04 | PAID-CORE | section-skeleton | paid product selection, booking, registration, invite, or package setup | - | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/book/[coachId]/index.tsx` | PDOS-04 | PAID-CORE | section-skeleton | paid product selection, booking, registration, invite, or package setup | - | - |
| `app/book/[coachId]/multi-week.tsx` | PDOS-04 | PAID-CORE | section-skeleton | paid product selection, booking, registration, invite, or package setup | - | - |
| `app/book/[coachId]/review.tsx` | PDOS-04 | PAID-CORE | section-skeleton | paid product selection, booking, registration, invite, or package setup | money-hard-wall-check | scheduling-policy-api-authority, child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/book/[coachId]/schedule.tsx` | PDOS-04 | PAID-CORE | section-skeleton | paid product selection, booking, registration, invite, or package setup | - | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/book/[coachId]/session-type.tsx` | PDOS-04 | PAID-CORE | section-skeleton | paid product selection, booking, registration, invite, or package setup | - | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/booking/[id]/cancel.tsx` | PDOS-06 | PAID-CORE | section-skeleton | booking lifecycle, readiness, cancellation, receipt, and session state | money-hard-wall-check | booking-cancel-api-authority, scheduling-policy-api-authority |
| `app/bookings/subscribe.tsx` | PDOS-06 | PAID-CORE | section-skeleton | booking lifecycle, readiness, cancellation, receipt, and session state | - | booking-series-api-authority |
| `app/chat/[threadId].tsx` | PDOS-02 | COMMUNICATION-REVIEW | warm-first | operational communication, invite, and response entry | - | - |
| `app/chat/index.tsx` | PDOS-02 | COMMUNICATION-REVIEW | warm-first | operational messaging and notification entry | - | - |
| `app/child/[id]/emergency.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child profile, medical, emergency, SEN, and readiness context | sensitive-read-audit-check | athlete-medical-api-authority |
| `app/child/[id]/medical.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child profile, medical, emergency, SEN, and readiness context | sensitive-read-audit-check | athlete-medical-api-authority |
| `app/club/[clubId]/_layout.tsx` | PDOS-01 | OPS-CORE | static | app shell, providers, routing, and account/session frame | - | - |
| `app/club/[clubId]/calendar.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/club/[clubId]/dashboard.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/club/[clubId]/member/[memberId].tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/club/[id].tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | comment-control-check | match-api-authority, post-api-authority |
| `app/club/[id]/activity/[activityId].tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/club/[id]/schedule.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/club/create.tsx` | PDOS-10 | OPS-CORE | submit-only | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/club/invite-members.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/club/my-clubs.tsx` | PDOS-10 | OPS-CORE | warm-first | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/club/settings.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/club/setup-complete.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/club/squad/[id].tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/club/squad/[id]/schedule.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/club/squad/create.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/club/training-schedule.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/coach-invites.tsx` | PDOS-02 | COMMUNICATION-REVIEW | warm-first | operational communication, invite, and response entry | - | - |
| `app/coach/[coachId]/public.tsx` | PDOS-03 | PROTECT | section-skeleton | storefront, trust, follow, and booking entry | - | - |
| `app/coach/[id].tsx` | PDOS-03 | PROTECT | section-skeleton | storefront, trust, follow, and booking entry | - | - |
| `app/coach/invite.tsx` | PDOS-03 | PROTECT | static | storefront, trust, follow, and booking entry | - | - |
| `app/community/[groupId].tsx` | PDOS-02 | COMMUNICATION-REVIEW | section-skeleton | staff-led communication, coach homepage, comments, or operational messaging | - | community-chat-api-authority |
| `app/development/athlete/[athleteId]/_layout.tsx` | PDOS-01 | OPS-CORE | static | app shell, providers, routing, and account/session frame | - | - |
| `app/development/athlete/[athleteId]/index.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child readiness, roster, medical, consent, emergency, and trust context | - | child-profile-api-authority, child-trust-sensitive-api-authority, child-profile-write-api-authority |
| `app/development/athlete/[athleteId]/special-needs.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child readiness, roster, medical, consent, emergency, and trust context | sensitive-read-audit-check | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/development/child-progress/[childId].tsx` | PDOS-08 | DEVELOPMENT-CORE | section-skeleton | development proof, video, review, rebook, and next work | sensitive-read-audit-check | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/development/media-gallery.tsx` | PDOS-08 | DEVELOPMENT-CORE | section-skeleton | development proof, video, review, rebook, and next work | - | - |
| `app/development/my-progress.tsx` | PDOS-08 | DEVELOPMENT-CORE | section-skeleton | development proof, video, review, rebook, and next work | - | - |
| `app/development/progress-loop.tsx` | PDOS-08 | DEVELOPMENT-CORE | section-skeleton | development proof, video, review, rebook, and next work | - | - |
| `app/development/session-history.tsx` | PDOS-08 | DEVELOPMENT-CORE | section-skeleton | development proof, video, review, rebook, and next work | - | - |
| `app/development/session/[sessionId].tsx` | PDOS-08 | DEVELOPMENT-CORE | section-skeleton | development proof, video, review, rebook, and next work | - | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/discover-sessions.tsx` | PDOS-03 | PROTECT | warm-first | storefront, trust, follow, and booking entry | - | - |
| `app/discover/map.tsx` | PDOS-03 | PROTECT | section-skeleton | storefront, trust, follow, and booking entry | - | - |
| `app/earnings.tsx` | PDOS-09 | COMMERCIAL-CORE | section-skeleton | invoice, payment state, reconciliation, and earnings | money-hard-wall-check | invoice-read-api-authority, invoice-reconciler-api-authority, invoice-manual-receipt-api-authority, invoice-adjustment-api-authority |
| `app/events/[id].tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/events/[id]/attendees.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/events/[id]/rsvp.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | spinner-check | - |
| `app/events/create.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/events/index.tsx` | PDOS-10 | OPS-CORE | warm-first | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/family/[legacy].tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child readiness, roster, medical, consent, emergency, and trust context | - | - |
| `app/family/calendar.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child readiness, roster, medical, consent, emergency, and trust context | - | - |
| `app/family/index.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child readiness, roster, medical, consent, emergency, and trust context | - | - |
| `app/family/recurring.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child readiness, roster, medical, consent, emergency, and trust context | - | booking-series-api-authority |
| `app/family/sharing.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child readiness, roster, medical, consent, emergency, and trust context | - | - |
| `app/favourites/index.tsx` | PDOS-03 | PROTECT | warm-first | storefront, trust, follow, and booking entry | - | - |
| `app/group-sessions/[id].tsx` | PDOS-04 | PAID-CORE | section-skeleton | paid product selection, booking, registration, invite, or package setup | - | group-session-api-authority |
| `app/group-sessions/[id]/roster.tsx` | PDOS-04 | PAID-CORE | section-skeleton | paid product selection, booking, registration, invite, or package setup | - | group-session-api-authority, child-profile-api-authority, child-trust-sensitive-api-authority, athlete-injury-api-authority |
| `app/group-sessions/create.tsx` | PDOS-04 | PAID-CORE | section-skeleton | paid product selection, booking, registration, invite, or package setup | - | - |
| `app/group-sessions/index.tsx` | PDOS-04 | PAID-CORE | warm-first | paid product selection, booking, registration, invite, or package setup | - | - |
| `app/health/[id].tsx` | PDOS-06 | TRUST-CORE | section-skeleton | health, injury, and readiness context | - | athlete-injury-api-authority |
| `app/health/index.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | health, injury, and readiness context | - | athlete-injury-api-authority |
| `app/health/injuries.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child profile, medical, emergency, SEN, and readiness context | sensitive-read-audit-check | athlete-injury-api-authority |
| `app/health/log.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | health, injury, and readiness context | - | child-profile-api-authority, child-trust-sensitive-api-authority, athlete-injury-api-authority |
| `app/invites.tsx` | PDOS-02 | COMMUNICATION-REVIEW | warm-first | operational communication, invite, and response entry | - | - |
| `app/invoices/[id].tsx` | PDOS-09 | COMMERCIAL-CORE | section-skeleton | invoice, payment state, reconciliation, and earnings | money-hard-wall-check | invoice-read-api-authority, invoice-reconciler-api-authority, invoice-manual-receipt-api-authority, invoice-payment-session-api-authority, invoice-adjustment-api-authority |
| `app/invoices/index.tsx` | PDOS-09 | COMMERCIAL-CORE | warm-first | invoice, payment state, reconciliation, and earnings | - | invoice-read-api-authority |
| `app/manage/[legacy].tsx` | PDOS-05 | OPS-CORE | static | staff authority, assignment, and operations control | - | - |
| `app/manage/bookings.tsx` | PDOS-05 | OPS-CORE | section-skeleton | staff authority, assignment, and operations control | - | club-work-assignment-api-authority |
| `app/manage/head-coach.tsx` | PDOS-05 | OPS-CORE | section-skeleton | staff authority, assignment, and operations control | - | - |
| `app/manage/index.tsx` | PDOS-05 | OPS-CORE | section-skeleton | staff authority, assignment, and operations control | - | - |
| `app/matches/[id].tsx` | PDOS-10 | OPS-CORE | section-skeleton | club and selected-squad fixture schedule context | - | match-api-authority |
| `app/matches/create.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club and selected-squad fixture schedule context | - | match-api-authority |
| `app/matches/index.tsx` | PDOS-10 | OPS-CORE | warm-first | club and selected-squad fixture schedule context | - | match-api-authority |
| `app/profile/[userId].tsx` | PDOS-02 | COMMUNICATION-REVIEW | section-skeleton | staff-led communication, coach homepage, comments, or operational messaging | comment-control-check | - |
| `app/review/[bookingId].tsx` | PDOS-08 | DEVELOPMENT-CORE | section-skeleton | development proof, video, review, rebook, and next work | - | - |
| `app/roster/[athleteId]/add-to-session.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child readiness, roster, medical, consent, emergency, and trust context | - | - |
| `app/roster/[athleteId]/emergency.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child readiness, roster, medical, consent, emergency, and trust context | sensitive-read-audit-check | athlete-medical-api-authority |
| `app/roster/[athleteId]/health.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child readiness, roster, medical, consent, emergency, and trust context | sensitive-read-audit-check | athlete-injury-api-authority |
| `app/roster/[athleteId]/index.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child readiness, roster, medical, consent, emergency, and trust context | sensitive-read-audit-check | athlete-medical-api-authority, child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/roster/[athleteId]/raise-concern.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child readiness, roster, medical, consent, emergency, and trust context | sensitive-read-audit-check | safeguarding-api-authority |
| `app/roster/consents.tsx` | PDOS-06 | TRUST-CORE | section-skeleton | child readiness, roster, medical, consent, emergency, and trust context | sensitive-read-audit-check | athlete-medical-api-authority |
| `app/roster/index.tsx` | PDOS-06 | TRUST-CORE | warm-first | child readiness, roster, medical, consent, emergency, and trust context | - | - |
| `app/session-invites/[id].tsx` | PDOS-04 | PAID-CORE | section-skeleton | paid product selection, booking, registration, invite, or package setup | - | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/session-invites/create.tsx` | PDOS-04 | PAID-CORE | section-skeleton | paid product selection, booking, registration, invite, or package setup | - | - |
| `app/session-invites/group.tsx` | PDOS-04 | PAID-CORE | section-skeleton | paid product selection, booking, registration, invite, or package setup | - | - |
| `app/session-invites/index.tsx` | PDOS-04 | PAID-CORE | warm-first | paid product selection, booking, registration, invite, or package setup | - | child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/session-notes/[bookingId].tsx` | PDOS-07 | OPS-CORE | section-skeleton | delivery, attendance, completion, and feedback entry | - | - |
| `app/session/[id]/complete.tsx` | PDOS-07 | OPS-CORE | section-skeleton | delivery, attendance, completion, and feedback entry | - | group-session-api-authority, child-profile-api-authority, child-trust-sensitive-api-authority |
| `app/session/[id]/rsvp.tsx` | PDOS-07 | OPS-CORE | section-skeleton | delivery, attendance, completion, and feedback entry | - | group-session-api-authority |
| `app/sessions/create.tsx` | PDOS-04 | PAID-CORE | submit-only | paid product selection, booking, registration, invite, or package setup | - | booking-series-api-authority, group-session-api-authority |
| `app/settings/_layout.tsx` | PDOS-01 | OPS-CORE | static | app shell, providers, routing, and account/session frame | - | - |
| `app/settings/account.tsx` | PDOS-01 | OPS-CORE | static | account, communication, trust, and operating settings | - | - |
| `app/settings/blocked-users.tsx` | PDOS-01 | OPS-CORE | section-skeleton | account, communication, trust, and operating settings | - | - |
| `app/settings/calendar-sync.tsx` | PDOS-01 | OPS-CORE | section-skeleton | account, communication, trust, and operating settings | - | - |
| `app/settings/cancellation-policy.tsx` | PDOS-01 | OPS-CORE | section-skeleton | account, communication, trust, and operating settings | money-hard-wall-check | scheduling-policy-api-authority |
| `app/settings/coaching.tsx` | PDOS-01 | OPS-CORE | section-skeleton | account, communication, trust, and operating settings | - | scheduling-policy-api-authority |
| `app/settings/help.tsx` | PDOS-01 | OPS-CORE | static | account, communication, trust, and operating settings | - | - |
| `app/settings/index.tsx` | PDOS-01 | OPS-CORE | static | account, communication, trust, and operating settings | - | - |
| `app/settings/notifications/_layout.tsx` | PDOS-01 | OPS-CORE | static | app shell, providers, routing, and account/session frame | - | - |
| `app/settings/notifications/index.tsx` | PDOS-01 | OPS-CORE | static | account, communication, trust, and operating settings | - | - |
| `app/settings/notifications/preferences.tsx` | PDOS-01 | OPS-CORE | section-skeleton | account, communication, trust, and operating settings | - | - |
| `app/settings/privacy-policy.tsx` | PDOS-01 | OPS-CORE | static | account, communication, trust, and operating settings | - | - |
| `app/settings/privacy.tsx` | PDOS-01 | OPS-CORE | section-skeleton | account, communication, trust, and operating settings | - | - |
| `app/settings/terms.tsx` | PDOS-01 | OPS-CORE | static | account, communication, trust, and operating settings | - | - |
| `app/settings/travel-radius.tsx` | PDOS-01 | OPS-CORE | section-skeleton | account, communication, trust, and operating settings | - | - |
| `app/squads/[id]/invite.tsx` | PDOS-10 | OPS-CORE | section-skeleton | club activity operations, schedule, squads, staff-led updates, and evidence | - | - |
| `app/verification/background.tsx` | PDOS-03 | PROTECT | section-skeleton | coach verification and trusted storefront readiness | stale-placeholder-check | - |
| `app/verification/credentials.tsx` | PDOS-03 | PROTECT | section-skeleton | coach verification and trusted storefront readiness | - | - |
| `app/verification/id.tsx` | PDOS-03 | PROTECT | section-skeleton | coach verification and trusted storefront readiness | - | - |
| `app/verification/index.tsx` | PDOS-03 | PROTECT | section-skeleton | coach verification and trusted storefront readiness | - | - |
| `app/verification/insurance.tsx` | PDOS-03 | PROTECT | section-skeleton | coach verification and trusted storefront readiness | - | - |
| `app/videos/[id].tsx` | PDOS-08 | DEVELOPMENT-CORE | section-skeleton | development proof, video, review, rebook, and next work | - | - |
| `app/videos/upload.tsx` | PDOS-08 | DEVELOPMENT-CORE | section-skeleton | development proof, video, review, rebook, and next work | - | - |
