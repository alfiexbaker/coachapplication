# ENV-008 — clean simulator Expo Go recovery

## Scope

Local iPhone 16 Pro simulator only. This is an environment record, not a Clubroom product result.

## Observation

The fresh simulator booted normally, but the local `expo run:ios` attempt did not install Clubroom; the device only contained Expo Go. The existing local Metro server was healthy. Opening its development-client URL in Expo Go remained on a black native spinner, so a separate Expo Go server was started on port 8082. Expo Go still never requested a bundle from Metro and remained on the spinner. `expo-go-spinner.png` records the settled state.

## Result

No production, staging, application, account, permission, database, or external-service state was changed. This device cannot supply post-fix native evidence. QA-093, QA-094, and QA-095 remain explicitly native-retest pending.
