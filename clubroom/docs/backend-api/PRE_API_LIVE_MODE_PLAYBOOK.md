# Pre-API Live Mode Playbook (Retired Compatibility Mode)

## Goal
Document the retired pre-API live mode so old flags and entrypoints are not mistaken for production-like runtime truth.

## Runtime Flags
- `EXPO_PUBLIC_USE_MOCK=true`
- `EXPO_PUBLIC_PRE_API_LIVE_MODE=true`
- `EXPO_PUBLIC_PRE_API_LIVE_SEED_ON_AUTH=true`
- `EXPO_PUBLIC_PRE_API_LIVE_PULSE_INTERVAL_MS=45000`
- `EXPO_PUBLIC_ENABLE_RELATIONAL_DEMO_SEED=true`

## What Runs
- `preApiLiveModeService` may still be called after auth in `/app/_layout.tsx`, but it is inert compatibility only.
- `ensureRelationalDemoSeeded()` is retained as a no-op compatibility entrypoint.
- No relational seed, section coverage seed, warm notification injection, or activity pulse should create local product data.

## Section Coverage Map (Product Spines)
- Community & Growth:
  - must use real `/v1` club/feed/message APIs or fail closed when no API exists
- Booking, Availability & Revenue:
  - must use `/v1` booking, public offering, invite, and revenue APIs or fail closed when no API exists
- Development & Analytics:
  - must use `/v1` athlete/progress APIs or fail closed when no API exists
- Trust, Safety & Operations:
  - must use `/v1` family health, safeguarding, and ops APIs or fail closed when no API exists

## Why this is cutover-safe
- The compatibility entrypoints preserve old caller contracts without writing local server-owned product data.
- Live product behavior now belongs behind explicit `/v1` API services.
- Turning on old pre-API flags should not create demo truth.

## One Switch Off
- Set `EXPO_PUBLIC_PRE_API_LIVE_MODE=false`.
- This remains the expected setting for real API work.

## Switch to Real API + Database
1. Set `EXPO_PUBLIC_USE_MOCK=false`.
2. Set `EXPO_PUBLIC_PRE_API_LIVE_MODE=false`.
3. Point `EXPO_PUBLIC_API_URL` to backend.
4. Keep feature services behind explicit `/v1` authorities.

## Optional staging profile
Use this in a staging `.env` to test real API without simulation noise:

```env
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_PRE_API_LIVE_MODE=false
EXPO_PUBLIC_PRE_API_LIVE_SEED_ON_AUTH=false
EXPO_PUBLIC_ENABLE_RELATIONAL_DEMO_SEED=false
```
