# AI Development Pipeline

Purpose: make AI-assisted development fast, bounded, and verifiable without relying on a human review checkpoint.

## Operating Loop

1. Create a task packet from `docs/templates/AI_TASK_PACKET.md`.
2. Map the task to one or more product spines.
3. Read the minimum context from `CODEX.md`, `docs/START_HERE.md`, `docs/SOURCE_OF_TRUTH.md`, `docs/KNOWLEDGE_SPINE.md`, and exactly one deep source.
4. Implement the smallest reversible slice.
5. Run the narrowest honest verification command.
6. Perform an AI self-review against the changed diff.
7. Commit the completed slice with verification notes.

There is no required human-review stage in this loop. Quality comes from explicit task packets, executable gates, AI self-review, and small commits.

## Task Packet

Use `docs/templates/AI_TASK_PACKET.md` before implementation when the task is non-trivial.

The packet must name:

- the goal and user-facing outcome
- the current runtime truth being used
- impacted files and product spine
- trust, permission, and UI risks
- exact validation command
- done conditions

## Verification Commands

Default static slice gate:

```bash
npm run verify:slice
```

Use this for docs, planning, process, route-boundary, and low-risk static changes.

App TypeScript slice:

```bash
npm run verify:slice:app
```

Use this when Expo app TypeScript, services, hooks, navigation, or UI code changes.

API slice:

```bash
npm run verify:slice:api
```

Use this when `apps/api`, backend contracts, authz, persistence, or API tests change.

UI interaction slice:

```bash
npm run verify:slice:ui
```

Use this when controls, loading states, empty states, accessibility labels, or route interactions change.

Full local gate:

```bash
npm run verify:slice:full
```

Use this before release-facing changes or when a slice crosses API, app, and UI behavior.

## AI Self-Review Gate

After verification, review the diff and answer these before commit:

- Did this create a parallel flow instead of extending the existing one?
- Did this weaken backend authority, authz, auditability, or assignment-based visibility?
- Did this add mock-first ownership for trust-sensitive data?
- Did this add native alerts, dead controls, route string literals, or hardcoded storage keys?
- Did the validation command actually cover the changed surface?
- If validation was blocked, is the remaining risk stated in the commit or handoff?

## Agent Roles

For larger tasks, split the same task packet into AI roles:

- Planner: creates the task packet and selects the deep source.
- Implementer: changes only the named slice.
- Verifier: runs the commands and captures failures.
- Reviewer: performs the AI self-review against the diff and permission/UI rules.

These roles can be separate agents or separate passes by one agent. The output remains one small commit per completed slice.
