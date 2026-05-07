# Clubroom Value Shape Audit

Canonical synthesis: `value-shape/MASTER.md`

Updated: 2026-03-16
Scope: current Expo runtime surfaces, hooks, and service-backed flows
Lens: feature value, relationship clarity, operational ownership, and removal of low-value breadth

## Product Frame

Clubroom should feel like two products working together:

- a Spond-like coordination product for families, coaches, and clubs
- a coaching marketplace for finding, booking, rebooking, and paying for football coaching

That is the right lens for every feature call in this audit. More surface area is not a win if it weakens coordination, marketplace conversion, or relationship ownership.

## Core Relationship Model

The product gets stronger when each feature clearly serves one of these relationship types:

- booking relationship: who booked, who pays, who delivers, who supports
- delivery relationship: coach to athlete, coach to session, coach to club standards
- family relationship: guardian to child, guardian to coach, guardian to club, guardian to support owner
- club governance relationship: owner to staff, head coach to quality, club to risk, club to money

## Executive Verdict

Clubroom already creates real product value in a small set of features:

- booking detail and booking trust
- coach schedule and session delivery
- owner staffing and oversight operations
- earnings reconciler language

Everything outside those spines is less coherent. The main failure mode is not missing coverage. It is too many surfaces competing to own the same job:

- too many homes
- too many summaries before action
- too many relationship-light social surfaces
- too many controls that change presentation more than behavior

The product is strongest when it makes the relationship explicit:

- who owns the booking
- who delivers the session
- who supports the family
- who is allowed to see child data
- who is owed money

The product is weakest when it drifts into generic dashboard, social, or profile theater.

## Product Shape By Feature

### Login And Role Entry

Current truth:

- seeded role entry already implies a clearer product than the runtime home routing
- demo role entry sends family users to `Family`
- tab home still routes most parent-like users through the generic `USER` home

Files:

- [app/(tabs)/index.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/(tabs)/index.tsx#L39)
- [app/(tabs)/_layout.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/(tabs)/_layout.tsx#L85)
- [utils/demo-role-entry.ts](/Users/tubton/Desktop/coachapplication/clubroom/utils/demo-role-entry.ts#L39)

Verdict:

- `KEEP`: seeded role entry concept
- `REWRITE`: home routing so feature entry matches the intended relationship story
- `CUT`: the false distinction where "parent" is a demo concept but not a stable runtime home model

Relationship issue:

- the app knows a parent by child relationship in some places and by account role in others
- this creates feature drift around family, bookings, progress, and home selection
- for a coordination product, that is not a small routing flaw; it is a broken relationship model

### Family Operations

Current surfaces:

- parent discover home
- generic user home with child switching
- family dashboard
- family calendar
- family spending
- family recurring
- family sharing

Files:

- [components/parent/discover-screen.tsx](/Users/tubton/Desktop/coachapplication/clubroom/components/parent/discover-screen.tsx#L45)
- [components/user/home-screen.tsx](/Users/tubton/Desktop/coachapplication/clubroom/components/user/home-screen.tsx#L32)
- [app/family/index.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/family/index.tsx#L31)
- [app/family/calendar.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/family/calendar.tsx#L28)
- [app/family/spending.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/family/spending.tsx#L28)
- [app/family/recurring.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/family/recurring.tsx#L19)

Primary feature home:

- `PROMOTE`: Family Calendar

Why:

- it is the closest thing to the real parent job
- it organizes the week across children
- it links directly into bookings, recurring plans, and spending
- it exposes schedule conflicts, which is actual parent work

Feature calls:

- `KEEP`: recurring plans
- `KEEP`: health as a secondary trust and readiness feature
- `KEEP`: booking detail from family contexts
- `KEEP`: family sharing as a secondary trust/admin feature
- `MERGE`: parent discover into coach discovery plus family calendar entry
- `DEMOTE`: family dashboard to a lightweight gateway or remove entirely
- `CUT`: family spending as a primary navigation destination if it stays chart-first

Low-value feature elements:

- family dashboard overview stats
- recognition summary as a primary panel
- next-session highlight after upcoming sessions already exist
- spending comparison card
- spending date-range chips
- month stats above the family calendar
- color legend as a persistent card

Relationship framing:

- the family feature should be about relationship governance:
  - child to coach
  - child to club
  - parent to support owner
  - guardian to child access
- health status to delivery readiness and safeguarding visibility
- the current family dashboard spends too much space describing the family and not enough helping them run the relationship load
- this area should feel closer to family coordination than to a dashboard app

### Health And Readiness

Current surfaces:

- health hub
- injury detail
- child medical and emergency routes
- roster health access for coaches

Files:

- [app/health/index.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/health/index.tsx#L16)
- [app/health/[id].tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/health/%5Bid%5D.tsx#L1)
- [app/child/[id]/medical.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/child/%5Bid%5D/medical.tsx#L1)
- [app/child/[id]/emergency.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/child/%5Bid%5D/emergency.tsx#L1)
- [app/roster/[athleteId]/health.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/roster/%5BathleteId%5D/health.tsx#L1)

Primary feature home:

- `KEEP`: health as a secondary trust feature

Why:

- health is a real relationship boundary feature
- it affects delivery safety, participation readiness, and what a coach is allowed to know
- it matters more as explicit status and escalation than as a standalone "wellness dashboard"
- this is coordination and safeguarding infrastructure, not engagement filler

Feature calls:

- `KEEP`: injury logging and injury detail
- `KEEP`: medical and emergency records where they support delivery and safeguarding
- `KEEP`: coach access to roster health when tied to an active coaching relationship
- `DEMOTE`: health as a top-level destination for most users
- `REWRITE`: health entry so it is framed as readiness, injury status, and support visibility

Low-value feature elements:

- the current health hub is thin and generic
- it does not yet feel like a strong operating surface for either parents or coaches
- it risks feeling isolated from bookings, session delivery, and trust ownership

Relationship framing:

- health should answer:
  - what the current injury or medical status is
  - who can see it
  - who is responsible for acting on it
  - whether it changes booking, session, or delivery decisions

Best product shape:

- health should plug into family, roster, and booking detail
- it should stay explicit in trust-sensitive moments, not become a generic standalone summary destination

### Roster, Consent, And Concern Management

Current surfaces:

- consent dashboard
- athlete roster detail and trust routes
- raise concern flow
- roster health and emergency access

Files:

- [app/roster/consents.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/roster/consents.tsx#L1)
- [app/roster/[athleteId]/raise-concern.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/roster/%5BathleteId%5D/raise-concern.tsx#L1)
- [app/roster/[athleteId]/health.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/roster/%5BathleteId%5D/health.tsx#L1)
- [app/roster/[athleteId]/emergency.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/roster/%5BathleteId%5D/emergency.tsx#L1)

Primary feature home:

- `KEEP`: roster trust actions as a core coach and club feature

Why:

- this is where trust becomes operational instead of descriptive
- concern raising is one of the few flows that forces severity, immediate action, and escalation logic
- consent and emergency data directly change what the coach or club is allowed to do

Feature calls:

- `KEEP`: raise concern
- `KEEP`: roster health and emergency access
- `REWRITE`: consent dashboard around missing, blocked, or risky consent states
- `DEMOTE`: consent stat cards when they act like dashboard decoration instead of exception handling

Low-value feature elements:

- consent percentage cards at the top of the screen
- "Quick view before posting content" framing, which is too narrow for a broader safeguarding and permissions feature
- search and filters when they are used to reshape a list instead of isolate unresolved trust issues

Relationship framing:

- this feature area should answer:
  - what the coach is allowed to do with an athlete
  - what has not been consented to
  - when a concern must be escalated
  - who is responsible for follow-up

### Booking And Booking Trust

Current surfaces:

- bookings list
- booking detail
- booking cancellation
- recurring plan linkage
- report problem

Files:

- [app/(tabs)/bookings/index.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/(tabs)/bookings/index.tsx#L23)
- [app/(tabs)/bookings/[id].tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/(tabs)/bookings/%5Bid%5D.tsx#L296)
- [hooks/use-booking-detail.ts](/Users/tubton/Desktop/coachapplication/clubroom/hooks/use-booking-detail.ts#L193)

Primary feature home:

- `PROMOTE`: booking detail

Why:

- it makes the commercial relationship explicit
- it makes support ownership explicit
- it makes visibility boundaries explicit
- it removes fake in-app payment/refund/reschedule theater and routes the user into the real relationship channel

Feature calls:

- `KEEP`: booking trust card
- `KEEP`: ownership card
- `KEEP`: recurring linkage from booking detail
- `KEEP`: support ownership and billing language
- `REWRITE`: discover inside bookings so it helps users find more sessions from existing coach or club relationships

Fake or weak feature elements:

- bookings `Sessions | Discover` becomes weak only when `Discover` is just a second broad marketplace surface
- bookings discovery becomes valuable when it is framed as relationship expansion inside the existing booking context

Relationship framing:

- this is the cleanest feature in the product because it answers:
  - booked with whom
  - billed by whom
  - delivered by whom
  - supported by whom
- it is also the clearest proof that the marketplace side of the product works

### Payments, Invoices, And Money Visibility

Current surfaces:

- payments route
- invoices list
- invoice summary
- coach earnings reconciler

Files:

- standalone payments redirect removed; keep money entry points under earnings and invoices
- [app/invoices/index.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/invoices/index.tsx#L1)
- [app/earnings.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/earnings.tsx#L58)

Primary feature homes:

- `KEEP`: earnings for coaches
- `KEEP`: invoices as the parent and athlete record surface

Why:

- money language is only trustworthy when it resolves into an actual payer, payee, invoice, or payout
- invoices are a real support feature because they answer what happened commercially after a booking
- earnings already does more real work than the nominal `Payments` route

Feature calls:

- `KEEP`: invoice list as an explicit receipts and billing record
- `KEEP`: earnings reconciler
- `REWRITE`: invoices if summary cards stay more prominent than the documents themselves
- `CUT`: payments as a standalone feature if it remains only a redirect to earnings

Low-value feature elements:

- the `Payments` route is dead weight if it does nothing except redirect
- invoice summary cards duplicate paid and pending information that the invoice list already carries
- paid and pending counts are secondary to the actual records

Relationship framing:

- finance features should answer:
  - who paid
  - who is owed
  - what is pending
  - which document proves it

### Coach Schedule And Delivery

Current surfaces:

- schedule
- availability
- bookings
- earnings
- coach profile

Files:

- [app/(tabs)/schedule.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/(tabs)/schedule.tsx#L38)
- [app/earnings.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/earnings.tsx#L58)
- [app/(tabs)/coach-profile.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/(tabs)/coach-profile.tsx#L24)

Primary feature home:

- `PROMOTE`: schedule

Why:

- it is the coach's working surface
- it unifies live sessions and availability
- it supports the real split between independent work and org-assigned work

Feature calls:

- `KEEP`: schedule
- `KEEP`: bookings for delivery/completion
- `KEEP`: earnings reconciler
- `DEMOTE`: coach profile
- `DEMOTE`: feed

Low-value or secondary feature elements:

- coach profile as a primary tab destination
- follower/follow energy on coach identity
- feed as a core navigation item for coaches

Relationship framing:

- coach value comes from clear commercial and delivery relationships
- not from audience-building inside a social shell
- coaches need a business console more than a creator profile

### Development, Goals, And Session Notes

Current surfaces:

- my progress
- session notes
- session history and related development views

Files:

- [app/development/my-progress.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/development/my-progress.tsx#L1)
- [app/session-notes/[bookingId].tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/session-notes/%5BbookingId%5D.tsx#L1)

Primary feature home:

- `KEEP`: session notes and development history as the core development truth

Why:

- session notes connect coach delivery to parent and athlete follow-up
- they create a clean handoff from session completion into development
- this is more valuable than gamified progress decoration

Feature calls:

- `KEEP`: session notes
- `KEEP`: development history when it shows concrete feedback over time
- `REWRITE`: goals dashboard so current goals and next actions appear before aggregate stats
- `DEMOTE`: celebration-heavy progress layers when they compete with feedback, notes, and the next development task

Low-value feature elements:

- average-progress, active, and completed goal stats at the top of the goals dashboard
- category-chip and tab layers when they add browsing overhead before showing current goals
- spectacle-heavy progress elements if they answer "how does this look?" before "what should happen next?"
- progress pages that mix badge walls, ceremonies, heatmaps, and value summaries before coach feedback

Relationship framing:

- development should strengthen:
  - coach to athlete follow-up
  - parent confidence in progress
  - athlete clarity about next work
- it gets weaker when the feature behaves more like a rewards shell than a coaching-development system

### Owner Operations

Current surfaces:

- owner dashboard
- manage hub
- staffing console
- head coach oversight
- earnings reconciler

Files:

- [app/club/[clubId]/dashboard.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/club/[clubId]/dashboard.tsx#L266)
- `app/manage/index.tsx`: reduced to a redirect; not a standalone operations home
- [app/manage/bookings.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/manage/bookings.tsx#L37)
- [app/manage/head-coach.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/manage/head-coach.tsx#L463)

Primary feature home:

- `PROMOTE`: owner dashboard

Why:

- it starts with exceptions
- it links to the operational features that matter
- it frames staffing, support, completion, and finance in one business view

Feature calls:

- `KEEP`: owner dashboard
- `KEEP`: staffing console
- `KEEP`: head coach oversight
- `KEEP`: earnings reconciler
- `MERGE`: manage hub into dashboard actioning

Low-value feature elements:

- manage hub as a separate feature index
- walkthrough card on the owner dashboard
- duplicated summary cards before exception lists

Relationship framing:

- owner work is about operating relationships:
  - club to coach assignment
  - club to family support responsibility
  - club to session quality
  - club to revenue exposure
- this is where the Spond-like club coordination layer should meet the marketplace staffing and commercial layer

### Head Coach Oversight

Primary feature home:

- `PROMOTE`: head coach oversight

Why:

- it is scoped
- it produces tasking
- it supervises delivery standards without owner finance clutter

Feature calls:

- `KEEP`: awaiting completion queue
- `KEEP`: athlete watchlist
- `KEEP`: task board
- `KEEP`: standards
- `DEMOTE`: oversight snapshot
- `DEMOTE`: coach health summary if it stays non-actionable

Relationship framing:

- this feature is about supervisory relationships:
  - head coach to delivery coach
  - head coach to athlete follow-up pressure
  - head coach to club standards

### Club Coordination

Current surfaces:

- club calendar
- events
- group sessions

Files:

- [app/club/[clubId]/calendar.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/club/%5BclubId%5D/calendar.tsx#L1)
- [app/events/index.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/events/index.tsx#L1)
- [app/group-sessions/index.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/group-sessions/index.tsx#L1)

Primary feature home:

- `PROMOTE`: club calendar

Why:

- this is the strongest Spond-like coordination surface in the codebase
- it unifies sessions, matches, and events into one operating calendar
- it is a better club home than community or generic feed surfaces

Feature calls:

- `KEEP`: club calendar
- `KEEP`: events as a secondary list view
- `KEEP`: group sessions as a crossover feature between coordination and booking
- `DEMOTE`: decorative legend and secondary filter layers when they compete with the actual day agenda

Low-value feature elements:

- event filters that mostly re-slice a generic list
- group-session chips when they encourage browsing more than commitment
- any club coordination feature that is weaker than the calendar but given equal navigation weight

Relationship framing:

- club coordination should answer:
  - what is happening this week
  - who is involved
  - what a coach, athlete, or parent needs to attend or act on
- this is the legitimate coordination layer that should replace weaker community-style product energy

### Discovery, Profile, Save, Compare

Current surfaces:

- book coach discovery
- map discovery
- in-bookings discovery
- public coach profile
- saved coaches
- compare coaches

Files:

- [app/book-coach.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/book-coach.tsx#L71)
- [app/discover/map.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/discover/map.tsx#L57)
- [app/coach/[coachId]/public.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/coach/%5BcoachId%5D/public.tsx#L27)
- [app/favourites/index.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/favourites/index.tsx#L29)
- [app/compare/index.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/compare/index.tsx#L25)

Primary feature home:

- `KEEP`: dedicated discovery

Feature calls:

- `KEEP`: public coach profile
- `KEEP`: coach discovery list and map
- `KEEP`: in-bookings discovery when it helps users find more sessions from a coach or club they already know
- `DEMOTE`: saved coaches
- `CUT`: compare if it stays niche and summary-heavy

Low-value feature elements:

- saved-count row in saved coaches
- demo-banner framing in favourites
- compare as a dedicated product feature instead of a small shortlist utility
- any discovery surface that repeats the same broad marketplace results without using relationship context

Relationship framing:

- discovery should establish a professional coaching relationship
- save and compare are support tools, not primary product destinations
- discovery matters because the marketplace needs conversion, but it should stay relationship-deepening rather than entertainment-led

### Verification And Coach Trust

Current surfaces:

- verification hub
- email and phone checks
- photo ID
- background check
- credentials
- insurance

Files:

- [app/verification/index.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/verification/index.tsx#L1)
- [app/verification/id.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/verification/id.tsx#L1)
- [app/verification/background.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/verification/background.tsx#L1)
- [app/verification/credentials.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/verification/credentials.tsx#L1)
- [app/verification/insurance.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/verification/insurance.tsx#L1)

Primary feature home:

- `KEEP`: verification hub

Why:

- this is not a profile embellishment; it is marketplace trust infrastructure
- it links trust status to concrete verification tasks
- it explicitly states that verification affects search ranking and profile trust

Feature calls:

- `KEEP`: itemized verification rows
- `KEEP`: background, credentials, and insurance checks
- `REWRITE`: email and phone verification actions if they only trigger instructional toasts instead of real completion flows
- `DEMOTE`: explanatory trust copy when it competes with actual verification tasks

Low-value feature elements:

- email and phone rows that only say "check your inbox" or "check your messages"
- progress meter and level copy when they become more prominent than the missing trust tasks
- the "appear higher in search results" box if it is doing more work than the verification actions themselves

Relationship framing:

- verification should answer:
  - can this coach be trusted for booking and child-facing delivery
  - what evidence is still missing
  - how does trust status affect marketplace conversion

### Messaging

Current surfaces:

- direct threads
- group threads
- group filter

Files:

- [app/(tabs)/messages.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/(tabs)/messages.tsx#L18)

Feature calls:

- `KEEP`: direct messaging
- `DEMOTE`: groups
- `DEMOTE`: group filter

Why:

- the main job is resolving booking, delivery, and support conversations
- group messaging is secondary unless it maps to concrete club or squad operations

Relationship framing:

- direct message is the feature that supports booking and trust relationships
- group messaging should exist only where the group has a real operating relationship
- messaging should behave like coordination infrastructure, not social chatter

### Invites, Notifications, And Calendar Sync

Current surfaces:

- session invites inbox
- notification inbox
- calendar sync settings

Files:

- [app/invites.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/invites.tsx#L1)
- [app/(tabs)/notifications.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/(tabs)/notifications.tsx#L1)
- [app/settings/calendar-sync.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/settings/calendar-sync.tsx#L1)

Primary feature home:

- `KEEP`: invites as the relationship-building inbox

Why:

- invites are how coaches create new participation relationships
- notifications and calendar sync are real coordination infrastructure in a Spond-like product
- these features matter when they route the user back into a booking, response, or attendance decision

Feature calls:

- `KEEP`: session invites inbox
- `KEEP`: notifications when they drive handoff and follow-up
- `KEEP`: calendar sync as a secondary utility
- `REWRITE`: notification content and routing if notifications are passive updates instead of action entry points
- `DEMOTE`: informational sync copy and secondary tab weight in invites

Low-value feature elements:

- invite tabs when they become inbox chrome instead of helping the user answer pending requests
- notification inboxes that are read-only history instead of workflow entry
- calendar sync explainer copy once the toggles and export action are already clear

Relationship framing:

- invites build the relationship graph
- notifications sustain the graph through reminders and handoffs
- calendar sync turns the relationship into actual weekly coordination

### Feed And Community

Current surfaces:

- feed
- friend feed merge
- community groups

Files:

- [app/(tabs)/feed.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/(tabs)/feed.tsx#L65)
- [app/community/[groupId].tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/community/[groupId].tsx#L1)

Feature calls:

- `DEMOTE`: feed stays as an operational updates read surface
- `CUT`: standalone community group directory/create hub
- `KEEP`: private group detail for squad/team coordination

Why:

- feed is not where product value compounds today
- community groups read as social-product leakage, not football coaching operations
- friend feed weakens the professional relationship model

Relationship framing:

- the product needs coach-family-athlete-club relationships
- it does not need a friend graph at the center of the experience
- group coordination can be justified in a Spond-like product; friend-feed behavior cannot be a primary product shape

### Settings, Help, Privacy, Support

Current surfaces:

- settings hub
- privacy
- blocked users
- help and support

Files:

- [app/settings/index.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/settings/index.tsx#L63)
- [app/settings/privacy.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/settings/privacy.tsx#L38)
- [app/settings/blocked-users.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/settings/blocked-users.tsx#L27)
- [app/settings/help.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/settings/help.tsx#L28)

Feature calls:

- `KEEP`: blocked users
- `KEEP`: core privacy settings that materially change visibility
- `DEMOTE`: generic help center, FAQ, support-us content
- `CUT`: placeholder settings and version/about filler

Low-value or misleading feature elements:

- language row with no real feature
- security row leading to placeholder toast
- about/version filler
- FAQ blocks as product weight
- support rows that point to coming-soon responses

Relationship framing:

- trust settings should govern real relationship boundaries:
  - visibility
  - contactability
  - blocking
  - data access
- if a toggle does not clearly change one of those, it is suspect
- fake trust controls are worse than missing controls because they imply protection without changing the relationship

### Admin And Internal Ops

Current surfaces:

- users
- invite codes

Files:

- [components/admin/users-screen.tsx](/Users/tubton/Desktop/coachapplication/clubroom/components/admin/users-screen.tsx#L16)
- [app/(tabs)/admin/invite-codes.tsx](/Users/tubton/Desktop/coachapplication/clubroom/app/(tabs)/admin/invite-codes.tsx#L26)

Feature calls:

- `KEEP`: invite codes
- `DEMOTE`: admin users overview

Why:

- invite codes are an actual control surface
- admin users is only count tiles and no meaningful operational action

## Canonical Feature Homes

Owner:

- owner dashboard
- staffing console
- head coach oversight
- earnings reconciler
- club calendar

Head coach:

- head coach oversight
- booking detail when intervention is needed
- roster concern and trust actions

Coach:

- schedule
- bookings
- earnings reconciler
- verification hub
- roster trust actions

Parent:

- family calendar
- recurring plans
- booking detail
- invites
- invoices

Athlete:

- progress
- bookings
- goals
- invites

Admin:

- invite codes

## Fake Controls

- bookings `Sessions | Discover`
- family spending date-range chips
- some privacy toggles unless verified to change real visibility or data access
- any perspective switch that only changes card presentation

## Duplicate Feature Ownership

- parent discover vs family dashboard vs generic user home
- owner dashboard vs manage hub
- discovery inside bookings vs dedicated discovery
- coach profile, feed, favourites, and compare all competing around the same conversion relationship

## Ruthless Cuts

- family dashboard as a primary feature
- compare as a dedicated product feature unless it becomes conversion-critical
- community groups as a core product area
- admin users overview as a primary home
- help/support filler sections
- about/version fluff
- payments as a standalone feature if it remains a redirect
- demo walkthrough cards on core operational surfaces

## Final Product Shape

After cleanup, Clubroom should feel like this:

- owners start in an operating relationship view: staffing risk, support risk, completion risk, finance exposure
- head coaches start in a supervision relationship view: follow-up pressure, standards, tasks
- coaches start in delivery and revenue reality: schedule, sessions, earnings
- parents start in the family week: calendar, recurring plans, booking trust
- athletes start in progress and upcoming work: next session, goals, badges, feedback
- admin users open narrow internal tools, not fake dashboards

The product should feel less like a broad social app and more like a relationship-aware football coaching operating system.

More plainly: it should feel like Spond for coordination and a coaching marketplace for finding, booking, rebooking, and paying for coaching.
