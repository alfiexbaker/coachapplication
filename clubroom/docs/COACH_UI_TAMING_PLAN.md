# Coach UI Taming Plan

## Goal
Reduce visual bulk and decision fatigue across coach-facing surfaces while preserving existing feature coverage and component reuse.

## Design rules (applies to every page)
- Keep one dominant action per viewport.
- Remove decorative copy unless it changes a decision.
- Use compact cards by default; reserve large cards for critical status.
- Cap color accents to semantic states only (success/warning/error/info).
- Keep icon usage functional; avoid novelty decoration.

## Page-by-page plan
1. Login / Register
- Tighten headline + support copy to one clear line each.
- Keep credentials helper in a compact test-account panel.
- Move secondary actions below primary auth action.

2. Development (coach home)
- Collapse quick actions into one row with max 4 visible actions.
- Keep attention list + recent sessions; reduce badge/icon weight.
- Promote unread notifications in header only.

3. Athlete Progress
- Keep hero metrics, but align action buttons to equal height and spacing.
- Reduce label verbosity in needs/notes and progression cards.
- Make session history cards denser with clearer tap target.

4. Athlete Special Needs
- Replace long prose with factual chips and counts.
- Prioritize medical risk and accommodations at top.

5. Athletes list
- Remove “needs attention” blocks from index list.
- Keep search, recency, and next session indicators.
- Ensure full-row tap opens athlete profile; plus button is only for booking actions.

6. Athlete profile tabs
- Default to a concise overview state.
- Move less-used operations into overflow action sheet.

7. Schedule (Sessions)
- Keep week strip + day detail, reduce duplicate helper text.
- Empty state should point to create session, not generic settings.

8. Schedule (Availability)
- Keep session-type chips and take-time-off.
- Keep one rules entry: Booking Rules modal (remove duplicate scheduling page entry points).

9. Booking Rules modal
- Keep only actionable controls and compact summaries.
- Cancellation policy uses `Flexible / Standard / Strict` without descriptive paragraphs.

10. Create Session flow
- Keep 3-step wizard, reduce per-step helper copy.
- Preserve reusable selectors and validation states.

11. Session Invites / RSVP
- Surface RSVP counts near top, keep response actions pinned.
- Make attendee status changes one-tap with immediate feedback.

12. Messages
- Remove bulky intro cards.
- Keep filters and conversation list first.
- Group management lives in dedicated `Manage` tab for privileged roles.

13. Club Hub + Create Club Post
- Keep composer minimal by default.
- Add optional existing-event attachment as a lightweight selector.
- Keep posting audience controls compact and role-aware.

14. Coach profile / edit profile
- Preserve existing flow; collapse non-critical metadata sections.

15. Settings
- Remove duplicate navigation destinations.
- Organize by outcomes: bookings, athletes, communication, profile.

## Delivery phases
1. Density pass: spacing/typography/card-height normalization.
2. Copy pass: remove non-decision text and redundant subtitles.
3. Interaction pass: action hierarchy + tap-target consistency.
4. Final polish: motion timing, haptics, and accessibility contrast checks.

