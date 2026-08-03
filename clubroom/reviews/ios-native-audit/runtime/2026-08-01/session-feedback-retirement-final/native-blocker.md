# Native iOS ROUTE-013 check

The actual Clubroom Expo bundle opened in Expo Go on an iPhone 16 Pro Max simulator and rendered the signed-out native screen. The launch screenshot is retained at `../booking-detail-final-clean/native-ios-login-blocked-env-006.png`.

Authenticated native navigation and semantic inspection remain blocked by `ENV-006`: macOS Developer Tools security is disabled, `agent-device` cannot attach to the accessibility tree, and the Simulator desktop accessibility fallback timed out. No privileged host change and no test-only authentication bypass were introduced.

The signed-out launch screenshot is not treated as ROUTE-013 proof. Authenticated role, layout, control, route, network, and result evidence comes from the strict Expo runtime at a 390 px iPhone viewport plus the live staging Fastify/database matrix in `api-db-evidence.md`.
