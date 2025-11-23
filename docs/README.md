# Documentation Overview

This folder keeps the shared source of truth for Clubroom. Use it to stay aligned on what exists, what comes next, and how to extend current flows without reinventing them.

## How to work with these docs
- Start with `SOURCE_OF_TRUTH.md` to understand the product vision, role experiences, and non-negotiable principles.
- Map every change to one or more product spines in `SPINE_CATEGORIES.md`; prefer extending the nearest existing flow before proposing anything net-new.
- Use the sprint briefs in `sprints/` to scope work; keep them frontend-first with mock data unless a backend dependency is explicitly called out.
- If something feels unclear, update the docs first so intent is searchable before you touch code.

## Document map
- **SOURCE_OF_TRUTH.md** – Vision, roles, current phase, and key decisions.
- **SPINE_CATEGORIES.md** – Four product spines (Community, Booking/Revenue, Development, Trust/Ops) and how to apply them.
- **sprints/** – Current four-sprint plan with scope and deliverables per sprint.
- **vision/** – Role requirements, feature specs, and software design notes that inform the sprint work.
- **technical/** – Data and architecture notes to keep future backend/API work aligned.

## Future additions
- Add API contracts and data schemas here as they mature so frontend and backend stay in lockstep.
- Capture major design decisions (and their trade-offs) as ADR-style notes in this folder for quick onboarding.
