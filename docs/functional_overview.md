# Current App Capabilities (Plaintext)

## Navigation & roles
- Bottom navigation is constrained to four to five hubs per role (Home, Schedule/Bookings, Messages, Profile/Settings) so coaches, parents, users, and admins see only what they need while keeping badges for unread conversations. 【F:clubroom/app/(tabs)/_layout.tsx†L24-L86】

## Messaging & community
- Messages are split into direct and group inboxes with search, pull-to-refresh, and rich group cards (club, squad, class) that surface member counts, scope labels, posting-as options, unread mentions, and quick opens. 【F:clubroom/app/(tabs)/messages.tsx†L1-L193】【F:clubroom/app/(tabs)/messages.tsx†L194-L298】

## Booking & session management
- Booking detail pages show service, location, status, and quick actions (message coach, cancel) plus integrated session notes that load lazily, retry on error, and expose follow-up tasks parents will see. 【F:clubroom/app/booking/[id].tsx†L1-L146】【F:clubroom/app/booking/[id].tsx†L147-L248】
- Session notes are managed through a reusable hook that logs load/save attempts, guards missing booking IDs, and surfaces loading/saving/error states for views and forms. 【F:clubroom/hooks/use-session-note.ts†L1-L92】

## Scheduling & availability
- Coaches can save weekly recurring availability templates by toggling active days, cycling preset time ranges, and confirming via in-app alerts. 【F:clubroom/app/availability/set-schedule.tsx†L1-L78】
