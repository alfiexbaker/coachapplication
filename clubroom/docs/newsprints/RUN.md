# Sprint Run Prompts

Copy-paste any prompt below into Claude Code to run that sprint.

**Every sprint has 3 phases**: Implement → Review → Log.

---

## Recommended Order

Run Sprint 1s first (launch blockers), then Sprint 2s (pre-launch), then 3-4s (polish).

---

## Review Protocol (built into every prompt)

After implementing all fixes, the agent MUST spawn a review sub-agent that:

1. **Re-reads every file touched** — verify the code actually matches what the sprint asked for
2. **Runs `npx tsc -p tsconfig.test.json`** — zero type errors
3. **Checks the 12-point review** against each changed file:
   - No `any` types introduced
   - No hardcoded colors (must use `useTheme()` → `colors.*`)
   - No hardcoded routes (must use `Routes.*`)
   - No raw `View` with `flexDirection: 'row'` (must use `Row`/`Column`)
   - No `Pressable` (must use `Clickable`)
   - No `TouchableOpacity` (must use `Clickable` or `Button`)
   - No `toast.error()`/`toast.success()` (must use `showToast(message, tone)`)
   - `useCallback` on all handler props passed to children
   - `memo()` on FlatList `renderItem` components
   - All money amounts in GBP with `£` symbol (never `$` or `USD`)
   - `Result<T, ServiceError>` pattern used (check with `result.success`, not `.ok`/`.isOk`)
   - `ServiceErrorCode` values are only: `NOT_FOUND | VALIDATION | NETWORK | STORAGE | UNAUTHORIZED | CONFLICT | RATE_LIMITED | UNKNOWN`
4. **Checks for regressions** — did any existing functionality break?
5. **Updates `docs/newsprints/DONE.md`** — mark sprint row with status, date, fix count, TSC result, review pass/fail, and notes

If review finds issues: fix them before marking DONE. If a fix can't be completed, mark PARTIAL with notes.

---

## The Prompt

Every sprint below uses the same structure. Just swap the file path.

```
Read docs/newsprints/{category}/{sprintN}.md and implement every fix described in it.

RULES:
1. Follow CLAUDE.md conventions — zero exceptions.
2. After ALL fixes are implemented, run: npx tsc -p tsconfig.test.json
3. If TSC fails, fix the errors before proceeding.
4. Then spawn a review agent (Task tool, subagent_type: Explore) with this prompt:

   "Review every file touched in this sprint. For each file:
   (a) Re-read the file.
   (b) Check: no `any`, no hardcoded colors/routes, no raw View+flexDirection, no Pressable/TouchableOpacity, useCallback on handler props, memo on renderItem, GBP £ not USD $, Result pattern uses .success not .ok, ServiceErrorCode valid, showToast(msg, tone) not toast.error().
   (c) Verify the fix matches what the sprint file asked for — not just compiles, but actually correct.
   (d) Flag anything that looks wrong or was missed."

5. Fix anything the reviewer flags.
6. Run npx tsc -p tsconfig.test.json one final time.
7. Update docs/newsprints/DONE.md — fill in the row for this sprint:
   - Status: DONE or PARTIAL
   - Date: today
   - Fixes: X/Y (landed/total)
   - TSC: PASS or FAIL
   - Review: PASS or FAIL
   - Notes: anything skipped or noteworthy
```

---

## 1. Safeguarding (4 sprints)

### Sprint 1 — P0 Launch Blockers
```
Read docs/newsprints/safeguarding/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #1.
```

### Sprint 2 — P1 Pre-Launch
```
Read docs/newsprints/safeguarding/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #2.
```

### Sprint 3 — P2 First Quarter
```
Read docs/newsprints/safeguarding/sprint3.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #3.
```

### Sprint 4 — P3 Ongoing
```
Read docs/newsprints/safeguarding/sprint4.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #4.
```

---

## 2. Financial — Reconciler (4 sprints)

### Sprint 1 — Wire Reconciler to Real Data
```
Read docs/newsprints/financial/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #5.
```

### Sprint 2 — Overdue Detection, Reminders & GBP
```
Read docs/newsprints/financial/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #6.
```

### Sprint 3 — Analytics Polish & Earnings Calculator
```
Read docs/newsprints/financial/sprint3.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #7.
```

### Sprint 4 — Wallet Cruft Cleanup & Polish
```
Read docs/newsprints/financial/sprint4.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #8.
```

---

## 3. Error Handling (4 sprints)

### Sprint 1 — Silent Failures / Data Loss
```
Read docs/newsprints/error-handling/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #9.
```

### Sprint 2 — Missing Confirmations for Destructive Actions
```
Read docs/newsprints/error-handling/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #10.
```

### Sprint 3 — Missing Feedback / User Confusion
```
Read docs/newsprints/error-handling/sprint3.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #11.
```

### Sprint 4 — Polish & Debugging
```
Read docs/newsprints/error-handling/sprint4.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #12.
```

---

## 4. Forms & Modals (4 sprints)

### Sprint 1 — Validation Bugs That Corrupt Data
```
Read docs/newsprints/forms-modals/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #13.
```

### Sprint 2 — Input Limits & Filtering
```
Read docs/newsprints/forms-modals/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #14.
```

### Sprint 3 — Modal Interaction Bugs
```
Read docs/newsprints/forms-modals/sprint3.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #15.
```

### Sprint 4 — UX Polish
```
Read docs/newsprints/forms-modals/sprint4.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #16.
```

---

## 5. Double Submit (2 sprints)

### Sprint 1 — Data Corruption Prevention (TOCTOU, Races)
```
Read docs/newsprints/double-submit/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #17.
```

### Sprint 2 — UX Annoyances
```
Read docs/newsprints/double-submit/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #18.
```

---

## 6. Navigation (2 sprints)

### Sprint 1 — Broken Navigation Flows
```
Read docs/newsprints/navigation/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #19.
```

### Sprint 2 — UX Polish
```
Read docs/newsprints/navigation/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #20.
```

---

## 7. Booking & Sessions (2 sprints)

### Sprint 1 — Broken Logic
```
Read docs/newsprints/booking-sessions/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #21.
```

### Sprint 2 — UX Improvements
```
Read docs/newsprints/booking-sessions/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #22.
```

---

## 8. Offline (2 sprints)

### Sprint 1 — Critical Cache & Connectivity
```
Read docs/newsprints/offline/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #23.
```

### Sprint 2 — Background State & Persistence
```
Read docs/newsprints/offline/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #24.
```

---

## 9. Dead Ends (2 sprints)

### Sprint 1 — Broken & Misleading UI
```
Read docs/newsprints/dead-ends/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #25.
```

### Sprint 2 — Polish & Hidden Affordances
```
Read docs/newsprints/dead-ends/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #26.
```

---

## 10. Data Display (2 sprints)

### Sprint 1 — Broken Display & Calculations
```
Read docs/newsprints/data-display/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #27.
```

### Sprint 2 — Mock Data Issues
```
Read docs/newsprints/data-display/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #28.
```

---

## 11. Progress & Development (2 sprints)

### Sprint 1 — Broken Features (Calculations, Video, Badges)
```
Read docs/newsprints/progress-development/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #29.
```

### Sprint 2 — Polish (Interactivity, Celebrations)
```
Read docs/newsprints/progress-development/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #30.
```

---

## 12. Social & Community (2 sprints)

### Sprint 1 — Broken Features
```
Read docs/newsprints/social-community/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #31.
```

### Sprint 2 — UX Polish
```
Read docs/newsprints/social-community/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #32.
```

---

## 13. Accessibility (2 sprints)

### Sprint 1 — Critical WCAG Violations
```
Read docs/newsprints/accessibility/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #33.
```

### Sprint 2 — UX Polish
```
Read docs/newsprints/accessibility/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #34.
```

---

## 14. Performance (2 sprints)

### Sprint 1 — Jank & Freeze Fixes
```
Read docs/newsprints/performance/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #35.
```

### Sprint 2 — Optimization
```
Read docs/newsprints/performance/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #36.
```

---

## 15. Family & Roster (1 sprint)

### Sprint 1 — Parent & Multi-Child UX
```
Read docs/newsprints/family-roster/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #37.
```

---

## 16. Results Program UI (4 sprints)

### Sprint 1 — Product Reframe + Premium Visual Foundation
```
Read docs/newsprints/results-program-ui/sprint1.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #38.
```

### Sprint 2 — Action Engine + Frictionless Execution
```
Read docs/newsprints/results-program-ui/sprint2.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #39.
```

### Sprint 3 — Coach Command Centre + Intervention Workflows
```
Read docs/newsprints/results-program-ui/sprint3.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #40.
```

### Sprint 4 — Production Polish, Reliability, and Launch Readiness
```
Read docs/newsprints/results-program-ui/sprint4.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone). Fix anything flagged. Run TSC again. Update docs/newsprints/DONE.md row #41.
```

---

## 17. Architecture Hardening (4 sprints)

### Sprint 1 — Release Gates + Baseline Lock
```
Read docs/newsprints/architecture-hardening/sprint1-release-gates-and-baseline.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npx tsc -p tsconfig.test.json. Then run npm run test:safety and npm run gate:release-core. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone), and architecture budget check has no regression. Fix anything flagged. Run all gates again. Update docs/newsprints/DONE.md by adding a new row for Architecture Hardening Sprint 1.
```

### Sprint 2 — Layering + Decoupling Core Flows
```
Read docs/newsprints/architecture-hardening/sprint2-layering-and-decoupling-core-flows.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npm run gate:release-core and rerun architecture audit. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone), and no new component->service imports outside the exception register. Fix anything flagged. Run gates again. Update docs/newsprints/DONE.md by adding a new row for Architecture Hardening Sprint 2.
```

### Sprint 3 — State Contracts + Platform Integrity
```
Read docs/newsprints/architecture-hardening/sprint3-state-contracts-and-platform-integrity.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npm run gate:release-core plus targeted booking/invite/notification tests. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone), notification recipient contracts are enforced, and booking analytics contract fields are complete. Fix anything flagged. Run gates again. Update docs/newsprints/DONE.md by adding a new row for Architecture Hardening Sprint 3.
```

### Sprint 4 — Google-Grade Readiness + Operability
```
Read docs/newsprints/architecture-hardening/sprint4-google-grade-readiness-and-operability.md and implement every fix described in it. Follow CLAUDE.md conventions. After ALL fixes, run npm run gate:release-core, architecture audit, and reliability/ops checks defined in the sprint. Then spawn a review agent to re-read every file touched and verify: no any types, no hardcoded colors/routes, no raw View+flexDirection, no Pressable, useCallback on handlers, memo on renderItem, GBP not USD, Result uses .success, showToast(msg,tone), dependency rules are CI-enforced, idempotency/recovery tests pass, and scorecard evidence is complete. Fix anything flagged. Run gates again. Update docs/newsprints/DONE.md by adding a new row for Architecture Hardening Sprint 4.
```

---

## Total: 45 sprints across 17 categories (~450 items)
