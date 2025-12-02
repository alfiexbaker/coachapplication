# Sprint 4: Badges Inside Clubs

**Intent**: Turn badges into social fuel inside clubs—easy to issue, visible in feed/chat, and tied to sessions/objectives—so parents, players, and coaches feel rewarded and keep returning.

## Why this matters
- Badge issuance is a positive feedback loop that keeps players motivated and parents engaged.
- Club-level issuance must respect privacy/visibility while staying anchored to sessions/objectives for analytics.
- Badges should propagate through the same social surfaces (feed/chat/roster) to avoid fragmentation.

## Primary user journeys (mocked)
- **Coach** issues badge from roster row or chat composer to an individual or squad, attaches session/objective, sets visibility (athlete + parent vs coach-only), and adds a note.
- **Parent/Player** sees badge activity in feed and chat chips, taps into detail, and can share/react while respecting visibility.
- **Owner/Admin** reviews badge history per squad, filters by issuer/type, and exports/share highlights to development hub.

## Build scope
- Badge hub entry points: club home quick link, roster action menu, chat composer shortcut, and feed composer template.
- Issuance form: recipients (individuals/squad), badge type, session/objective link, note, visibility toggle, optional expiry, and immediate share to feed/thread.
- Display surfaces: feed cards with badge chips, chat bubbles with badge preview, roster rows showing latest badge, and development tab deep links.
- State handling: pending issuance (optimistic), visibility-respecting rendering, unread/share indicators, and undo within short window.

## Integration & constraints
- Badges remain tied to sessions/objectives; squad-level issuance must allow selecting an objective stub if no session exists.
- Respect supporter/parent visibility rules from `badge-parent-visibility.md`; ensure parent-facing views match Home/Development displays.
- Reuse existing reactions/comments components for badge feed cards; no bespoke rendering.

## Interlocks & FB-grade behaviors
- Issuing a badge posts a highlight to feed (Sprint 2) with reactions and comments; recipients see it pinned in club home (Sprint 1).
- Badge eligibility draws from roles/attendance (Sprint 3) and can be attached to session outcomes (Sprint 5) for automatic suggestions and follow-ups.
- Safety review (Sprint 6) requires audit trails on who issued/revoked badges; blocked users cannot issue or be showcased.
- Analytics (Sprint 7) captures badge issuance, reactions, and profile views to inform streaks and "most active" tiles.

## Acceptance criteria
- Coach can issue badges from roster or chat with recipients, session/objective link, note, and visibility set; optimistic updates show immediately.
- Badge activity appears in feed and chat with correct visibility and unread/share indicators; roster shows latest badge per member.
- Parent/supporter views respect visibility; blocked users see restricted messaging.
- Error/retry flows exist for issuance and display when mock adapters fail.
