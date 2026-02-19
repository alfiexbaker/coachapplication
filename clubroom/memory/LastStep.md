## Current Task
**Feature**: Elevate Matches in Club Hub
**Step**: All 5 changes implemented and verified
**Files touched**:
- `components/club/club-feed-list-header.tsx` — reordered MatchesPanel above SessionsPanel
- `components/club/MatchesPanel.tsx` — added empty state, redesigned match cards with left-border accent, always-visible "View All Fixtures"
- `services/match-service.ts` — `getMatchTypeColor()` now accepts palette param, uses semantic colors
- `components/match/match-card.tsx` — updated caller to pass palette
- `components/match/match-header-card.tsx` — updated caller to pass palette
- `components/match/create-match-review.tsx` — updated caller to pass palette
- `components/match/create-match-details.tsx` — updated caller to pass palette
- `__tests__/services/match-service.test.ts` — updated test to pass mock palette
**Next**: Done — all changes verified with TypeScript compilation
**Blockers**: none
