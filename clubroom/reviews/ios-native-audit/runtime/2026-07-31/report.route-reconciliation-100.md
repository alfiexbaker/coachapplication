# Cross-role responsive flow reconciliation

- Evidence: composite responsive-browser run
- Total: 100
- Passed: 100
- Failed: 0
- High findings: 0
- Medium findings: 0

| Role     | Passed | Total |
| -------- | -----: | ----: |
| coach    |     40 |    40 |
| parent   |     32 |    32 |
| guardian |      1 |     1 |
| athlete  |     19 |    19 |
| admin    |      8 |     8 |

The initial 100-flow run passed 95 flows. Five coach action checks reported controls missing, but each failure screenshot visibly contained the named control. The runner now waits up to five seconds for an asynchronously rendered matching control. A full 40-flow coach retest then passed, including all five previously reported failures.

This composite uses the 60 clean non-coach results from the initial run and all 40 results from the coach retest. It is non-destructive responsive-browser evidence for the shared React Native surface. It is not labelled native iOS, VoiceOver, database, RLS, audit-event, or Sentry proof.
