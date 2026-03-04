# Pre-API Live Mode Playbook (Mock Runtime, Production Feel)

## Goal
Keep the app in pre-REST mock mode while making it feel live:
- rich relational seed data across marketplace flows
- ongoing activity pulses (messages + notifications + feed)
- zero service-layer rewrites when switching to real API later

## Runtime Flags
- `EXPO_PUBLIC_USE_MOCK=true`
- `EXPO_PUBLIC_PRE_API_LIVE_MODE=true`
- `EXPO_PUBLIC_PRE_API_LIVE_SEED_ON_AUTH=true`
- `EXPO_PUBLIC_PRE_API_LIVE_PULSE_INTERVAL_MS=45000`
- `EXPO_PUBLIC_ENABLE_RELATIONAL_DEMO_SEED=true`

## What Runs
- `preApiLiveModeService` starts after auth in `/app/_layout.tsx`
- bootstrap on auth:
  - `ensureRelationalDemoSeeded()`
  - `ensureCoachSessionsSeeded()`
  - section coverage seed (only when missing for current user):
    - recurring bookings
    - invoices
    - counter-offers
    - progress data for linked athletes
  - warm notification injection if inbox is empty
- activity pulses:
  - on app active (foreground)
  - on interval
  - rotates:
    - message simulation
    - notification generation
    - coach feed post generation

## Section Coverage Map (Product Spines)
- Community & Growth:
  - club/feed data via relational seeds + live coach post pulses
  - messaging threads with synthetic incoming messages
- Booking, Availability & Revenue:
  - relational bookings/session offers/invites
  - recurring booking coverage for current user path
  - invoice coverage for current user path
  - counter-offer negotiation coverage
- Development & Analytics:
  - progress seed generation for linked athlete IDs
- Trust, Safety & Operations:
  - injuries/concerns/reports from relational seeds
  - notification inbox warm-start + ongoing activity pulses

## Why this is cutover-safe
- Services still read/write through `apiClient` only.
- Live-mode behavior is runtime-flagged, not hardwired into feature logic.
- Turning off live simulation is a flag change, not a refactor.

## One Switch Off
- Set `EXPO_PUBLIC_PRE_API_LIVE_MODE=false`.
- This disables the live bootstrap + pulse runtime while keeping mock mode or real API choice separate.

## Switch to Real API + Database Later
1. Set `EXPO_PUBLIC_USE_MOCK=false`.
2. Set `EXPO_PUBLIC_PRE_API_LIVE_MODE=false`.
3. Point `EXPO_PUBLIC_API_URL` to backend.
4. Keep service contracts intact; migrate data source behind `apiClient`.

## Optional staging profile
Use this in a staging `.env` to test real API without simulation noise:

```env
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_PRE_API_LIVE_MODE=false
EXPO_PUBLIC_PRE_API_LIVE_SEED_ON_AUTH=false
EXPO_PUBLIC_ENABLE_RELATIONAL_DEMO_SEED=false
```
