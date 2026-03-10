# Open Decisions

Date: 2026-03-10
Purpose: macro product questions that should be discussed before implementation sprints lock in the wrong shape.

## 1. Coach Relationship Model (Planning Locked)

Current problem:

- coach surfaces currently use friend language through the follow service

Decision:

- keep `friend` out of coach-facing marketplace surfaces
- use a professional relationship model:
  - `Follow Coach`
  - `Save Coach`
  - `Request Contact`
  - `Message` only after a defined trust threshold

## 2. Social Graph Scope

Question:

- is Clubroom building a symmetric social network, or an asymmetric trust graph around coaching and clubs?

Current problem:

- the app mixes user-to-user friendship ideas with coach-following and feed aggregation

Recommendation:

- treat social as asymmetric by default
- only introduce true peer friendship where it is explicitly a product goal and safe

## 3. Org Model (Planning Locked)

Current problem:

- route constants and planning language imply a separate academy product, but the shipped route tree does not
- the real business need is a top-down organization pyramid, not a branded club page

Decision:

- one org model
- hierarchy:
  - Owner
  - Admin / Ops
  - Head Coach / Director
  - Coach
  - Assistant
- `academy` can remain a label or org subtype later, but not a separate ghost architecture now

Open sub-decisions:

- whether V1 supports only org-level commercial mode or also per-session overrides

Working rule now:

- coaches can operate independently while inside an org
- the org owner chooses the org's commercial mode
- commercial mode should be explicit in booking, payouts, refunds, and reporting
- no per-session commercial override in V1 unless a later sprint proves it is necessary

## 4. Coach Access To Athlete Health

Question:

- should coaches have a first-class shared-health view for injuries and restrictions?

Current problem:

- the service layer suggests yes
- the routed product does not make that workflow explicit

Recommendation:

- either ship a clear coach shared-health route
- or remove the implied capability from the near-term product story

## 5. Account Lifecycle Honesty

Question:

- do we want real deactivation/deletion flows now, or explicitly request-based copy with no fake success?

Current problem:

- the settings surface mixes real profile updates with placeholder lifecycle actions

Recommendation:

- prefer honest request-state UX over fake completion
- if an action only creates a deletion request, say exactly that

## 6. Demo Mode Default

Question:

- should demo/mock mode remain the default runtime for local work?

Current problem:

- it improves local convenience but weakens release-truth confidence

Recommendation:

- keep demo mode available
- stop making it the implicit default for release-significant checks

## 7. Product Center Of Gravity

Question:

- what wins when tradeoffs appear: marketplace growth, coach business tooling, development tracking, or social/community?

Current problem:

- the codebase currently tries to serve all four at once

Recommendation:

- default product ordering for the next planning cycle:
  1. org operating model + coach business + booking trust
  2. family/athlete development trust
  3. org operations
  4. social/community as supporting layer, not governing model
