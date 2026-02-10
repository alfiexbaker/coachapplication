# How to Run Sprints

## Architecture

Each sprint has:
- `{SPRINT}.md` — Instructions (what to do)
- `{SPRINT}-PROGRESS.md` — Agent writes here (context recovery)

The PROGRESS file is the agent's brain. If it runs out of context, re-spawn with the SAME prompt — it reads PROGRESS and continues.

---

## Step 1: Launch P1-CI First (2 minutes)

This updates tsconfig.test.json which other agents depend on.

```
Prompt for P1-CI agent:
```

You are executing sprint P1-CI for the Clubroom codebase.

**CONTEXT RECOVERY**: Read `memory/Sprints/P1-CI-PROGRESS.md` FIRST. If it has content, continue from where the previous agent left off. Do NOT restart work that's already done.

If the progress file doesn't exist or is empty, read `memory/Sprints/P1-CI-INFRASTRUCTURE.md` for full instructions and start from the beginning.

**WORKING DIRECTORY**: /Users/tubton/Desktop/coachapplication/clubroom

**PROGRESS TRACKING**: After EVERY file you modify, update `memory/Sprints/P1-CI-PROGRESS.md` with:
```
## Status: IN PROGRESS / COMPLETE
## Files Done:
- [x] file1.ts — what you did
- [x] file2.ts — what you did
- [ ] file3.ts — not started
## Next Step: exact next action
## Errors: any issues encountered
```

**RULES**:
- Read CLAUDE.md for architecture rules
- Do NOT touch app/, components/, or services/ files
- Verify changes compile: `npx tsc -p tsconfig.test.json`
- When done, set Status to COMPLETE in progress file

```
End prompt
```

---

## Step 2: Launch All Parallel Agents

After P1-CI completes, launch these ALL AT ONCE. They don't overlap.

### Template Prompt (replace {SPRINT_ID} and {SPRINT_FILE})

```
You are executing sprint {SPRINT_ID} for the Clubroom codebase.

**CONTEXT RECOVERY**: Read `memory/Sprints/{SPRINT_ID}-PROGRESS.md` FIRST. If it has content, continue from where the previous agent left off. Do NOT restart completed work.

If the progress file doesn't exist or is empty, read `memory/Sprints/{SPRINT_FILE}` for full instructions and start from the beginning.

**WORKING DIRECTORY**: /Users/tubton/Desktop/coachapplication/clubroom
**CODEBASE RULES**: Read /Users/tubton/Desktop/coachapplication/CLAUDE.md for architecture constraints.

**PROGRESS TRACKING — NON-NEGOTIABLE**:
After EVERY 2-3 files you modify, update `memory/Sprints/{SPRINT_ID}-PROGRESS.md`:
```
## Status: IN PROGRESS
## Completed:
- [x] path/to/file1.tsx — added useScreen, 4 visual states
- [x] path/to/file2.tsx — added useScreen, palette-only (form screen)
## Remaining:
- [ ] path/to/file3.tsx
- [ ] path/to/file4.tsx
## Next Step: Migrate path/to/file3.tsx — add useScreen with eventService.getEvents() load function
## Issues: none
```

**CRITICAL**: Write to PROGRESS.md BEFORE you might run out of context. If you've done 10 files and haven't written progress, you're doing it wrong. Write early, write often.

**WHEN DONE**: Set Status to COMPLETE. List all files touched. Run quality gate checks from the sprint doc.
```

### Specific Prompts (copy-paste ready)

**Phase 1 — run together after P1-CI:**

| Agent | SPRINT_ID | SPRINT_FILE |
|-------|-----------|-------------|
| Services | P1-SERVICES | P1-SERVICE-HARDENING.md |
| Tests A | P1-TESTS-A | P1-TESTS-A.md |
| Tests B | P1-TESTS-B | P1-TESTS-B.md |
| Tests C | P1-TESTS-C | P1-TESTS-C.md |
| Tests D | P1-TESTS-D | P1-TESTS-D.md |

**Phase 2 — run together (parallel with Phase 1):**

| Agent | SPRINT_ID | SPRINT_FILE |
|-------|-----------|-------------|
| Screens A | P2-SCREENS-A | P2-SCREENS-A.md |
| Screens B | P2-SCREENS-B | P2-SCREENS-B.md |
| Screens C | P2-SCREENS-C | P2-SCREENS-C.md |
| Screens D | P2-SCREENS-D | P2-SCREENS-D.md |
| Screens E | P2-SCREENS-E | P2-SCREENS-E.md |

**Phase 3 — run together (parallel with Phase 2):**

| Agent | SPRINT_ID | SPRINT_FILE |
|-------|-----------|-------------|
| Components A | P3-COMPONENTS-A | P3-COMPONENTS-A.md |
| Components B | P3-COMPONENTS-B | P3-COMPONENTS-B.md |
| Components C | P3-COMPONENTS-C | P3-COMPONENTS-C.md |

**Phase 4 — run AFTER Phases 2+3 complete:**

| Agent | SPRINT_ID | SPRINT_FILE |
|-------|-----------|-------------|
| Accessibility | P4-ACCESSIBILITY | P4-ACCESSIBILITY.md |
| Performance | P4-PERFORMANCE | P4-PERFORMANCE.md |
| Spacing | P4-SPACING | P4-SPACING-TOKENS.md |

---

## Step 3: Monitor Progress

Check any agent's status:
```bash
cat memory/Sprints/P1-CI-PROGRESS.md
cat memory/Sprints/P2-SCREENS-A-PROGRESS.md
# etc.
```

Quick status of ALL sprints:
```bash
for f in memory/Sprints/*-PROGRESS.md; do echo "=== $(basename $f) ==="; head -1 "$f" 2>/dev/null || echo "NOT STARTED"; done
```

---

## Step 4: If an Agent Dies (Context Loss)

1. Read its PROGRESS.md — see what's done and what's next
2. Re-launch with the EXACT SAME prompt (template above)
3. The new agent reads PROGRESS.md and continues from where the old one stopped
4. It does NOT redo completed work

This is why PROGRESS.md updates are non-negotiable. No progress file = restart from scratch.

---

## Step 5: Verify Phase Completion

After all agents in a phase report COMPLETE:

**Phase 1 verification:**
```bash
cd clubroom
npx tsc -p tsconfig.test.json
node --require ./scripts/test-register.js --test .tmp-tests/services/**/*.test.js
grep -rn "throw new" services/ --include="*.ts" | wc -l  # should be 0
```

**Phase 2 verification:**
```bash
grep -rn "useScreen" app/ --include="*.tsx" | wc -l  # should be >= 170
grep -rn "LoadingState\|ErrorState\|EmptyState" app/ --include="*.tsx" | wc -l  # should be >= 300
```

**Phase 3 verification:**
```bash
# No -sections.tsx file should be > 300 lines
wc -l components/**/*-sections.tsx | sort -rn | head -20
```

**Phase 4 verification:**
```bash
grep -rn "accessibilityLabel" app/ components/ | wc -l  # should be >= 900
grep -rn "from 'react-native'" hooks/data/ --include="*.ts" | wc -l  # check hook sizes
wc -l hooks/data/*.ts hooks/use-schedule.ts hooks/use-auth.tsx | sort -rn | head -10  # all < 400
```

---

## Practical Example: Launching Phase 2

In Claude Code, you'd say something like:

"Run these 5 sprints in parallel. Each agent should read its sprint doc and progress file. They don't touch each other's files."

Then spawn 5 Task agents with the prompts above, using `run_in_background: true` for each.

Check on them periodically by reading their PROGRESS.md files.
