# Parent Badge Visibility & UI Linkup Plan

## Current behavior (code scan)
- **Parent development screen filters for supporter-visible awards only.** When a child is selected, `listAwardsForAthlete` results are filtered to exclude `coach_only` badges, and a coach-only count is shown separately to the parent.
- **Shared badge strip shows recently shared awards.** Shared badges render badge label, date, reason, and optional note in the "Shared badges" row.
- **Badge log surfaces parent-visible history.** The badge log lists all supporter-visible awards with reason pills, shared/visibility state, optional note, and a session link indicator.
- **Badge creation respects visibility and sharing.** Awards default to athlete visibility unless set otherwise, and the service records `visibility`, `shared`, and cooldown bypass metadata when awarding.

## Gaps and risks
- Parents do **not** see coach-only badges—only a count—so there is no parent notification or detail for those awards.
- Parent awareness depends on the `shared` flag being set; there is no explicit parent notification flow or badge receipt confirmation.
- Supporter-facing surfaces are limited to the Development screen; there is no dedicated badge inbox, feed card, or cross-entry from session history.
- No explicit differentiation between newly awarded vs. historic badges for parents (no "new" badge indicator or unread state).

## 10-stage UI linkup plan
1. **Badge receipt banner**: Add a transient in-app banner/toast on the parent home or Development tab when a supporter-visible badge is added for a child (fire on `shared` flag).
2. **Unread badge state**: Track per-child unread badge IDs and surface a dot/count on the Development tab and child tabs until the parent views the log.
3. **Session detail hooks**: On the parent session detail screen, render any badges linked to that session with share state, linking back to the log for full context.
4. **Badge log deep links**: Enable deep linking into a specific badge entry from notifications or session detail, auto-scrolling to the entry and marking it read.
5. **Parent notification settings**: Add a simple settings toggle in Profile > Notifications to opt into badge alerts (push/email/SMS), defaulting on for supporters.
6. **Badge receipt feed card**: Surface recent shared badges in the parent Home feed with coach note snippets and CTA to praise/reply, keeping it modular so the same card renders in the log.
7. **Coach-only clarity**: On the coach-only count chip, add a tooltip explaining why certain badges are hidden and how to request visibility, reducing confusion.
8. **Child switch persistence**: Persist the last selected child in storage so returning parents land on the same child's badges/log, easing navigation.
9. **Accessibility + responsive pass**: Ensure badge cards wrap on small screens with accessible labels (screen readers) and focus order matching visual layout.
10. **Analytics + guardrails**: Instrument parent badge opens, deep-link hits, and unread-to-read transitions; add a server-side visibility check to prevent accidental supporter exposure.

## Modularity guidance
- Reuse the existing `SurfaceCard`, `ThemedText`, and pill patterns in `ParentDevelopmentScreen` to avoid new bespoke components.
- Extend `badgeService` to handle unread tracking and visibility checks rather than adding parallel stores.
- Prefer prop-driven badge card components that can render in both the shared strip and the log feed.
- Keep navigation simple: reuse existing routes (Development, Session Detail, Home feed) with contextual entry points instead of adding new tabs.
