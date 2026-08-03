# Cross-role browser regression

- Base URL: local Expo web bundle backed by the staging API
- Generated: 2026-07-31
- Total flows: 100
- Passed: 100
- Failed: 0
- High findings: 0
- Medium findings: 0
- Retries: 1
- Navigation pause: 600 ms
- Evidence: composite initial cross-role run plus full coach retest

## Role totals

| Role              | Passed | Failed |
| ----------------- | -----: | -----: |
| Coach             |     40 |      0 |
| Parent            |     32 |      0 |
| Assigned guardian |      1 |      0 |
| Athlete           |     19 |      0 |
| Club admin        |      8 |      0 |

The initial 100-flow run passed 95 flows. Five coach action checks reported
missing controls even though every failure screenshot visibly contained the
named target. After the runner was changed to wait for asynchronously rendered
controls, the complete 40-flow coach retest passed. The reconciled result has
zero failed requests, runtime exceptions, nested controls, horizontal overflow,
product-text findings, or high/medium findings.

The 100 flows exercise the 51 baseline route-file rows plus the Add Child and
five verification route rows, which already carry stronger dedicated evidence.
That leaves 57 of 143 route rows passed and 86 genuinely pending. No pending
route was promoted by filename similarity or redirect inference. Exact endpoint
request IDs, database effects, RLS decisions, audit events, Sentry, and native
behavior remain separate checks unless their evidence row says otherwise.

Evidence:

- [`runtime/2026-07-31/report.route-reconciliation-100.json`](./runtime/2026-07-31/report.route-reconciliation-100.json)
- [`runtime/2026-07-31/report.qa-locator-timing.json`](./runtime/2026-07-31/report.qa-locator-timing.json)

The earlier manual review did not accept an automated pass as a final visual
baseline. Its findings remain tracked separately; this runner result does not
close the manual visual inventory.

This is responsive-browser regression evidence. It does not replace native iOS
interaction, VoiceOver, gesture, keyboard, or platform-behaviour testing.
