# Forms & Modals Sprint 5: In-App Alert Migration

**Date**: 2026-03-04  
**Scope**: Trust/Ops + Booking/Revenue + Community + Development  
**Goal**: Replace native `Alert.alert` usage with a consistent in-app popup system, starting with bilateral booking flows and then migrating app-wide.

---

## Why this sprint exists

Native alerts break flow continuity and feel disconnected from Clubroom's UI language.

For bilateral booking, this hurts both roles:
- Coaches: confirmation and failure states feel abrupt, less trustworthy, and harder to scan when handling many actions.
- Parents/Athletes: booking and invite decisions feel "system-level" instead of part of a guided journey.

This sprint introduces a reusable in-app popup primitive and a phased migration plan to remove native alerts safely.

---

## Current baseline (2026-03-04)

`rg "Alert\\.(alert|prompt)" app hooks components` shows:
- Total calls: `544`
- Hooks: `319`
- Components: `116`
- App routes: `109`

Top concentration files:
- `hooks/use-session-detail-modal.ts` (`18`)
- `hooks/use-group-session.ts` (`17`)
- `hooks/use-create-session.ts` (`16`)
- `app/session-invites/[id].tsx` (`15`)

---

## Delivered in this sprint start (Booking/Revenue first)

Implemented now:
- New shared in-app popup system:
  - `components/ui/app-alert.tsx`
  - `AppAlertProvider`
  - `useAppAlert()` with:
    - `showAlert(title, message, buttons?)`
    - `confirm({...})`
- Root provider wiring:
  - `app/_layout.tsx`
- Export in UI barrel:
  - `components/ui/index.ts`

Migrated from native alert to in-app popup in bilateral booking/discover flow:
- `hooks/use-session-detail-modal.ts`
- `hooks/use-group-session.ts`
- `hooks/use-bookings.ts`
- `hooks/use-bookings-discover.ts`
- `hooks/use-discover-sessions.ts`

This covers:
- Booking validation prompts
- Register/cancel confirmations
- Discover invite decline confirmations
- Booking/session management success and error popups

---

## Product behavior target

All popup interactions should feel like one system:
- Same spacing, typography, action hierarchy, and dismissal behavior
- Same action semantics across roles
- No native OS alert surfaces in core journey flows

### Popup types to support

1. Informational
- Single action (`OK`)
- Used for success, non-destructive notices, validation feedback

2. Confirm
- Cancel + primary action
- Used for accepts/declines, submit decisions, irreversible navigation

3. Destructive confirm
- Cancel + destructive action
- Used for cancels, deletions, session-ending actions

4. Prompt replacement
- Replace `Alert.prompt` with explicit in-app input sheet/modal
- No native prompt usage in product flows

---

## Migration plan (phased)

## Phase 1: Booking backbone (Now)
- Replace all native alerts in:
  - discover -> booking entry
  - booking detail actions
  - group session register/unregister/cancel
  - invite decline/decision actions in booking surfaces

Exit criteria:
- No native alerts in bilateral booking/discover hooks
- All destructive actions still require explicit confirmation

## Phase 2: Session invites + recurring + create-session
- Target files with highest booking-domain counts:
  - `app/session-invites/*`
  - `hooks/use-create-session.ts`
  - recurring/session creation helpers

Exit criteria:
- Invite acceptance/decline/counter/review paths all in-app popup based
- Recurring edits/cancellations use consistent confirmation hierarchy

## Phase 3: Trust/Ops and safety-critical flows
- Verification, safeguarding, emergency, medical, account deletion/deactivation

Exit criteria:
- High-stakes actions have destructive style + explicit copy
- Accessibility roles/labels verified for screen readers

## Phase 4: Community + development + long-tail
- Remaining hooks/components/app routes
- Remove fallback native alert usage from shared flows

Exit criteria:
- `Alert.alert` usage reduced to near-zero
- Any intentional native usage documented with rationale

---

## Booking flow options: where they should be shown

Within bilateral booking paths:

1. Discover card tap
- Show session detail modal (already in place)
- CTA should route into booking wizard, not instant-book

2. Invite decisions
- In-app popup confirm for decline/irreversible actions
- Surface in:
  - Discover feed pending invites
  - Discover sessions pending invites
  - Bookings pending invites section

3. Group/club session register
- Show review popup before register/waitlist join
- Show confirmation/error popup after action

4. Session/bookings management
- Destructive confirmations for cancel/end-series/reassign-impact actions
- Success popup should be concise and not block next likely action

---

## Metrics and sub-metrics

## Adoption metrics (implementation)
- `A1` Native alert count
  - Sub: total `Alert.alert`
  - Sub: total `Alert.prompt`
  - Sub: count by spine (Booking, Community, Development, Trust/Ops)
- `A2` In-app popup coverage
  - Sub: `% of migrated callsites using useAppAlert`
  - Sub: `% of destructive actions using destructive style`

## UX consistency metrics
- `U1` Popup action hierarchy consistency
  - Sub: `% dialogs with cancel + primary order matching design`
  - Sub: `% destructive dialogs with destructive tone`
- `U2` Copy quality
  - Sub: `% dialogs with role-specific copy`
  - Sub: `% dialogs including concrete subject (session/invite/child)`

## Booking reliability metrics
- `B1` Drop-off at confirmation steps
  - Sub: discover detail -> booking wizard continue rate
  - Sub: register review popup confirm rate
- `B2` Error recoverability
  - Sub: action retries after error popup
  - Sub: eventual success after first error popup

## Performance metrics
- `P1` Popup render latency
  - Sub: open latency p50/p95
  - Sub: dismiss latency p50/p95
- `P2` Queue reliability
  - Sub: dropped popup rate
  - Sub: duplicate popup rate

## Accessibility metrics
- `X1` Screen reader compatibility
  - Sub: title announced
  - Sub: message announced
  - Sub: buttons reachable in logical order
- `X2` Input safety
  - Sub: back button close behavior parity
  - Sub: focus return target after dismissal

---

## Acceptance criteria

Functional:
- All bilateral booking/discover flows use in-app popup (no native alert)
- Confirm/destructive actions preserve prior behavior and side effects
- Popup queue handles back-to-back actions without dropping messages

Design:
- Visual style aligns with existing Clubroom modals/cards
- Button sizing and spacing remain legible on small devices (iPhone SE class)

Accessibility:
- Popup has alert semantics and clear action labels
- Back button and close behavior deterministic

Reliability:
- No regressions in booking, invite, or group registration outcomes
- Compile + targeted lint + targeted flow tests pass

---

## Risks and mitigations

Risk: behavior drift during large-scale replacement  
Mitigation: migrate by spine + keep action copy and callback semantics unchanged per callsite.

Risk: missing destructive confirmation in conversion  
Mitigation: migration checklist requires explicit action style mapping (`cancel/default/destructive`).

Risk: popup fatigue from overuse  
Mitigation: classify calls into popup vs toast vs inline validation; avoid converting transient notices that should be toast.

---

## Execution checklist

- Build shared popup primitive and provider
- Wire provider in root
- Migrate booking/discover flows
- Add lint rule / codemod guideline for new native alert additions
- Migrate high-count files by phase
- Track metric deltas weekly until near-zero native usage

---

## Definition of done

- `Alert.alert` removed from all critical booking/invite/session flows
- `Alert.prompt` removed from product paths and replaced with in-app input UI
- Remaining native usages are either:
  - platform-specific technical exception, or
  - explicitly documented with rationale and owner
