# Clubroom native iOS audit

| Field        | Value                                                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Date started | 2026-07-30                                                                                                                                      |
| Platform     | iOS                                                                                                                                             |
| Target       | Clubroom (Staging) through Expo Go                                                                                                              |
| Device       | iPhone 16 Pro simulator                                                                                                                         |
| Session      | `clubroom-ios`                                                                                                                                  |
| Scope        | Every reachable role, route, state, control, flow, API effect, database effect, Sentry signal, accessibility result, and cross-role consequence |

## Status

The audit is active. The evidence source of truth is
[`coverage.csv`](./coverage.csv). A row is only marked `passed` after the
described check has been executed and evidence recorded.

## Runtime preflight

- Fastify `/v1/health`: passed.
- Native staging bundle: loaded in Expo Go on an iPhone 16 Pro simulator.
- Native screenshots: available.
- Semantic interaction and accessibility tree: blocked until macOS developer-tool security permits the iOS runner to attach.
- Supabase MCP: configured but not exposed in the current task.
- Staging database: read-only connection passed. All 124 public tables have RLS enabled and no table grants were found for `anon` or `authenticated`.
- Sentry: MCP is not exposed. HTTPS verification now succeeds, but the bundled read-only issue query returns HTTP 403 because the current token lacks project issue-read permission.

## Issues

### UI-001 — sign-in screen looked generated and delayed the task

The native sign-in screen used a badge, oversized slogan, promotional subtitle,
repeated welcome copy, redundant field guidance, and an entrance animation before
the primary task.

Fixed in the current `fix(auth): simplify native sign-in experience` slice:

- Reduced the entry screen to the Clubroom wordmark and a direct sign-in card.
- Removed the decorative entrance animation and redundant copy.
- Added iOS credential metadata and explicit accessibility metadata.
- Retested visually in the running native app.

Evidence:

- Before: [`001-native-loaded.png`](./screenshots/001-native-loaded.png)
- After: [`003-login-after.png`](./screenshots/003-login-after.png)

Deterministic control and VoiceOver-tree retesting remains blocked until
`sudo DevToolsSecurity -enable` has been run on the host.

### API-001 — internal problem responses reached product UI

The shared client ignored the backend's RFC 7807 `detail` field. A normal 403
therefore rendered the entire JSON problem response, including its request ID,
followed by an enum code and a development debug block.

Fixed in `fix(api): keep problem details out of product UI`:

- The API boundary now prefers `message`, then `detail`, then `title`.
- Shared error screens no longer render codes or debug payloads.
- A regression test covers an RFC 7807 403.
- The affected club-settings browser flow was rerun against a fresh bundle.

Evidence:

- Before: [`004-club-settings-raw-error-before.png`](./screenshots/004-club-settings-raw-error-before.png)
- After: [`005-club-settings-safe-error-after.png`](./screenshots/005-club-settings-safe-error-after.png)

The separate manager-only request was tracked as `AUTHZ-001` and is fixed below.

### AUTHZ-001 — read-only settings requested manager data

A normal coach could open the read-only club-settings route, but the loader still
requested squads, members, and invite codes. The invite-code endpoint correctly
returned 403 and collapsed the whole screen into an error.

Fixed in `fix(club): skip manager data in read-only settings`:

- Non-managers load only the details and branding data the screen can show.
- Manager-only service failures still surface for managers.
- The source boundary test and the affected browser flow pass.

Evidence:

- Failed state: [`005-club-settings-safe-error-after.png`](./screenshots/005-club-settings-safe-error-after.png)
- Loaded read-only state: [`006-club-settings-readonly-loaded.png`](./screenshots/006-club-settings-readonly-loaded.png)

The loaded state exposed `UI-003`: editable fields and `Save Changes` were still
shown to a viewer who could not save.

### UI-003 — read-only settings showed edit controls

Fixed in `fix(club): align settings controls with role access`:

- Coaches now see plain club values with no edit or save controls.
- The permission explanation is one direct sentence.
- Club admins retain the three labelled fields and `Save changes`.
- Coach and club-admin paths were checked separately without submitting a write.

Evidence:

- Before: [`006-club-settings-readonly-loaded.png`](./screenshots/006-club-settings-readonly-loaded.png)
- Coach after: [`007-club-settings-readonly-controls-fixed.png`](./screenshots/007-club-settings-readonly-controls-fixed.png)
- Club admin after: [`008-club-settings-admin-controls-retained.png`](./screenshots/008-club-settings-admin-controls-retained.png)

### UI-002 — invite card nested buttons

The pressable invite card wrapped cancel, decline, accept, and remove buttons.
That produced invalid web controls and ambiguous accessibility semantics.

Fixed in `fix(invites): separate card and inline actions`:

- The card container is no longer a control.
- Its header is the explicit details action, with a chevron and accessibility label.
- Inline actions remain separate sibling controls.
- The source boundary test passes and the browser runner reports zero nested buttons.

Evidence:

- Before: [`009-session-invites-nested-before.png`](./screenshots/009-session-invites-nested-before.png)
- After: [`010-session-invites-controls-fixed.png`](./screenshots/010-session-invites-controls-fixed.png)

### FLOW-001 — coach home mixed athlete and user identities

Coach development sent an `ath_…` entity ID to `/v1/users/:id`, which accepts
user IDs. The page rendered, but every load produced a 404 and a denied profile
audit event.

Fixed in `f04d222e fix(coach): use athlete feedback identity`:

- Live feedback now supplies both the athlete entity ID and display name.
- Coach development builds its directory from that authoritative response.
- No athlete entity ID is sent to the user-profile endpoint.
- The source boundary test and original coach-home flow pass.

Evidence:

- Initial finding: [`browser-flow-initial-findings.md`](./browser-flow-initial-findings.md)
- Clean rerun: [`browser-flow-report.md`](./browser-flow-report.md)

### QA-001 — chat-list audit opened a thread route

The athlete browser flow used `/chat/index`. Expo Router treated `index` as a
dynamic thread ID, rendered the shared error state, and the runner still marked
the flow clean.

Fixed in `fix(audit): use public chat list route`:

- The flow now opens the public `/chat` alias and asserts the `/messages` destination.
- Happy-path flows now fail if the shared `Something went wrong` state is visible.
- All 13 athlete flows pass with the failure threshold set to medium.

Evidence:

- Before: [`013-athlete-chat-audit-route-before.png`](./screenshots/013-athlete-chat-audit-route-before.png)
- After: [`014-athlete-chat-audit-route-after.png`](./screenshots/014-athlete-chat-audit-route-after.png)

### UI-004 — athlete photo URL obscured the profile

Athlete progress rendered the `avatar` value as text. The seeded value was a
placeholder URL, so it collided with the athlete name. Rendering it as an image
then exposed a second defect: `cdn.clubroom.demo` does not resolve.

Fixed in `fix(ui): render safe athlete avatars`:

- Athlete progress now uses the shared accessible Avatar primitive.
- Known placeholder-host URLs fall back immediately to initials.
- The URL policy is shared by avatars, settings, and profile photo previews.
- Two URL-policy tests pass.
- All 13 athlete flows pass with zero failed, high, or medium findings.

Evidence:

- Before: [`015-athlete-progress-avatar-before.png`](./screenshots/015-athlete-progress-avatar-before.png)
- After: [`016-athlete-progress-avatar-after.png`](./screenshots/016-athlete-progress-avatar-after.png)

### UI-005 — booking dates wrapped vertically

The percent-width booking date cards left too little room for three-letter
weekday labels at phone width. Labels wrapped one character per line and the
14-day calendar consumed several screens.

Fixed in `fix(booking): make date choices legible`:

- Dates now use a compact horizontal strip with fixed-width controls.
- Weekdays are constrained to one line.
- Each date exposes its availability, disabled, and selected state to assistive
  technology.
- Typecheck and file lint pass.
- All 22 parent flows pass with zero failed, high, or medium findings.

Evidence:

- Before: [`017-booking-calendar-before.png`](./screenshots/017-booking-calendar-before.png)
- After: [`018-booking-calendar-after.png`](./screenshots/018-booking-calendar-after.png)

### UI-006 — Family screen explained its own architecture

The Family overview opened with an animated promotional card and copy about
“family work” leading to “not another summary dashboard.” That was internal
product rationale, not useful interface copy.

Fixed in `fix(family): simplify the family overview`:

- Removed the hero, entrance animations, redundant subtitle, and decorative CTA
  icon.
- Shortened every task label and description.
- Kept the sensitive-data boundary as a direct privacy statement.
- Typecheck, file lint, and React Doctor pass.
- All 12 parent-core flows pass with zero failed, high, or medium findings.

Evidence:

- Before: [`019-family-overview-before.png`](./screenshots/019-family-overview-before.png)
- After: [`020-family-overview-after.png`](./screenshots/020-family-overview-after.png)

### QA-002 — owner oversight was tested as a normal coach

The flow called `owner_head_coach` authenticated with the normal coach account.
It therefore exercised only the default-denied empty state while claiming the
owner path had passed.

Fixed in `fix(oversight): audit the authorised owner view`:

- The flow now uses the club-admin account and passes the seeded club context.
- The real oversight endpoint returns the authorised club-scoped projection.
- The normal coach remains excluded by the existing role boundary.

Evidence:

- Wrong role: [`021-oversight-wrong-role-before.png`](./screenshots/021-oversight-wrong-role-before.png)
- Authorised role: [`022-oversight-admin-before.png`](./screenshots/022-oversight-admin-before.png)

### UI-007 — oversight used internal scope language

The authorised screen then exposed copy such as “org-global,” “runtime surface,”
and “visible in product.” Its club context and metric cards were also needlessly
large and the metric grid did not hold a stable two-column layout.

Fixed in the same slice:

- Shortened the header and club context.
- Removed internal implementation language from empty, scope, standard, and task
  copy.
- Made the four overview metrics a stable two-by-two grid.
- Typecheck and file lint pass.
- Both club-admin flows pass with zero failed, high, or medium findings.

Evidence:

- Before: [`022-oversight-admin-before.png`](./screenshots/022-oversight-admin-before.png)
- After: [`023-oversight-admin-after.png`](./screenshots/023-oversight-admin-after.png)

## Browser flow baseline

The stricter role suite opens 71 selected flows: 34 coach, 22 parent, 13 athlete,
and two club-admin flows. The fixture detector first found 13 contaminated
screens. After the staging cleanup and state restoration below, a paced rerun
loaded all 71 with zero failed requests, high findings, or medium findings.

Manual screenshot review then caught a separate backend defect that automation
did not classify: coach home included 158 soft-deleted bookings in its completion
queue. `API-003` and the generic completion label tracked as `UI-009` are now
fixed. A paced rerun loaded all 71 routes and the 11-flow coach subset without a
failed request or automated high/medium finding.

That automated result is not the final visual baseline. A manual review of all
71 captures found separate layout, copy, staging-data, and cross-screen
consistency defects. Those remain open and are being recorded and fixed as
separate slices.

Evidence:

- Initial fixture contamination:
  [`024-fixture-leak-contact-sheet.png`](./screenshots/024-fixture-leak-contact-sheet.png)
- Restored medical state:
  [`027-child-medical-restored.png`](./screenshots/027-child-medical-restored.png)
- Soft-deleted booking leak:
  [`026-soft-deleted-bookings-visible-before.png`](./screenshots/026-soft-deleted-bookings-visible-before.png)

### QA-003 — staging smoke leaked product data

Fixed in the current staging-smoke lifecycle slice:

- The runner refuses non-staging and production-looking targets before startup.
- It retires only records carrying exact smoke markers before and after the run,
  including bookings, invoices, group sessions, invites, squads, matches,
  events, simulated payout methods, and their smoke withdrawals.
- It snapshots the seeded child's medical, emergency-contact, and consent state
  through the authenticated API and restores it through the same audited routes
  in `finally`.
- It preserves audit history.
- The guarded staging smoke passed 33/33 checks.
- Post-run database verification found zero active smoke groups, bookings,
  invites, squads, matches, events, payout methods, withdrawals, or emergency
  contacts.
- Authenticated readback confirmed the canonical medical, emergency-contact, and
  consent state.

The responsive cross-role rerun then reported 71/71 routes with zero high or
medium fixture findings at a 1.5-second navigation pace.

### API-003 — booking reads exposed soft-deleted rows

Fixed in the current booking-authority slice:

- DB and fixture-backed list reads exclude soft-deleted bookings.
- Detail reads return 404 for a soft-deleted booking, including to its former
  coach.
- Soft-deleted participant links neither grant visibility nor appear in response
  participants.
- Two focused repository tests and API typecheck pass.
- The real staging API now returns three awaiting-completion bookings, matching
  the three active past rows in the database; a retired booking returns 404.
- All 11 coach-core flows pass with zero high or medium automated findings.

Evidence:

- Before:
  [`026-soft-deleted-bookings-visible-before.png`](./screenshots/026-soft-deleted-bookings-visible-before.png)
- After:
  [`028-booking-soft-delete-filtered.png`](./screenshots/028-booking-soft-delete-filtered.png)

### UI-009 — completion queue used generic athlete labels

Fixed in `fix(coach): name completion tasks`:

- The development loader resolves active booking athlete IDs through the
  existing roster authority.
- Each task now leads with the athlete name and keeps service and date as
  secondary metadata.
- Generic `Athlete`, `Player`, `User`, and `Parent` placeholders are rejected.
- The source-boundary test, root typecheck, focused lint, 11 coach flows, and all
  71 automated role flows pass.

Evidence:

- Before:
  [`028-booking-soft-delete-filtered.png`](./screenshots/028-booking-soft-delete-filtered.png)
- After:
  [`029-completion-athlete-labels-fixed.png`](./screenshots/029-completion-athlete-labels-fixed.png)

### UI-010 — emergency contact email was clipped

Fixed in `fix(family): keep emergency contact details visible`:

- Removed the fixed indent that starved contact values of card width.
- Let phone and email values shrink inside their row instead of overflowing.
- Kept the full values selectable and used the existing metadata typography.
- The focused boundary test, root typecheck, focused lint, and all 12 parent-core
  flows pass.
- A 390 × 844 browser check confirms the complete email is visible on one line.

Evidence:

- Before:
  [`030-emergency-email-clipped-before.png`](./screenshots/030-emergency-email-clipped-before.png)
- After:
  [`031-emergency-email-visible-after.png`](./screenshots/031-emergency-email-visible-after.png)

### UI-011 — booking confirmation exposed implementation copy

Fixed in `fix(booking): simplify confirmation screen`:

- Removed the decorative calendar hero and all references to the “live booking
  API.”
- Replaced the payment paragraphs with direct ownership copy.
- Changed the post-create language from the false “Booking confirmed” state to
  “Booking sent” while coach confirmation is pending.
- Disabled confirmation until the coach, athlete, date, time, duration,
  location, price, and session type are resolved.
- Put the content in a real scroll view above the fixed action area.
- Eleven focused booking assertions, root typecheck, focused lint, and all 22
  parent flows pass.

Evidence:

- Before:
  [`032-booking-confirmation-before.png`](./screenshots/032-booking-confirmation-before.png)
- After:
  [`033-booking-confirmation-after.png`](./screenshots/033-booking-confirmation-after.png)

### UI-012 — settings wrapped identity and used internal copy

Fixed in `fix(settings): simplify role-safe account hub`:

- Moved the email onto its own compact line and kept the complete address
  visible for coach, parent, and athlete accounts.
- Reduced the placeholder avatar and removed the raw account-role footer.
- Replaced implementation and back-office wording with direct labels including
  “Email and password,” “Payments,” and “FAQs and contact.”
- The focused boundary test, root typecheck, focused lint, 30 shared core flows,
  and the final 19 parent/athlete flows pass.

Evidence:

- Before:
  [`034-settings-email-wrap-before.png`](./screenshots/034-settings-email-wrap-before.png)
- After:
  [`035-settings-hub-after.png`](./screenshots/035-settings-hub-after.png)

### UI-013 — athlete settings exposed a parent-only action

The athlete-only account was offered “Children / Add a child profile” because
the settings screen treated every non-coach user as a parent.

Fixed in the same settings slice:

- The shared child context now supplies the existing parent capability.
- The Children row renders only for a real parent/guardian context.
- Parent access remains; athlete access is removed.

Evidence:

- Before:
  [`036-athlete-children-action-before.png`](./screenshots/036-athlete-children-action-before.png)
- After:
  [`037-athlete-children-action-removed.png`](./screenshots/037-athlete-children-action-removed.png)

### UI-008 — child profile exposed raw backend fields

The child profile printed the API's ISO date and uppercase relationship enum
directly.

Fixed in `fix(family): format child profile fields`:

- The date of birth now uses the shared British date formatter.
- The relationship uses the existing child-form labels.
- The parent flow was rerun; the date and enum are readable. Its remaining
  fixture and timestamp findings come from the contaminated medical values
  tracked in `QA-003`.

Evidence: [`025-child-profile-fields-formatted.png`](./screenshots/025-child-profile-fields-formatted.png)

### API-002 — staging write smoke did not assert its target

The staging smoke runner loaded `.env.staging.local`, but existing process
variables took precedence. It did not prove that the resolved database target
was staging before starting write tests.

Fixed in `fix(api): guard staging smoke target`:

- The runner now requires a resolved staging environment and `DATABASE_URL`.
- Production environment hints and production-looking database URLs abort
  before the API or Prisma client is created.
- `NODE_ENV=production` remains supported because staging intentionally tests
  release runtime behavior.

This is responsive-browser evidence. It does not count as native iOS coverage.

### UI-016 — development feedback trusted a caller-controlled role

An athlete or linked parent could request `viewerRole=coach` from the session
feedback endpoints. The athlete relationship check passed correctly, but the
query then selected coach visibility and could expose coach-private notes.
Athletes and coaches also saw a primary-position edit control backed by a
guardian-only profile endpoint.

Fixed in `fix(security): derive development visibility from authority`:

- Both feedback list and detail routes derive effective visibility from the
  authenticated acting role; the query cannot grant more access.
- Audit metadata records both requested and effective roles.
- The development hook requests the signed-in role instead of always asking for
  `coach`.
- The auth context preserves the API account type, including a parent with no
  children yet.
- Only a parent/guardian sees the family-owned primary-position edit control.
- Focused API tests cover assigned coach, parent, athlete, and outsider results.
- Live staging reads proved forced coach requests were downgraded for athlete
  and parent, returned no private notes, and wrote the expected audit metadata.

Evidence:

- Parent controls:
  [`042-parent-development-authorized-controls.png`](./screenshots/042-parent-development-authorized-controls.png)
- Athlete read-only view:
  [`043-athlete-development-read-only.png`](./screenshots/043-athlete-development-read-only.png)
- Assigned-coach read-only profile controls:
  [`044-coach-development-read-only.png`](./screenshots/044-coach-development-read-only.png)

The shared responsive runtime passed for all three roles. Native role
interaction remains blocked by host developer-tool security and is not claimed
as passed.

### UI-017 — athlete needs screens contradicted their own data and permissions

The development detail invented a trend and medal tier from session count,
duplicated session facts, and shortened the last-session date to a day number.
The needs route then printed a photo URL over the athlete name, claimed nothing
was recorded above populated medical data, omitted medical conditions from its
count, and showed parents and athletes a coach-only authorization failure.

Fixed in `fix(development): simplify athlete needs details`:

- The progress hero now shows only completed-session count and the full
  last-session date. The real progression card remains the sole level model.
- Needs summaries count disabilities, support needs, allergies, medical
  conditions, medication, and parent notes.
- The shared avatar handles failed media without exposing a URL as copy.
- Medical conditions now render with allergies and medication.
- Parent and athlete renders do not instantiate the coach-observation hook.
- An assigned coach retains one labelled Add action; the duplicate empty-state
  action and verbose placeholder copy were removed.

Live staging verification:

- Parent and athlete produced zero coach-observation requests and displayed no
  coach-only section or authorization error.
- The assigned coach produced one GET, received HTTP 200, and the matching
  `coach_observation.read` audit event persisted as a sensitive successful read.
- All three responsive role flows displayed the complete stored medical
  summary with no console errors.

Evidence:

- Before:
  [`042-parent-development-authorized-controls.png`](./screenshots/042-parent-development-authorized-controls.png),
  [`046-parent-needs-coach-error-before.png`](./screenshots/046-parent-needs-coach-error-before.png)
- Parent after:
  [`047-parent-needs-clean-after.png`](./screenshots/047-parent-needs-clean-after.png),
  [`048-parent-progress-clean-after.png`](./screenshots/048-parent-progress-clean-after.png)
- Coach and athlete after:
  [`049-coach-needs-authorized-after.png`](./screenshots/049-coach-needs-authorized-after.png),
  [`050-athlete-needs-readonly-after.png`](./screenshots/050-athlete-needs-readonly-after.png)

This is responsive-browser evidence for shared React Native code. Native role
interaction remains blocked by host developer-tool security and is not claimed
as passed.

### UI-018 — internal QA walkthroughs occupied product role surfaces

Athlete home, coach development, admin users, and the club-owner dashboard
opened with internal walkthrough cards telling users which routes to check.
The athlete surface also repeated Find Coach in the same viewport and used the
generic subtitle “Your training journey”.

Fixed in `fix(ui): remove internal walkthroughs`:

- Deleted the walkthrough card, visibility hook, route builder, stale tests,
  and obsolete API-mode seen-state allowance.
- Removed all four role-surface integrations instead of renaming or hiding the
  feature.
- Kept the real product content and role-scoped actions as the first viewport.
- Kept one Find Coach action on athlete home and removed the duplicate.

Live staging verification:

- Athlete, coach, security admin, and club-admin owner accounts each reached
  their real product surface with no walkthrough copy.
- All four responsive flows completed with no console errors.
- No new request, database mutation, RLS decision, or audit event was introduced
  by this UI-only deletion.

Evidence:

- Before:
  [`051-athlete-home-walkthrough-before.png`](./screenshots/051-athlete-home-walkthrough-before.png)
- After:
  [`052-athlete-home-direct-after.png`](./screenshots/052-athlete-home-direct-after.png),
  [`053-coach-development-direct-after.png`](./screenshots/053-coach-development-direct-after.png),
  [`054-admin-users-direct-after.png`](./screenshots/054-admin-users-direct-after.png),
  [`055-owner-dashboard-direct-after.png`](./screenshots/055-owner-dashboard-direct-after.png)

The admin screenshot also exposed a separate data-correctness finding: its
summary counts are all zero despite a populated staging dataset. That is
tracked for the next slice rather than being obscured by this presentation
fix. This remains responsive-browser evidence for shared React Native code;
native role interaction is still blocked by host developer-tool security and
is not claimed as passed.

### UI-019 — admin Users showed false zeros and crossed the club-admin boundary

The API-mode Users tab counted `availableUsers`, an intentionally empty
auth-switcher array. A populated staging environment therefore rendered three
large zero cards. The same landing was selected for club admins even though a
club role does not grant platform-directory visibility.

Fixed in `fix(admin): load authoritative user summary`:

- Added `GET /v1/admin/users/summary` with a system-admin-only authorization
  boundary and sensitive success/deny audit events.
- Added seed, test-fixture, and Prisma repository paths that count only active,
  non-deleted users with active, non-revoked coach, athlete, or parent roles.
- Replaced the auth-switcher calculation with an API service and screen state
  hook covering loading, error, refresh, and success.
- Replaced the three oversized icon cards with one compact account summary.
- Stopped treating `club_admin` as the frontend system-admin flag and redirected
  its tab landing to the governed club list.

Live staging verification:

- Security admin received HTTP 200 and rendered 29 active accounts: 9 coaches,
  6 athletes, and 8 parents.
- A direct request using the club-admin token returned HTTP 403, while the
  product flow made no platform-summary request and landed on My Clubs.
- Direct database reads returned the same four counts.
- `admin.users.summary.read` persisted one `SUCCESS` event for
  `security_admin` and one `DENY` event for `club_admin`; both were marked as
  sensitive reads and matched their runtime request IDs.
- RLS was enabled for `User`, `UserRoleMembership`, and `AuditEvent`. Each had
  zero client policies, preserving default-deny access outside the backend
  authority.
- Both responsive flows completed with no console errors.

Evidence:

- Before:
  [`054-admin-users-direct-after.png`](./screenshots/054-admin-users-direct-after.png)
- System admin after:
  [`056-admin-user-summary-authoritative-after.png`](./screenshots/056-admin-user-summary-authoritative-after.png)
- Club admin after:
  [`057-club-admin-governed-home-after.png`](./screenshots/057-club-admin-governed-home-after.png)

The My Clubs screenshot exposes the next design finding: the oversized
join/create panel outranks the existing club the owner already manages. That
is tracked as a separate simplification slice. Sentry API verification remains
unavailable because no read-only `SENTRY_AUTH_TOKEN` is configured. Native
role interaction remains blocked by host developer-tool security and is not
claimed as passed.

### UI-020 — My Clubs put acquisition ahead of the club being managed

The club-admin landing opened with an oversized join/create marketing panel.
It pushed Riverside FC below the first viewport, duplicated the card action
with “Open” beside a chevron, repeated close intent as “× Close”, and limited
an input that explicitly accepts invite links to 24 characters.

Fixed in `fix(club): prioritize managed clubs`:

- Managed and followed clubs now render before secondary acquisition controls.
- The join/create card keeps only its two real intents. The avatar, generic
  coaching subtitle, permanent helper copy, divider, and oversized create
  treatment were deleted.
- Club cards use one press intent with a chevron; the redundant “Open” label is
  gone.
- The close action is icon-only with an explicit accessibility label.
- Invite links can use up to 512 characters. Blank, short, and valid-link
  states preserve their existing validation and do not submit implicitly.
- Disabled Join retains an explicit button role and disabled state for
  assistive technology.

Live staging verification:

- The club-admin account reached `/club/my-clubs`; Riverside FC and Northbridge
  United rendered before Join a club.
- `GET /v1/clubs` returned HTTP 200 with request ID
  `req_1b68f079-0a17-4344-9b59-3c8d3dafc820`.
- Blank and three-character codes kept Join disabled and the latter rendered
  “Code is too short”.
- A 49-character invite URL was preserved in full and enabled Join.
- The invite input, Join, Create club, and icon-only Close controls all had
  stable accessibility names. The initial live run exposed and the retest
  fixed the disabled Join button-role defect.
- No join or create mutation was executed. The browser reported zero console
  errors.

Evidence:

- Before:
  [`057-club-admin-governed-home-after.png`](./screenshots/057-club-admin-governed-home-after.png)
- Clubs first:
  [`058-club-admin-clubs-first-after.png`](./screenshots/058-club-admin-clubs-first-after.png)
- Invalid-code state:
  [`059-club-admin-join-validation-after.png`](./screenshots/059-club-admin-join-validation-after.png)

This is responsive-browser evidence for the shared React Native surface.
Native role interaction remains blocked by host developer-tool security and is
not claimed as passed. Sentry API verification remains unavailable because the
task has no read-only auth token.

### AUDIT-001 — responsive route evidence was not reconciled to the inventory

The executable inventory still marked all 143 route files pending even after a
71-flow cross-role run. That made already-proven reachability indistinguishable
from routes that have never been exercised.

Reconciled in `chore(audit): reconcile responsive route evidence`:

- Reran the current bundle for 34 coach, 22 parent, 13 athlete, and two
  club-admin flows.
- All 71 returned `status=ok` and `severity=none`; the runner found zero failed
  requests, runtime exceptions, nested buttons, horizontal overflow, or
  product-text findings.
- Mapped results only to route files that actually executed. Redirect wrappers
  and imported shared implementations receive evidence when both ran; similar
  but unexecuted filenames do not.
- Promoted 51 route rows to responsive reachability passed and left 92 pending.
- Recorded the limitations on every promoted row: exact endpoint request IDs,
  database effects, RLS decisions, audit events, Sentry, and native behavior
  are not inherited from a browser route-load pass.

Evidence:

- [`browser-flow-report.md`](./browser-flow-report.md)
- [`runtime/2026-07-31/report.merged.json`](./runtime/2026-07-31/report.merged.json)

This is a coverage correction, not a claim that the remaining audit is
complete.

### UI-021 — verification was open to the wrong roles and padded with fake process copy

Parent, athlete, and club-admin accounts could open all five coach verification
routes. Each screen then called the coach-status endpoint with the signed-in
user ID and rendered “Coach profile not found”. The authorised experience also
used trust-marketing copy, premium labels, fake review timelines, a dead DBS
process, duplicate actions, disabled-looking non-actions, and an invented
credential filename.

Fixed in `fix(verification): simplify coach evidence flows`:

- A shared route layout now permits coach accounts only and redirects every
  other role before verification content or data access. Athlete accounts
  return directly to My Progress instead of churning through the generic home.
- The five screens now use compact status, requirement, selection, and submit
  states. Promotional language, fake turnaround claims, decorative process
  steps, duplicate buttons, and unavailable-date placeholders were deleted.
- ID and credential choices expose radio roles and selected state. Static rows
  are no longer disabled pressables. Icon-only controls have explicit names.
- DBS evidence uses the same backend-authoritative verification-document path
  as ID and insurance. The live submission path checks the source response
  before upload; the audit replay itself selected no file and made no mutation.
- Credential labels use current England Football and UEFA names rather than
  stale Level 1/Level 2 terminology.
- The responsive runner now waits for login-page requests to settle before
  assigning diagnostics to flow one, preventing an aborted prior-page request
  from becoming a false finding.

Live staging verification:

- Twenty responsive flows passed: five coach routes plus five direct-entry
  attempts for parent, athlete, and club admin. There were zero failed, high,
  or medium findings.
- Coach remained on each exact verification route. Parent returned to `/`,
  athlete to `/development/my-progress`, and club admin to `/club/my-clubs`.
- The exact audit window contains five
  `coach_verification_status.read` events. Every event is a successful,
  sensitive coach self-read; no unauthorised verification event exists.
- `AuditEvent`, `CoachVerification`, `MalwareScanResult`, `MediaObject`, and
  `VerificationDocument` all have RLS enabled. They expose zero policies and
  zero table grants to `anon`, `authenticated`, or `PUBLIC`, preserving direct
  client default deny.
- TypeScript, targeted ESLint, and all 10 focused tests pass. React Doctor has
  no finding in a verification file; its changed-scope failure belongs to
  unrelated concurrent work.
- A final five-route coach replay after the submission-state review also passed
  5/5 with zero high or medium findings. The runner now selects the first
  visible DOM match, so hidden duplicate nodes cannot falsify a visible-control
  assertion.
- Sentry HTTPS verification succeeded, but the read-only issue query returned
  HTTP 403 because the current token lacks project issue-read permission. This
  remains recorded as blocked rather than passed.

Evidence:

- Before:
  [`060-verification-role-gate-before.png`](./screenshots/060-verification-role-gate-before.png)
- Coach after:
  [`061-verification-hub-after.png`](./screenshots/061-verification-hub-after.png),
  [`062-verification-id-after.png`](./screenshots/062-verification-id-after.png),
  [`063-verification-dbs-after.png`](./screenshots/063-verification-dbs-after.png),
  [`064-verification-insurance-after.png`](./screenshots/064-verification-insurance-after.png),
  [`065-verification-credentials-after.png`](./screenshots/065-verification-credentials-after.png)
- Denied athlete destination:
  [`066-verification-athlete-denied-after.png`](./screenshots/066-verification-athlete-denied-after.png)
- Sanitised runtime record:
  [`report.verification.json`](./runtime/2026-07-31/report.verification.json)

These are responsive-browser results for shared React Native code. Deterministic
native semantic interaction remains blocked by host `DevToolsSecurity`, so this
slice is not labelled as a complete native pass.

### SEC-001 — verification evidence inherited the general upload ceiling

The verification pickers accepted a generic image wildcard plus PDF, and the
attachment boundary inherited the general upload ceiling of roughly 2 GB. A
clean, private, coach-owned `MediaObject` could therefore be linked even when
its type or size was inappropriate for identity, DBS, credential, or insurance
evidence.

Fixed in `fix(security): constrain verification evidence uploads`:

- All four document pickers now share one explicit PDF, JPEG, PNG, WebP, HEIC,
  and HEIF selection list. HEIF is normalized to the backend's HEIC media type.
- Client validation rejects unsupported, empty, and larger-than-20-MiB files
  before upload initialization. Each screen states the accepted types and
  limit directly.
- The Fastify attachment boundary independently allows only PDF, JPEG, PNG,
  WebP, or HEIC, checks image/document kind consistency, and rejects empty or
  larger-than-20-MiB media before linking it.
- Existing owner, private visibility, availability, and clean-malware-scan
  checks remain mandatory. Every attachment success or denial remains audited.

Verification:

- The two focused frontend suites passed 12/12: seven service tests cover
  exact-limit HEIF normalization plus SVG, text, empty, and oversized denials,
  and five source-boundary tests keep every picker on the shared policy.
- The isolated Fastify proof accepted a coach-owned, private, clean PDF at the
  exact 20-MiB limit with HTTP 201. It rejected SVG, plain text, a media-kind
  mismatch, a one-byte oversize file, and an empty file with HTTP 400.
- None of the five rejected media IDs created a `VerificationDocument`. The
  isolated audit table contained one `SUCCESS` and five `DENY`
  `coach_verification_documents.submit` events. Existing tests continue to
  prove wrong-owner, infected, and public-media denials.
- No destructive file was uploaded to staging or production. The staging
  database and its previously verified RLS/default-deny posture were not
  mutated.
- A post-change responsive replay passed all five coach verification routes
  with zero high or medium findings, horizontal overflow, nested controls, or
  product-text findings.
- Root and API typechecks, test compilation, focused lint, and the focused API
  tests passed. React Doctor's changed-scope output named only unrelated dirty
  files and pre-existing `coach-club` iteration sites; it reported no changed
  verification UI, hook, or service location.

The boundary follows the OWASP file-upload allowlist, signature, size,
authorization, least-privilege, and malware-scanning guidance. HEIC handling is
also aligned with Apple's registered HEIC file type:

- https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- https://developer.apple.com/documentation/avfoundation/avfiletype/heic

Evidence:

- [`coverage.csv`](./coverage.csv), row `SEC-001`
- [`report.verification-upload-policy.json`](./runtime/2026-07-31/report.verification-upload-policy.json)

This is API, source, and responsive-browser evidence for shared React Native
code. Deterministic native picker and accessibility-tree interaction remains
blocked by host `DevToolsSecurity`, and Sentry issue inspection remains blocked
by HTTP 403; neither is labelled passed.

### SEC-002 — any family member could create a child and become primary

`POST /v1/athletes` previously accepted any active family membership. An
assigned guardian could therefore create an unrelated athlete and the
repository would immediately make that guardian the new athlete's primary
link. That escaped the existing assignment boundary.

Fixed in `fix(security): restrict child creation authority`:

- The seed and Prisma repositories now expose one family-admin decision:
  owner/admin role, primary guardian, or explicit family `admin` permission.
- `POST /v1/athletes` uses that decision and records `athlete.create` denial
  events as well as successes.
- The shared client resolves the same capability before rendering `/add-child`.
  Children, home, and booking entry actions are absent when the actor cannot
  complete the operation.
- The direct route blocks before the form hook initializes, avoiding an
  unauthorised-content flash.
- The audit runner now distinguishes the family-owner and assigned-guardian
  fixtures instead of calling both simply “parent.”

Verification:

- In isolated Fastify proof, owner and delegated admin creates returned 201.
  Assigned guardian and unrelated-user creates returned 403.
- Both denials left `Athlete` and `GuardianChildLink` counts unchanged. The
  audit table contained two `SUCCESS` and two `DENY` `athlete.create` events.
- The full family-athlete route suite passed 26/26. Client authority and family
  permission suites passed 4/4 combined.
- The five-role responsive replay passed 5/5: family owner remained on
  `/add-child`; assigned guardian, coach, athlete, and club admin were
  redirected. It found zero high/medium issues, overflow, nested controls, or
  product-text failures.
- Root/API typechecks, test compilation, and focused lint passed. No staging or
  production create was submitted.

Evidence:

- [`coverage.csv`](./coverage.csv), rows `ROUTE-001` and `SEC-002`
- [`report.json`](./runtime/2026-07-31/add-child-authority-final/report.json)
- [`parent__parent_add_child.png`](./runtime/2026-07-31/add-child-authority-final/parent__parent_add_child.png)

This is API, source, and responsive-browser evidence for shared React Native
code. Deterministic native interaction remains blocked by host
`DevToolsSecurity`; Sentry issue reads remain blocked by HTTP 403.

### UI-022 — Add Child registration redesign

Fixed in `fix(ui): simplify child registration`:

- The duplicate `Add Child` / step-title hierarchy and generic dot wizard were
  replaced by one direct title, a compact `1 / 3` count, and one thin progress
  rule.
- The 100-point circular photo treatment became a compact optional player-photo
  row. Names are full-width, labels use sentence case, and choices expose radio
  or checkbox state instead of behaving like anonymous pills.
- Support and safety no longer lead with decorative icon cards. Their copy now
  states the actual assignment boundary: coaches can see the information only
  when assigned to that player.
- The handmade emergency-treatment toggle was replaced by the native switch.
  The iOS date spinner has an explicit Done action, step changes reset scroll,
  and cancelling an adjustment now clears its draft instead of doing nothing.
- Photo, video, social-media, and emergency-treatment consent now all start
  denied in the Add Child payload; the visible emergency switch is off until
  the guardian changes it.
- An unreachable 152-line duplicate consent step was deleted rather than
  restyled.

Verification:

- Five non-mutating 390px flows passed: player details, support collapsed,
  support expanded, safety, and medical expanded. All recorded zero failed
  requests, high/medium findings, overflow, nested controls, and product-copy
  findings.
- Focused UI and authority guardrails passed 5/5. Root typecheck and test
  compilation passed. Focused lint passed; React Doctor remained at its prior
  84/100 and named only unrelated dirty booking, group-session, and repository
  files—no Add Child slice location.
- No staging or production athlete, guardian link, emergency record, or consent
  mutation was submitted.

Evidence:

- [`coverage.csv`](./coverage.csv), row `UI-022`
- [`report.json`](./runtime/2026-07-31/add-child-redesign/report.json)
- [`parent__parent_add_child.png`](./runtime/2026-07-31/add-child-redesign/parent__parent_add_child.png)
- [`parent__parent_add_child_support.png`](./runtime/2026-07-31/add-child-redesign/parent__parent_add_child_support.png)
- [`parent__parent_add_child_support_details.png`](./runtime/2026-07-31/add-child-redesign/parent__parent_add_child_support_details.png)
- [`parent__parent_add_child_safety.png`](./runtime/2026-07-31/add-child-redesign/parent__parent_add_child_safety.png)
- [`parent__parent_add_child_medical_details.png`](./runtime/2026-07-31/add-child-redesign/parent__parent_add_child_medical_details.png)

This is source and responsive-browser evidence for the shared React Native
screen. Deterministic native visual and VoiceOver interaction remains blocked:
the automation host still reports `DevToolsSecurity`, and Computer Use reports
the Mac is locked. Neither is labelled passed.

### SEC-003 — unresolved consent defaulted to granted

Deleting the unreachable consent screen exposed a high-severity trust defect:
`child-service.ts` converted missing, cleared, and hydrated PHOTO, VIDEO, and
EMERGENCY_TREATMENT values into grants. The Fastify repositories already denied
missing rows, so the shared app service could disagree with backend truth and
make downstream UI checks look authorised without a guardian decision.

Fixed in `fix(security): default child consent to denied`:

- New, missing, cleared, and hydrated consent now defaults to denied for all
  four exposed types.
- The API athlete-to-child mapper no longer invents grants before protected
  health data is loaded.
- Explicit guardian grants still work; explicit revocations supersede the prior
  rows and store `revokedAt`.
- Each `consents.update` audit event now records the complete resulting
  `grantedTypes` and `deniedTypes` state.
- A verified assigned coach can read the backend consent projection but receives
  HTTP 403 on a write; that denial persists as an `authz.request_denied`
  security event.
- The isolated Fastify route suite passed 26 tests. The compiled child and API
  mapping suites passed 28 tests. No staging or production consent was changed.
- Read-only staging inspection confirmed 55 of 55 migrations applied, every
  current public table under RLS, zero current direct `anon` or `authenticated`
  grants, and no public security-definer functions.

Evidence:

- [`coverage.csv`](./coverage.csv), row `SEC-003`
- [`child-service.test.ts`](../../__tests__/services/child-service.test.ts)
- [`family-member-service-api-mode.test.ts`](../../__tests__/services/family-member-service-api-mode.test.ts)
- [`family-athlete/routes.test.ts`](../../apps/api/src/modules/family-athlete/routes.test.ts)
- [`auth-and-permission-boundaries.md`](../../docs/trust/auth-and-permission-boundaries.md)

### SEC-005 — Add Child could fail after creating the athlete

The API-mode client previously completed `POST /v1/athletes` and then issued
separate medical, emergency-contact, and consent writes. Any later failure made
Add Child report an error while the athlete and primary guardian link remained
real. Retrying could create a duplicate player and inconsistent safeguarding
records.

Fixed in `fix(api): create child trust data atomically`:

- Add Child now sends the profile and protected data in one backward-compatible
  create request. It performs no follow-up write.
- The seed repository rolls back athlete, guardian-link, support-tag, medical,
  contact, and consent rows if any bundled write throws.
- The Prisma repository writes the same records in one database transaction.
- Prisma returns the athlete row from that transaction instead of issuing a
  fallible post-commit response read.
- Medical, emergency-contact, and final consent state retain explicit success
  audit events; a failed create records `athlete.create` as `ERROR`.
- Failure injection after the athlete, guardian link, and support tag were
  inserted returned HTTP 500 with every table count unchanged.
- The isolated Fastify suite passed 27 tests. The app API-mode suite passed 12
  tests and observed exactly one write: `POST /v1/athletes`.
- No staging or production athlete or protected record was created or changed.

Evidence:

- [`coverage.csv`](./coverage.csv), row `SEC-005`
- [`family-member-service-api-mode.test.ts`](../../__tests__/services/family-member-service-api-mode.test.ts)
- [`family-athlete/routes.test.ts`](../../apps/api/src/modules/family-athlete/routes.test.ts)
- [`family-athlete-repository.ts`](../../apps/api/src/repositories/p0/family-athlete-repository.ts)
- [`ROUTE_INVENTORY_V1.md`](../../docs/backend-api/ROUTE_INVENTORY_V1.md)

### SEC-004 — Supabase future-object defaults remain over-broad

The same read-only staging preflight found a separate database release blocker.
Current objects are closed: all public tables have RLS, and `anon` and
`authenticated` have no direct grants. However, Supabase's `supabase_admin`
default privileges would grant broad access on future public tables, sequences,
and routines. The connected `postgres` role cannot alter those defaults.

This is not a current `ChildConsent` exposure, but a future migration could
silently reintroduce Data API authority. Supabase MCP is configured and its
server is reachable, but MCP tools are not exposed in this task, so the required
owner-authority remediation was not guessed or executed.

Required proof before closure:

- Revoke the `supabase_admin` public-schema defaults through an authorised
  Supabase control plane or owner session.
- Rerun the read-only staging preflight with zero default grants to `PUBLIC`,
  `anon`, or `authenticated`.
- Retain zero direct grants, full current-table RLS, and no public
  security-definer functions.

Evidence:

- [`coverage.csv`](./coverage.csv), row `SEC-004`
- [`db-staging-preflight.js`](../../scripts/db-staging-preflight.js)
- [`revoke-supabase-default-grants.sql`](../../scripts/sql/revoke-supabase-default-grants.sql)

### QA-004 — async controls were falsely reported missing

The expanded cross-role runner initially reported five high-severity coach
failures: squad Add, schedule Add time block, earnings Payment Instructions,
verification Passport, and verification Add credential. Every captured failure
screenshot visibly contained the supposedly missing control. These were test
harness failures, not five product defects.

Fixed in `fix(qa): wait for async flow controls`:

- `firstVisible` now polls every 200 milliseconds for up to five seconds instead
  of performing one locator count before route data has necessarily rendered.
- The wait remains bounded and still checks every matching accessible candidate;
  missing controls continue to fail rather than being silently accepted.
- The complete coach suite passed 40/40 after the change, including all five
  previously false failures.
- Combining those 40 clean coach results with the initial run's 60 clean
  non-coach results gives 100/100 configured flows across coach, family owner,
  assigned guardian, athlete, and club-admin accounts.
- The extra 29 flows since the prior 71-flow baseline cover Add Child and the
  five verification routes. Their six route rows already carry stronger
  dedicated authority and UI evidence, so no pending route was promoted by
  inference. The ledger still has 86 pending route rows.
- No staging or production mutation was submitted.

Evidence:

- [`coverage.csv`](./coverage.csv), row `QA-004`
- [`report.qa-locator-timing.json`](./runtime/2026-07-31/report.qa-locator-timing.json)
- [`report.route-reconciliation-100.json`](./runtime/2026-07-31/report.route-reconciliation-100.json)

This remains responsive-browser evidence for the shared React Native surface.
Native semantic and VoiceOver interaction is still blocked by host
`DevToolsSecurity`, and Sentry issue inspection is still blocked by the current
HTTP 403 token scope; neither is labelled passed.

### UI-023 — Photo ID choices crowded the radio controls

The 390-pixel verification replay showed `National ID card` running into its
radio control. Each row also spent width on a decorative passport, car, or ID
icon even though the adjacent label already named the choice.

Fixed in `fix(ui): simplify photo ID choices`:

- The three redundant icons and their unused data were deleted.
- Choice labels now own the flexible width with a zero minimum, while the radio
  keeps a stable trailing position.
- Row padding and dividers now align to the text-only choice treatment.
- A targeted runner assertion measures at least 16 pixels between the revealed
  Choose document action and Requirements, so the scaled screenshot cannot be
  mistaken for a real section collision.
- Two warmed coach verification replays passed 5/5. The final run recorded zero
  overflow, nested controls, product-text findings, or high/medium findings.
- Root typecheck, test compilation, focused formatting, and lint passed. No
  document was selected or uploaded.
- React Doctor scored the concurrently dirty tree 83/100 and reported no issue
  in the Photo ID screen, verification hook, or flow assertion. Its diagnostics
  were confined to unrelated booking and group-session files already dirty in
  the shared worktree, so they were preserved rather than folded into this fix.

The first post-hot-reload replay was deliberately not accepted as proof: it
captured three controls only after their assertions and left DBS on its truthful
loading skeleton. Both warmed reruns passed, so the transient cold-run evidence
is recorded as a limitation rather than hidden or misclassified as a product
failure.

Evidence:

- [`coverage.csv`](./coverage.csv), row `UI-023`
- [`report.json`](./runtime/2026-07-31/verification-id-geometry/report.json)
- [`coach__coach_verification_identity.png`](./runtime/2026-07-31/verification-id-geometry/coach__coach_verification_identity.png)

This is responsive-browser evidence for the shared React Native screen. Native
radio interaction and VoiceOver remain blocked by host `DevToolsSecurity`, and
Sentry issue inspection remains blocked by the current HTTP 403 token scope.
