# Role Flow Matrix

Date: 2026-03-10
Purpose: map the product by what each user is trying to do, then flag where the experience is believable, misleading, or not yet settled.

## Coach

Primary jobs:

- present a credible professional profile
- get discovered and booked
- manage schedule, sessions, rosters, and follow-up
- run a real coaching business
- review athlete progress and safety context

Feels believable now:

- schedule and availability management
- session creation and invite flows
- booking and management flows
- earnings surface
- progress-loop style operational follow-up tools

Not right:

- coach profile relationship CTA says `Add Friend`
- the social layer reads like a consumer network more than a professional coaching relationship
- shared-injury review exists in service capability but not as a clear coach route
- auth/runtime still leans demo-first in local flows

Macro decision attached:

- is Clubroom primarily a coach business platform with light social overlays, or a social coaching network with business tools attached?

## Parent

Primary jobs:

- discover a trustworthy coach
- book for a child with confidence
- manage child safety and health information
- understand progress and communicate clearly

Feels believable now:

- booking wizard
- family dashboard/calendar/spending
- privacy settings persistence
- medical and safety surfaces

Not right:

- block semantics are not consistent across all relationship layers
- account deletion/deactivation semantics are not fully honest
- the coach relationship model is still socially ambiguous

Macro decision attached:

- should parent-to-coach connection be "follow", "save", "request contact", or some other explicit professional model?

## Athlete

Primary jobs:

- track progress
- manage health and injuries
- book sessions or respond to session context
- engage socially without unsafe leakage

Feels believable now:

- progress and badges
- health logging
- journal / development surfaces

Not right:

- social graph semantics are still mixed between follows, friends, and coach relationships
- trust boundaries for blocked users are not unified across systems

Macro decision attached:

- is athlete social a core pillar, or should athlete-facing social be intentionally constrained around development and club context?

## Club / Academy Operator

Primary jobs:

- manage organization identity
- manage membership, invites, squads, and posting
- delegate coach responsibilities clearly

Feels believable now:

- club settings and membership management are materially real
- club-owned flows and branded surfaces are present

Not right:

- academy route constants exist without academy route surfaces
- the actual operator role is implicit, not first-class
- "club" and "academy" are still half-separate concepts in planning language

Macro decision attached:

- should academy remain a separate first-class product surface, or should the org model collapse to one coherent club/organization layer?

## Internal Ops / Support / Admin

Primary jobs:

- handle support and safeguarding cases
- verify identities and credentials
- manage abuse, blocks, and escalation
- operate with auditable permissions

Feels believable now:

- some underlying service capabilities exist
- trust and verification concepts are present throughout the codebase

Not right:

- no unified operations console
- no first-class staff role model in runtime app flows
- API auth is still placeholder-backed

Macro decision attached:

- how much internal operations capability must exist before any production launch claim is honest?

## Cross-Role Truth Tests

These questions should govern planning and sign-off:

1. Does the user know what relationship they have with the other party?
2. If a setting says it changed, did it really persist?
3. If a user is blocked, is that true everywhere it should be true?
4. If an organizational role exists in routes/docs, is it real in runtime UX and permissions?
5. If a trust-sensitive flow exists in services, is it visible and understandable in the product?
6. If a script says "green", did it actually execute a real check?
