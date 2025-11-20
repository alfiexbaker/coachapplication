# Planning Doc Audit

This audit reviews every sprint file created so far to ensure the content is still necessary, scoped, and actionable. Each section lists the file's purpose, whether anything felt redundant or out of scope, and next steps for iteration.

## Summary Table
| File | Purpose | Anything Unneeded? | Actions / Notes |
| --- | --- | --- | --- |
| `S0_FOUNDATION.md` | Product north star, design language, platform guardrails | **No.** All sections directly support multi-sprint decisions. | Keep; next iteration should append decision log entries as they emerge. |
| `S1_MVP_CORE.md` | MVP discovery, booking, coach ops specs | **No.** Content focuses on in-scope flows only. | Continue logging decisions inline per component when fleshing out UI flows. |
| `S2_PERFORMANCE_CHAT.md` | Blueprint for messaging + performance pillars | **No.** Each section ties to post-MVP roadmap. | Add capacity planning + dependency tracking when engineering begins. |
| `S3_TRUST_PAYMENTS.md` | Trust/compliance/payments roadmap | **No.** Details map to pillar 6 needs. | Next revision should add status tracking (Not started / In design / Dev) for each track. |
| `DB_MODEL_NOTES.md` | Schema + sequencing references | **No.** The schema is required for every pillar. | When decisions finalize, convert to Prisma schema doc and tag migration order. |

## Findings
- Every file contains only the content requested in the original brief (pillars, MVP vs. future phases, and DB planning). Nothing is extraneous for the planning stage.
- The docs consistently note that no database is provisioned yet while still defining relationships—aligned with "plan DB structure but no DB for now."
- Cross-platform (iOS + Android) and visual language guidance is confined to `S0_FOUNDATION.md`, avoiding duplication elsewhere.

## Recommended Improvements
1. **Decision tracking** – Start populating explicit `Decision:` blocks in each sprint doc to honor the "iterate every decision" request.
2. **Status snapshots** – For post-MVP files (`S2`, `S3`), add lightweight status tags (e.g., `Status: Draft`) at the top so readers know whether work has begun.
3. **Linking** – Cross-link the DB entities to the sprint sections that rely on them for faster navigation (e.g., `Booking` references inside `S1_MVP_CORE.md`).

Until those enhancements land, the current docs are lean and fully aligned with the planning needs—no sections need to be removed.
