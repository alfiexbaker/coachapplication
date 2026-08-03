# Native iOS booking-detail check

The actual Clubroom Expo bundle opened in Expo Go on an iPhone 16 Pro Max simulator. It rendered the signed-out native screen.

Deterministic navigation and semantic inspection remain blocked by `ENV-006`: macOS Developer Tools security is disabled, `agent-device` cannot attach to the accessibility tree, and the Simulator desktop accessibility fallback timed out. No privileged host change and no test-only authentication bypass were introduced.

`native-ios-login-blocked-env-006.png` records only the real native launch state. It is not treated as booking-detail route proof. The five authenticated role outcomes are proven separately by the strict native-responsive runtime report and screenshots.
