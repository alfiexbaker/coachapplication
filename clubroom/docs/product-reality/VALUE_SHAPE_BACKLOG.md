# Value Shape Cleanup Backlog

Canonical synthesis: `value-shape/MASTER.md`

Updated: 2026-03-17
Purpose: ranked cleanup queue based on feature value, relationship clarity, and removal of duplicated or low-value surfaces

## Product Frame

Clubroom should behave like two connected products:

- a Spond-like coordination product for families, coaches, and clubs
- a coaching marketplace for finding, booking, rebooking, and paying for football coaching

That means the backlog should reward features that improve coordination, improve marketplace conversion, and clarify who owns each relationship.

## Relationship Types To Optimize

- booking relationship: who booked, who pays, who delivers, who supports
- delivery relationship: coach to athlete, coach to session, coach to club standards
- family relationship: guardian to child, guardian to coach, guardian to club, guardian to support owner
- club governance relationship: owner to staff, head coach to quality, club to risk, club to money

## Ranking Method

Higher rank means:

- clearer user job
- stronger relationship ownership
- less duplicated navigation
- less summary UI before action
- better fit with coordination plus marketplace product shape

## Ranked Cleanup Actions

1. Family home reset
   Recommendation: `PROMOTE`
   Status: `DONE` on 2026-03-17
   Feature change: make `Family Calendar` the default parent home and stop routing parent-like users into the generic `USER` home
   Why it matters: this fixes the biggest feature-ownership error in the app and aligns family relationships, bookings, recurring plans, and trust
   Affected roles: parent, family, athlete

2. Remove family dashboard as a primary feature
   Recommendation: `CUT`
   Status: `DONE` on 2026-03-17
   Feature change: remove the current family dashboard as a primary destination or reduce it to a thin gateway
   Why it matters: it duplicates calendar, recurring, spending, and child-progress entry while leading with weak summary blocks
   Affected roles: parent, family

3. Merge manage into owner operations
   Recommendation: `MERGE`
   Status: `DONE` on 2026-03-17
   Feature change: fold owner `Manage` entry into owner dashboard actions and keep `/manage` only as a coach/head-coach bridge when club context is ambiguous
   Why it matters: owners already get the real value from the dashboard, staffing, and oversight; the index just adds another home
   Affected roles: owner, head coach, coach

4. Rewrite discover inside bookings around relationship expansion
   Recommendation: `REWRITE`
   Feature change: keep `Discover` in bookings, but make it about finding more sessions from coaches or clubs the user already has a relationship with
   Why it matters: this preserves a valid follow-on booking feature without duplicating the broad discovery marketplace
   Affected roles: parent, athlete

5. Simplify athlete home into next-session plus development
   Recommendation: `REWRITE`
   Feature change: strip out generic stats, streak, walkthrough, and club filler from the generic home
   Why it matters: athletes need progression and upcoming work, not a dashboard that mixes several weak summaries
   Affected roles: athlete

6. Demote coach profile below schedule, bookings, and earnings
   Recommendation: `DEMOTE`
   Feature change: treat coach profile as a secondary identity surface, not a primary operating feature
   Why it matters: coach value comes from availability, delivery, and revenue, not follower or feed energy
   Affected roles: coach

7. Keep booking detail as the trust center and expand from there
   Recommendation: `KEEP`
   Feature change: continue consolidating support ownership, billing ownership, recurring linkage, and visibility rules in booking detail
   Why it matters: this is the clearest relationship feature in the product
   Affected roles: owner, coach, parent, athlete

8. Demote head coach snapshot layers
   Recommendation: `DEMOTE`
   Feature change: reduce snapshot tiles and coach-health summaries if they do not directly trigger intervention
   Why it matters: oversight is already strongest in the queues, watchlist, and task board
   Affected roles: head coach, owner

9. Remove community as a core product area
   Recommendation: `CUT`
   Feature change: quarantine or remove community groups from the main product shape
   Why it matters: this is relationship leakage from a social model, not a coaching operations feature
   Affected roles: parent, coach, athlete

10. Demote feed across the product
    Recommendation: `DEMOTE`
    Feature change: move feed out of the center of role navigation
    Why it matters: feed does not carry the main jobs for any role and still mixes in friend-style logic
    Affected roles: coach, parent, athlete, owner

11. Remove family spending charts as a primary feature
    Recommendation: `DEMOTE`
    Status: `DONE` on 2026-03-17
    Feature change: reduce spending to a lightweight ledger or contextual support view
    Why it matters: the current feature is chart-heavy and low-action
    Affected roles: parent, family

12. Rewrite health around readiness and visibility
    Recommendation: `REWRITE`
    Feature change: keep health, but position it as injury status, medical readiness, emergency context, and relationship-based visibility instead of a thin standalone dashboard
    Why it matters: health is a real trust feature, but only when it clearly changes delivery, access, or safeguarding decisions
    Affected roles: parent, coach, athlete, head coach

13. Demote saved coaches to a shortlist utility
    Recommendation: `DEMOTE`
    Feature change: keep saved coaches, but remove stat framing and demo filler
    Why it matters: this is a support feature for conversion, not a destination
    Affected roles: parent, athlete

14. Remove compare as a dedicated product feature unless it proves conversion value
    Recommendation: `CUT`
    Feature change: remove compare or collapse it into a small shortlist tool inside discovery
    Why it matters: it is a niche feature with dedicated UI weight and limited relationship value
    Affected roles: parent, athlete

15. Replace admin users as the admin home
    Recommendation: `REWRITE`
    Feature change: do not use the three-count users overview as the main admin surface
    Why it matters: it is a vanity summary, not an operational control surface
    Affected roles: admin, internal ops

16. Keep invite codes as the only meaningful admin tool for now
    Recommendation: `KEEP`
    Feature change: keep invite codes visible as a narrow internal control
    Why it matters: this is one of the few admin features that performs a real job
    Affected roles: admin, internal ops

17. Remove settings/help placeholder surfaces
    Recommendation: `CUT`
    Feature change: remove or hide settings rows that lead to toasts, coming-soon copy, or version filler
    Why it matters: fake settings reduce trust
    Affected roles: all

18. Keep blocked users prominent inside trust settings
    Recommendation: `PROMOTE`
    Feature change: keep blocked users and make it the canonical relationship-boundary control
    Why it matters: blocking materially changes messaging, discovery, and invitation relationships
    Affected roles: all

19. Rewrite privacy around real relationship outcomes
    Recommendation: `REWRITE`
    Feature change: keep only privacy controls that clearly alter visibility, discoverability, contactability, or child-data access
    Why it matters: vague toggles create policy theater
    Affected roles: coach, parent, athlete

20. Reduce walkthrough cards on operational features
    Recommendation: `CUT`
    Feature change: remove walkthrough cards from owner, athlete, coach, and admin core surfaces
    Why it matters: they add meta-layer noise on top of features that should explain themselves through structure
    Affected roles: owner, coach, athlete, admin

21. Tighten discovery around professional coaching relationships
    Recommendation: `REWRITE`
    Feature change: keep discovery, public profiles, and in-bookings relationship expansion, but remove friend/follower/social cues where they are not directly helping booking conversion
    Why it matters: the product should establish professional coaching relationships, not act like a social network
    Affected roles: coach, parent, athlete

## Additional Structural Actions

These were underweighted in the first pass. They are not edge cases. They are core product infrastructure.

22. Keep verification as marketplace trust infrastructure
    Recommendation: `PROMOTE`
    Feature change: treat verification as a core marketplace feature, not a profile-adjacent settings area
    Why it matters: verification directly affects booking trust, search conversion, and child-facing delivery confidence
    Affected roles: coach, parent, athlete, owner

23. Rewrite verification actions that only instruct instead of completing
    Recommendation: `REWRITE`
    Feature change: replace email and phone rows that only trigger instructional toasts with explicit completion flows or honest non-actions
    Why it matters: fake verification actions weaken trust more than missing actions
    Affected roles: coach

24. Cut payments as a separate destination if it remains a redirect
    Recommendation: `CUT`
    Feature change: remove `Payments` as a distinct feature unless it owns real payer or payout workflows
    Why it matters: a redirect route adds navigation weight without adding product value
    Affected roles: coach, parent, athlete

25. Rewrite invoices around records, not summary cards
    Recommendation: `REWRITE`
    Feature change: keep invoices, but lead with the documents and statuses instead of paid-versus-pending summary presentation
    Why it matters: the real job is resolving what was charged, paid, or pending, not reading a mini finance dashboard
    Affected roles: parent, athlete, coach

26. Rewrite consent around missing or risky states
    Recommendation: `REWRITE`
    Feature change: keep consent management, but center the feature on unresolved permissions and exceptions rather than percentages and dashboard cards
    Why it matters: consent is trust governance, not reporting
    Affected roles: coach, parent, owner, head coach

27. Promote concern raising as a core trust action
    Recommendation: `PROMOTE`
    Feature change: keep and strengthen concern raising as the canonical safeguarding escalation path
    Why it matters: it is one of the few flows that already forces severity, action taken, and escalation discipline
    Affected roles: coach, head coach, owner

28. Keep invites and notifications as coordination infrastructure
    Recommendation: `KEEP`
    Feature change: preserve invites and notifications, but judge them by whether they route back into a real response, booking, or attendance workflow
    Why it matters: these features build and sustain the coordination graph
    Affected roles: coach, parent, athlete, owner

29. Promote club calendar over weaker community-style surfaces
    Recommendation: `PROMOTE`
    Feature change: treat club calendar as the canonical club coordination home for sessions, matches, and events
    Why it matters: this is the most legitimate Spond-like coordination surface in the current runtime
    Affected roles: owner, head coach, coach, parent, athlete

30. Rewrite development around notes, history, and next actions
    Recommendation: `REWRITE`
    Feature change: keep development, but center it on session notes, feedback history, and concrete next work before goals stats, category chips, and celebration layers
    Why it matters: coaching value comes from follow-up and progression clarity, not gamified summary shells
    Affected roles: athlete, parent, coach

## Keep / Cut / Merge / Demote Summary

### KEEP

- Booking Detail
- Schedule
- Staffing Console
- Head Coach Oversight core queues
- Earnings Reconciler
- Family Calendar
- Recurring Plans
- Health when tied to readiness, safeguarding, and visibility
- In-bookings discovery when relationship-based
- Invite Codes
- Blocked Users
- Verification Hub
- Session Invites
- Notifications when tied to handoffs
- Club Calendar
- Raise Concern
- Session Notes

### CUT

- Family Dashboard as a primary feature
- Community as a core product area
- Compare as a dedicated feature unless defended by conversion data
- Placeholder settings/help rows
- Payments as a standalone feature if it remains only a redirect
- Walkthrough cards on primary operational surfaces

### MERGE

- Manage into Owner Dashboard
- Parent discover into coach discovery plus family calendar
- Athlete generic home into bookings plus progress

### DEMOTE

- Feed
- Coach Profile
- Saved Coaches
- Family Spending
- Health as a top-level generic dashboard
- Head Coach snapshot layers
- Admin Users overview
- Consent stat cards as the lead surface
- Finance summary cards ahead of invoice records

### REWRITE

- Login and home routing for parents
- Discover inside bookings so it expands existing coach or club relationships
- Health entry so it affects readiness, access, and safeguarding decisions
- Privacy settings around relationship outcomes
- Discovery language to be more professional and less social
- Verification actions that only instruct
- Consent around unresolved permissions and exceptions
- Development around notes, history, and next actions
- Notifications so they return users to real workflows

## Immediate Next Sequence

1. Reset parent home ownership to `Family Calendar`
2. Collapse `Manage` into owner dashboard actions
3. Rewrite `Discover` in bookings around known-coach and known-club expansion
4. Rewrite health around readiness, injury status, and relationship visibility
5. Promote verification as core marketplace trust infrastructure
6. Rewrite consent around missing or risky states
7. Promote club calendar over weaker community-style surfaces
8. Reduce athlete home to next-session plus progress

## Strategic Readout

Use these tests against every feature in the cleanup queue:

- Does it help families coordinate their week better, like Spond?
- Does it help users find, book, rebook, or pay a coach better, like a marketplace?
- Does it make relationship ownership clearer?
- If not, it should usually be demoted, merged, rewritten, or removed.
