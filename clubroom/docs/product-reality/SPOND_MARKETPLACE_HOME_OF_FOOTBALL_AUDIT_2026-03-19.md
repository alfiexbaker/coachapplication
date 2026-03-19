# Spond + Marketplace + Home Of Football Audit

Date: 2026-03-19
Purpose: define what Clubroom must become to feel like a coherent football product instead of a partial club tool, partial marketplace, and partial development app.

## North Star

Clubroom should become:

- `Spond` for football operations
- a football `marketplace` for discovery, trust, booking, and coach revenue
- a `home of football` product for identity, belonging, fixtures, media, and return frequency

Interpretation note:

- this audit treats `home of football` as a OneFootball-like football home layer
- that means football identity, content, fixtures, results, and club-following depth
- it does not mean cloning a generic social network

Official reference points used for this audit:

- Spond Club and app event/help docs:
  - https://help.spond.com/club/en/articles/178763-managing-club-events-in-spond-club
  - https://help.spond.com/club/en/articles/174499-overview-of-app-events-in-spond-club
  - https://help.spond.com/app/en/articles/129730-features-of-events
  - https://help.spond.com/app/en/articles/273302-events
  - https://help.spond.com/app/en/articles/129968-payment-for-events
- OneFootball company/product positioning:
  - https://company.onefootball.com/
  - https://business.onefootball.com/

## Executive Verdict

Current Clubroom is strongest as:

- a football-specific multi-role coaching app
- a parent and athlete development tracker
- a partially credible coach and club operating product

Current Clubroom is weakest as:

- a first-class club event and activity operating system
- a polished marketplace conversion engine
- a football home product that people return to even when they are not actively booking

In short:

- `development`: strong direction
- `marketplace`: partial
- `club ops`: partial
- `football home`: weak
- `production truth and smoothness`: still transitional

## Scorecard

| Pillar | Target Standard | Current Clubroom | Verdict |
|---|---|---|---|
| Club operating system | Activities, events, matches, attendance, reminders, comms, payments, reporting | Club activity read model exists, but event operations are shallow and fragmented | Partial |
| Marketplace | Discovery, trust, booking, conversion, rebook, program sales, commercial clarity | Good foundation, but trust and conversion loops are still uneven | Partial |
| Football home | Personalized football home, club identity, fixtures, results, creator/media return loops | Updates/feed exists, but no real football-home layer | Weak |
| Development | Session follow-up, progress, badges, video, role-aware outcomes | Strongest differentiator already in repo | Strong |
| Trust and authority | Backend-owned sensitive flows, clear authz, role integrity | Improved, but auth identity and invite seams remain | Partial |
| Smoothness and reliability | Fast, stable, no confusing reload churn, honest states | Some slices improved, but still inconsistent | Partial to weak |

## What We Already Have That Matters

These are real strengths and should be preserved, not rewritten away:

1. Football-only scope
   - The product already feels more football-native than generic sports-admin software.
2. Multi-role model
   - Coaches, parents, athletes, and clubs are already first-class surfaces.
3. Development spine
   - Progress, badges, notes, feedback, and health are deeper than typical team-admin tools.
4. Club/commercial truth
   - The repo already has meaningful work around org ownership, staffing, assignment, and commercial mode.
5. Match operations
   - Availability requests, lineup, and result tracking already exist.
6. Club activity read model
   - `ClubEvent` and `GroupSession` are no longer totally separate in club-facing reads.
7. Mixed-access training concept
   - Club-only, squad-only, and club-plus-outsiders is a strong football-commercial concept.

## Where The Product Is Broken Against The Goal

### 1. Club activities are not the operating center yet

Current reality:

- `Club Hub` is still a mixed staff screen, not a true activity center.
- non-staff users are redirected away from `Club Hub`.
- the club page leads with updates, not activities.
- dedicated events exist, but they are not the obvious club operating entrypoint.
- event list/create flows still rely on hardcoded default club ids in places.

What this means:

- users cannot think "everything the club is doing lives here"
- events, training, and matches still feel like separate product worlds
- the current `ClubActivity` model is useful, but it is still too UI-thin

### 2. Events are records, not workspaces

Spond-level behavior treats an event as the place where you operate the activity:

- responses
- reminders
- attendance
- payments
- comments/messages
- recurring planning
- visibility and audience rules

Current Clubroom events cover only part of that:

- create
- publish
- RSVP
- attendance
- cancel
- some reminder behavior

Missing or too weak:

- event-native thread or comments
- files and attachments around the event
- event-native tasking and volunteer assignment
- club-level overview and filters that feel operational
- attendance export/reporting depth
- waitlist and promotion for events
- club-safe payments tied to the event

### 3. Matches are strong, but isolated

Current repo strength:

- match creation
- availability requests
- lineup selection
- result recording

Current repo weakness:

- matches are not first-class inside the unified club activity model
- club users do not get one schedule view where event, training, and match belong together
- post-match media, recap, and development follow-through are not presented as one activity lifecycle

### 4. Marketplace is present, but not yet ruthless enough

The marketplace side needs to feel commercially sharp:

- discover the right coach or club offer
- understand who owns the relationship
- trust the pricing, cancellation, and support chain
- book quickly
- rebook easily
- buy into programs, packs, and longer-term development

Current Clubroom has meaningful progress here, but the product still leaks too much transitional truth:

- backend authority is not complete
- trust-critical invite and auth seams remain
- profile/storefront conversion is still lighter than it should be
- booking changes and delegated flows are still partly transitional

### 5. The football-home layer barely exists

If the app wants return frequency outside booking/admin actions, it needs a real football home.

Current state:

- there is `Updates`
- personal posts and club posts exist
- club pages exist
- profile posts exist

What is missing:

- a personalized football home that makes people open the app daily
- fixtures/results/media identity on the home surface
- club and squad storylines
- local football discovery beyond booking
- creator/editorial/official-club media rhythm

Right now the social/feed layer is too generic to be compelling and too shallow to be a home.

### 6. Too many objects are still allowed to float free

The app still has too many flows that are not anchored to a strong football object.

The target product should be built around:

- `Club`
- `Squad`
- `Coach`
- `Athlete`
- `Activity`
- `Offer`
- `Booking`
- `Progress record`
- `Update`

The rule should be:

- posts belong to a person, club, squad, or activity
- progress belongs to delivery and athlete development
- payments belong to booking, program, or activity participation
- communication belongs to a club, thread, booking, or activity

Free-floating generic social features should be cut or demoted.

## What The Product Needs

## 1. One graph, three surfaces

Clubroom needs one shared football graph powering three clear user surfaces:

1. `Club OS`
   - club owners, staff, squads, activities, attendance, finance, reporting
2. `Marketplace`
   - coach and club offers, trust, booking, conversion, rebooking, recurring offers
3. `Football Home`
   - personalized feed, fixtures, results, club media, coach media, athlete progress highlights

Those surfaces should share the same underlying objects, not fork into separate products.

## 2. Extend `ClubActivity` into the true activity spine

Current `ClubActivity` is the right direction, but too small.

It should become the top-level activity spine for:

- informational events
- training sessions
- matches
- trial days
- camps and clinics
- club programs and recurring activity instances

Every activity should carry:

- owner context: club, squad, coach
- participation mode: none, RSVP, registration, selection
- access mode: club, squad, public, mixed, private
- commerce mode: free, paid, included, invoice, membership
- communications: reminders, thread, files, recap
- outcomes: attendance, result, completion, follow-up, media

Current limitation:

- the repo still splits `ClubEvent`, `GroupSession`, and `Match`
- this is acceptable at storage level for now
- it is not acceptable at product-language level

## 3. Split the product cleanly by intent

The product should feel intentional:

- `Home`: football home and personal relevance
- `Activities`: what your clubs, squads, and coaches are doing
- `Sessions` or `Bookings`: your commitments and commercial interactions
- `Progress`: athlete development and post-session value

Current issue:

- too many club/event functions are hidden under feed, admin, or detached routes
- the user does not get one obvious place for "football life"

## 4. Treat communication as attached, not generic

The product should not grow a generic friendship social network.

It should instead attach communication to:

- activity
- club
- squad
- booking
- coach profile
- athlete development

This is closer to both Spond usefulness and football-native behavior.

## 5. Finish the commercial story

Marketplace quality means:

- clear offer pages
- clear club vs independent ownership
- clear price and payment expectations
- fast booking
- rebook loop
- package/program upsell
- trust-critical backend ownership

Without this, the app feels like a promising demo instead of a serious football business platform.

## 6. Build a football-return loop

To become a home of football, users need reasons to return between bookings.

That loop should come from:

- fixtures
- results
- club updates
- training recaps
- player development highlights
- coach insights
- media tied to sessions and matches
- local football identity and belonging

It should not come from generic social clutter.

## What To Remove Or Demote

These should be reduced, hidden behind football context, or removed entirely:

1. Generic social graph residue
   - friend-request style behaviors that are not central to football workflows
2. Generic community-group patterns
   - if a group is not a club, squad, staff circle, or private football cohort, it should not lead the product
3. Feed-first club UX
   - club pages and hub surfaces should not bury activities under updates
4. Detached event routes with weak context
   - club events should not feel like a side app
5. Hardcoded seed or default club assumptions
   - these make the app feel fake immediately
6. Placeholder/demo walkthrough residue on real user paths
7. Duplicate language for the same football action
   - event, activity, session, invite, booking, and match should each have explicit meaning

## Where Clubroom Should Beat Spond

Clubroom should not try to win by copying Spond feature for feature.

It should beat Spond in these areas:

1. Football-specific development
   - badges, progress, coach feedback, post-session outcomes, media-backed improvement
2. Marketplace plus club hybrid model
   - independent coach work and club/program work in one system
3. Mixed-access football training
   - club-only, squad-only, and club-plus-outsider training should be a first-class commercial model
4. Coach storefront quality
   - marketplace trust and conversion should be much stronger than team-admin tools
5. Development-to-booking loop
   - progress should create rebooking, retention, and upsell opportunities

## Current Sprint Examination

## Existing backlog is necessary but not sufficient

Current retained backlog:

- `API-01`
- `AUTH-02`
- `OBS-01`
- `DX-01`
- `GOV-01`

These are correct, but they mostly protect product truth and platform integrity.

They do not yet define the product work needed to reach the north star.

### Backlog audit

| Current item | Why it matters | Why it is not enough on its own |
|---|---|---|
| `API-01` | makes trust-sensitive and commercial flows real | does not define the club activity operating model or football-home layer |
| `AUTH-02` | fixes identity and authz truth | does not improve activity discoverability, event depth, or marketplace conversion |
| `OBS-01` | required for release confidence and glitch tracking | does not itself make the app compelling |
| `DX-01` | keeps validation honest | internal quality only |
| `GOV-01` | protects club visibility and permissions | necessary for club ops, but not sufficient for product experience |

## Proposed sprint sequence

This is the smallest believable path to the target product.

### Phase 0: Truth and stability

#### `FDN-01` Finish backend authority for the remaining booking and invite seams

Goal:

- finish session-invite read/acceptance authority
- remove app-first drift in booking-adjacent changes

Changes:

- backend-authoritative session invites
- backend-owned delegated booking mutations
- consistent authz and audit behavior

Done when:

- booking and invite truth no longer depends on local mirror state

#### `FDN-02` Smoothness and observability pass

Goal:

- make the app feel fast and stable enough for frequent daily use

Changes:

- instrument Sentry across Expo and API
- remove reload churn and over-refresh patterns
- replace long non-virtualized lists on heavy surfaces
- tighten image and video loading behavior
- audit stale or duplicated screen fetch loops

Done when:

- the main surfaces feel consistent under normal club, parent, and coach usage

### Phase 1: Spond parity for football operations

#### `ACT-01` Build a first-class Activities center

Goal:

- make `Activities` the primary club operating surface

Changes:

- add a dedicated club activities route and entrypoint
- stop burying activities under feed-first layouts
- extend `ClubActivity` to include `Match`
- give staff and members one coherent schedule surface

Done when:

- a club user can answer "what is this club doing?" from one obvious place

#### `ACT-02` Turn events into workspaces

Goal:

- upgrade event detail from brochure to operating surface

Changes:

- event thread/comments
- event files/attachments
- reminders and response management
- attendance workflow depth
- payment collection hooks where relevant
- role-aware event management actions

Done when:

- a coach or club admin can run a real event from inside the event screen

#### `ACT-03` Unify match operations into the activity spine

Goal:

- stop matches from feeling like a separate product

Changes:

- include matches in club activity projections
- show availability, lineup, and result state inside club activity flows
- connect match recap and media into updates and progress

Done when:

- club schedule, event schedule, and match schedule feel like one football calendar

#### `ACT-04` Add payments, waitlists, and reporting parity

Goal:

- close the gap between event registration and actual club operations

Changes:

- event payments or invoice links
- event waitlist behavior
- attendance export/reporting
- paid activity summary for clubs

Done when:

- paid and capacity-limited activities can be operated end to end

### Phase 2: Marketplace quality

#### `MKT-01` Rebuild coach and club storefront clarity

Goal:

- make profiles and offers convert like a serious marketplace

Changes:

- clearer trust signals
- clearer club-vs-independent ownership
- better offer presentation
- stronger conversion and contact actions

Done when:

- the booking path is understandable without insider knowledge of the model

#### `MKT-02` Tighten booking conversion and rebook loops

Goal:

- improve commercial conversion and retention

Changes:

- faster booking entry
- better post-session rebook prompts
- pack/program upsell
- clearer cancellation and reopen expectations

Done when:

- the app supports one-off booking, repeat booking, and program enrollment cleanly

#### `MKT-03` Make club and program offers first-class

Goal:

- let clubs sell football activity, not only announce it

Changes:

- club program pages
- recurring training offers
- mixed-access club training offers
- clearer capacity and admission rules

Done when:

- a club can run free, paid, closed, and mixed-access football activity from one commercial model

### Phase 3: Home of football

#### `HOF-01` Build a personalized football home

Goal:

- give users a reason to open the app even when they are not booking

Changes:

- personalized home based on followed clubs, squads, coaches, athletes, and upcoming activities
- fixture/result modules
- recap and progress highlights
- role-aware football cards instead of generic feed blocks

Done when:

- opening the app feels like opening football life, not just a utility app

#### `HOF-02` Make updates a football media layer

Goal:

- turn updates into football objects with context

Changes:

- activity-linked posts
- match recap posts
- training media and coach insight posts
- club and squad storylines

Done when:

- updates feel attached to football reality, not generic posting

#### `HOF-03` Build local football identity

Goal:

- make the app feel like a football network, not just admin software

Changes:

- club identity surfaces
- squad identity surfaces
- local football discovery
- creator and official media support where rights allow

Important constraint:

- start with club-owned and coach-owned content
- do not promise a licensed global media product without rights

Done when:

- club, squad, and coach identity feel alive between operational tasks

### Phase 4: Release quality and trust

#### `REL-01` Finish auth, permissions, and auditability

Goal:

- ensure the target product remains trustworthy as it gets more connected

Changes:

- production-grade auth
- role-safe club and staff permissions
- auditable sensitive actions

Done when:

- clubs and families can trust the platform with real operational and sensitive data

#### `REL-02` Quality bar for a daily-use app

Goal:

- prevent the app from feeling glitchy or provisional

Changes:

- performance budgets for heavy screens
- list virtualization and image discipline
- route and refresh audits
- release observability and error budgets

Done when:

- the app is smooth enough for coaches and families to use repeatedly in-season

## Recommended sequencing

If the goal is serious product lift, the order should be:

1. `FDN-01`
2. `FDN-02`
3. `ACT-01`
4. `ACT-02`
5. `ACT-03`
6. `MKT-01`
7. `MKT-02`
8. `HOF-01`
9. `HOF-02`
10. `REL-01`

Then:

- `ACT-04`
- `MKT-03`
- `HOF-03`
- `REL-02`

## Product Rules To Hold

1. One football object, one meaning.
2. One action, one intent.
3. Club activity is the top-level schedule concept.
4. Match is an activity subtype, not a detached world.
5. Updates attach to football objects.
6. Marketplace truth must be commercially and trust-wise explicit.
7. Do not grow a generic social network.
8. Do not ship rights-dependent football media claims without the rights.
9. Sensitive flows move toward backend authority, never back toward mock-first ownership.

## Bottom Line

To reach `Spond + Marketplace + Home of Football`, Clubroom does not need a random pile of more features.

It needs:

- one coherent football activity spine
- one sharper marketplace conversion model
- one football-home layer that creates daily relevance
- one trustworthy backend and permission model
- one higher smoothness bar

The good news is that the repo already contains strong raw material.

The missing step is product consolidation:

- stop treating club ops, marketplace, and football-home behavior as adjacent features
- start treating them as one connected football operating system
