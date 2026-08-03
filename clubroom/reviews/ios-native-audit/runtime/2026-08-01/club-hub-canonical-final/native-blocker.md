# Native iOS evidence and blocker

The actual Expo iOS application was opened on the booted iPhone 16 Pro Max simulator at `exp://127.0.0.1:8081`. `native-ios-current.png` shows the real Clubroom sign-in surface, not a browser reconstruction.

Semantic inspection and interaction remain host-blocked:

- Command: `agent-device snapshot --session clubroom-native --platform ios`
- Result: `COMMAND_FAILED`
- Reason: Apple developer mode is disabled for development tools.
- Required host action: `sudo DevToolsSecurity -enable`
- Diagnostic ID: `msar0qev-cfeaed4b`

The simulator screenshot was captured successfully with `simctl`, but no native route-flow, VoiceOver-tree or native control-behaviour claim is made for this slice. The responsive shared React Native implementation was exercised separately by the 12-flow report.
