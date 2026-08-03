# Native require-cycle verification

Date: 2026-08-02 BST
Device: iPhone 16 Pro Max simulator, iOS 18.3
Bundle: installed `ClubroomDev.app`, `com.coachapptrial.clubroom.dev`
Environment: staging native development build; Metro on `localhost:8081`

## Outcome

- The seven service-cycle families recorded in QA-024 are absent from the analyzed runtime dependency graph.
- The installed app was terminated and cold-launched against the live Metro project.
- The native sign-in screen settled after launch.
- Simulator unified-log queries from `2026-08-02 00:19:20`, `00:30:32`, and the final dead-code cleanup retest at `00:34:42` returned zero entries matching `Require cycle` or `circular` for `ClubroomDev`.
- No app error or fault corresponding to JavaScript initialization was recorded. The simulator did record the existing development-only React DevTools connection refusal on port 8097; this is not a product API request or a service initialization failure.

## Ownership changes checked

- Notification store and preferences call `services/notification/notification-authority-service.ts`, not the community-media compatibility facade.
- Family aggregation imports `booking-authority-service.ts`, not the booking lifecycle facade.
- Family permission colors come from a pure constant module, not the family-member service.
- Event CRUD reads mock recipients from `club-member-mock-store.ts`, not the club facade.

## Verification

- Root typecheck: passed.
- Test compile: passed in isolated output directory.
- Focused notification, family, club and event tests: 124/124 passed serially.
- Import-boundary regression tests: 3/3 passed.
- Static runtime analysis: none of the seven QA-024 chains remained; remaining analyzer reports were inspected as type-only or operation-deferred relationships and did not appear in the native launch log.
- Native cold launch: passed; sign-in settled and zero require-cycle log matches.

Evidence: `native-ios-settled.png`, `native-ios-settled-final.png`
