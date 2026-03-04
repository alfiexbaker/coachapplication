# Endpoint Priority Plan (Seeded Entities)

This plan sequences the first REST endpoint implementation using seeded entity coverage from:
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/marketplace/entity-endpoint-map.csv`

Execution status (as of `2026-03-03`):
- Endpoint orders `1-27` are implemented in `apps/api`.
- Deferred internal-only entities remain intentionally unexposed (`mediaObjects`, `featureFlags`, `featureFlagOverrides`, `outboxEvents`).

Legend:
- `P0`: required to make pre-REST app feel live for coach/parent/athlete core journeys.
- `P1`: next wave for revenue + development depth.
- `P2`: community + media depth.
- `P3`: trust/ops hardening.
- `DEFERRED`: internal-only tables (no public `/v1` endpoint in phase 1).

## Ordered endpoint rollout

1. `P0` `/v1/me` (6 entities): users, userProfiles, userRoleMemberships, userDevices, authSessions, idempotencyKeys
2. `P0` `/v1/families/:familyId` (6 entities): families, familyMemberships, athletes, guardianChildLinks, childSenTags, childConsents
3. `P0` `/v1/athletes/:athleteId/emergency-contacts` (1 entity): childEmergencyContacts
4. `P0` `/v1/athletes/:athleteId/medical` (1 entity): childMedicalRecords
5. `P0` `/v1/coaches/me/profile` (6 entities): coachProfiles, coachLocations, availabilityTemplates, availabilityOverrides, schedulingRules, cancellationPolicyRules
6. `P0` `/v1/coaches/me/offerings` (1 entity): coachingOfferings
7. `P0` `/v1/clubs` (4 entities): clubs, clubMemberships, squads, squadMemberships
8. `P0` `/v1/coaches/me/verifications/:type/documents` (2 entities): coachVerifications, verificationDocuments
9. `P0` `/v1/bookings` (6 entities): bookings, bookingParticipants, bookingObjectives, bookingStatusEvents, bookingChangeRequests, recurringSeries
10. `P0` `/v1/group-sessions` (3 entities): groupSessions, groupSessionRegistrations, waitlistEntries
11. `P0` `/v1/invites/:inviteId/respond` (2 entities): invites, inviteTargets
12. `P0` `/v1/events/:eventId/rsvp` (3 entities): clubEvents, eventRsvps, attendanceRecords
13. `P1` `/v1/invoices/:invoiceId` (6 entities): invoices, invoiceLineItems, invoiceEvents, reconcilerEntries, paymentInstructionTemplates, paymentReminders
14. `P1` `/v1/athletes/:athleteId/progress` (4 entities): sessionNotes, sessionFeedback, skillDefinitions, athleteSkillAssessments
15. `P1` `/v1/athletes/:athleteId/goals` (2 entities): goals, goalMilestones
16. `P1` `/v1/athletes/:athleteId/badges` (2 entities): badgeDefinitions, athleteBadges
17. `P1` `/v1/drills` (3 entities): drills, drillAssignments, assignmentSubmissions
18. `P2` `/v1/uploads/init` (2 entities): uploadSessions, malwareScanResults
19. `P2` `/v1/videos/:videoId` (2 entities): videos, videoAnnotations
20. `P2` `/v1/community-groups` (2 entities): communityGroups, communityGroupMemberships
21. `P2` `/v1/posts` (3 entities): posts, postComments, postReactions
22. `P2` `/v1/message-threads` (4 entities): messageThreads, messageParticipants, messages, messageReceipts
23. `P2` `/v1/me/notifications` (4 entities): notifications, notificationPreferences, mutedSources, quietHours
24. `P3` `/v1/access-grants` (6 entities): accessGrants, accessGrantScopes, auditEvents, securityEvents, retentionPolicies, legalHolds
25. `P3` `/v1/safeguarding/incidents` (2 entities): safeguardingIncidents, safeguardingIncidentActions
26. `P3` `/v1/admin/retention-runs` (1 entity): retentionRuns
27. `P3` `/v1/me/data-deletion-requests` (1 entity): dataDeletionRequests
28. `DEFERRED` internal-only (4 entities): mediaObjects, featureFlags, featureFlagOverrides, outboxEvents

## Suggested implementation checkpoints

1. Completed: endpoints `1-12` + role smoke baseline.
2. Completed: endpoints `13-17` + invoice/progress/drills coverage.
3. Completed: endpoints `18-23` + community/media regression coverage.
4. Completed: endpoints `24-27` + trust/ops governance coverage.
