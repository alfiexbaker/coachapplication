# Native iOS semantic-run evidence

- Booted target: iPhone 16 Pro Max simulator.
- Installed runtime found: Expo Go with Clubroom open at the native sign-in screen.
- A simulator screenshot was captured at `../edit-child-profile-native-blocked/current-screen.png`.
- `agent-device` could not attach to the app accessibility tree because macOS Developer Tools security is disabled.
- Exact actionable host requirement: `sudo DevToolsSecurity -enable`.
- No privileged command was attempted and no native target-route interaction is claimed.
- Responsive shared React Native rendering and deterministic cross-role web interaction are recorded separately; they do not replace the blocked native semantic run (`ENV-006`).
