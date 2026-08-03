# React Doctor warning baseline refresh

## Command

```sh
npx -y react-doctor@latest --json --yes
```

The scan ran from the repository root against the existing dirty worktree. It was read-only and did not touch production, staging, Supabase, Sentry, or user data.

## Result

| Metric | Previous baseline | Current baseline | Change |
| --- | ---: | ---: | ---: |
| Diagnostics | 419 | 399 | -20 |
| Errors | 13 | 13 | 0 |
| Warnings | 406 | 386 | -20 |
| Affected files | 187 | 179 | -8 |
| Raw score | 49 | 49 | 0 |

React Doctor reported `ok: true`. Its CLI exited non-zero because diagnostics remain, not because the scan failed. The raw JSON was 894,307 bytes with SHA-256 `ba9dcdce24ed4574a5fd342ed5401f4239d082a335954f9490969b0457151608`.

## Error identity check

All 13 errors are the already classified set:

- 2 generated API source-map artifact findings.
- 1 recorder timer finding with an event-owned stop/finalization cleanup path.
- 10 React Compiler `todo` deferrals in hooks.

No prior confirmed error rule returned.

## Remaining warning inventory

The largest classes are 110 combined-iteration suggestions, 74 repeated lookup suggestions, 46 component-export suggestions, 39 giant-component suggestions, 37 manual-memoization suggestions, 20 awaits in loops, and 16 `flatMap`/filter suggestions. Correctness-sensitive dependency, render-purity, lazy-ref, and dynamic-row identity slices remain cleared.

Five backend concurrency diagnostics were reviewed in the invoice-reminder slice. They represent four deliberate security/transaction/read-after-write paths and are retained without suppression.

This is a baseline refresh, not a claim that the warning pass or full app audit is complete.
