# Screen mounted lifecycle — 2026-08-02

Scope: local iPhone 16 Pro Max development audit only. No production or staging request was sent.

| Flow | Result | Evidence |
| --- | --- | --- |
| Freshly reloaded direct route before fix | The add-to-session route remained in a full-screen detail skeleton after its load should have resolved. | `route-stuck-before.png` |
| Fresh app reload after fix | The same role and direct route resolve to the terminal access state instead of remaining in the skeleton. | `route-settled-after.png` |

Cause: `useScreen` set its `mountedRef` to false in effect cleanup but did not set it back to true on a later effect mount. Development reload/effect replay could therefore make every async completion look stale.

Fix: restore the mounted flag at effect setup and retain the existing cleanup protection. Verification: focused lint; isolated test compile; focused lifecycle assertion; root typecheck; actual native iOS before and after screenshots. React Doctor's `useCallback` warning remains intentionally unchanged: the callback is the dependency boundary required by Expo Router's `useFocusEffect`; removing it is not a safe mechanical cleanup.
