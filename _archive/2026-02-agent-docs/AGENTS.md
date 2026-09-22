# Agent Guidance for Clubroom

These notes cover the entire repository. They are meant to maximize how we (you + Codex) work together, emphasizing psychology and collaboration over strict coding rules.

## Mandatory Startup Protocol (Every Task)
- Read `clubroom/CODEX.md` first, then `clubroom/docs/SOURCE_OF_TRUTH.md`, then relevant sprint docs.
- Treat `clubroom/CODEX.md` as the implementation and quality baseline for:
  - architecture standards
  - UI interaction standards (including in-app alerts over native popups)
  - verification gates
  - git commit discipline
- If guidance conflicts, resolve in this order:
  1. User instruction in current thread
  2. `clubroom/CODEX.md`
  3. `clubroom/docs/SOURCE_OF_TRUTH.md` and active sprint docs

## How to get the best outcomes
- **Anchor to the vision**: Before changing code, reread `docs/SOURCE_OF_TRUTH.md` and sprint plans. Frame every change as an extension of something that already exists—avoid inventing net-new features when you can build on current flows.
- **Think in spines**: Map work to the four product spines (Community, Booking/Revenue, Development, Trust/Ops) to keep crossover clear and avoid duplicated flows.
- **State intent explicitly**: Describe the goal, constraints, and acceptance criteria in your notes/PRs so downstream agents stay aligned and avoid rework.
- **Prefer reuse over reinvention**: Extend existing patterns, components, and data models before adding new ones. If you must create something new, note why reuse was insufficient.
- **Keep code concise and composable**: Small, reusable modules and clean naming beat large bespoke code. Remove dead code as you touch areas.
- **Narrate decisions**: Capture trade-offs and rationale in commit/PR messages to reduce ambiguity for the next contributor.

## Collaboration habits
- **Minimize surprise**: If a change affects multiple roles or spines, call it out early and trace dependencies (UI, data, feature flags).
- **Psychological safety for reviewers**: Keep diffs scoped, add before/after context, and flag any assumptions. Leave TODOs only when paired with a follow-up note.
- **Testing mindset**: Run targeted checks when possible; if you skip tests, say why. Prefer deterministic fixtures over ad-hoc mock data.
- **Doc-first when ambiguous**: Update the relevant doc (vision/sprint/technical) before or alongside code so intent is searchable.

## Defaults to remember
- Build off existing features whenever possible; avoid creating parallel flows.
- Maintain concise standards and reusability throughout the codebase.
- When in doubt, ask: "Does this make it easier to book a coach, track development, or grow a coaching business?"

## Recent Refactoring (January 2026)

A major codebase consolidation was completed. Key points for agents:

### Service Consolidation
- **Invites**: Use `invite-service.ts` (not session-invite, bulk-invite, or squad-bulk-invite - these were deleted)
- **Progress**: Use `progress-service.ts` for goals, session notes, and skill tracking (goal-service and session-notes-service were merged in)
- **Video**: Use `video-service.ts` for both videos AND annotations (annotation-service was merged in)
- **Family**: Use `family-service.ts` for family members AND guardian sharing (family-sharing-service was merged in)
- **Scheduling**: Use `scheduling-rules-service.ts` for rules AND cancellation policies (cancellation-policy-service was merged in)

### Booking Creation
**ALL booking creation MUST go through `bookingService.createBooking()`**. There is now a single path:
- Invite acceptance → calls bookingService.createBooking()
- Recurring bookings → calls bookingService.saveBookingDirect()
- Direct booking → calls bookingService.createBooking()

### Component Imports
- Use `/components/ui/booking/` for booking wizard components (not /components/booking/ - deleted)
- All component folders now have `index.ts` exports for cleaner imports
- Example: `import { StatusBadge } from '@/components/ui'`

### Storage Keys
- All 74 storage keys are documented in `/clubroom/constants/storage-keys.ts`
- Use the centralized constants instead of hardcoding strings

For full details, see `CODEBASE_AUDIT_REPORT.md`.
