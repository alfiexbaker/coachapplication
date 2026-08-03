# React Doctor baseline

Date: 2026-08-01

Scope: repository-wide static React and React Native diagnostic pass performed while validating the canonical coach-profile slice.

## Results

- Full repository: **49/100**, with **460 diagnostics** across **203 files**.
- Severity totals: **31 errors** and **429 warnings**.
- Changed-file scope: **84/100**, with **15 diagnostics**: one error in `hooks/use-group-session.ts:140` and 14 warnings.
- The changed-file error is outside the coach-profile slice and was already present in the user's concurrent worktree changes.
- The full result includes generated files and audit artifacts, so each diagnostic is a triage lead rather than a confirmed product defect.

## Interpretation

The coach-profile slice passed its focused tests, root typecheck, test compilation, API typecheck and strict runtime flow. That does not make the repository-wide React baseline healthy. The full diagnostic set needs a separate, deletion-first triage that distinguishes real runtime, accessibility and architecture defects from generated or non-product files before fixes are attempted.

## Safety

- No automatic bulk rewrite was run.
- No production environment or production data was touched.
- No diagnostic was silently marked fixed.
