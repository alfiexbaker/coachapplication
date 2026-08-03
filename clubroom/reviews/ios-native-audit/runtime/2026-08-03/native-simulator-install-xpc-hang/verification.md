# ENV-009 — native simulator install XPC hang

## Scope

Local iPhone 16 Pro simulator only. This is an environment record, not a Clubroom product result.

## Observation

After freeing local disk space, `npm run ios -- --device 'iPhone 16 Pro'` completed a full Clubroom native build with zero errors. The clean simulator did not receive the app: Expo's install hand-off remained silent, and a direct install of the exact built `ClubroomDev.app` also hung. A simultaneous app-container lookup hung in the same CoreSimulator XPC path. `development-client-spinner.png` records the device state.

## Result

Only the two stuck local `simctl` commands were stopped. The simulator was not erased or rebooted, no OS permission prompt was accepted, and no production, staging, application, account, database, audit, payment, or external-service state was changed. Native post-fix retests remain pending a functioning install channel.
