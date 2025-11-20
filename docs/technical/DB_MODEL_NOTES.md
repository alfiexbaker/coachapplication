# Database Model Notes (Planning Only)

> No database has been provisioned yet—this document captures proposed schema, relationships, and sequencing for future migrations.

## Core Entities
| Table | Key Fields | Relationships | Notes |
| --- | --- | --- | --- |
| `User` | `id`, `email`, `phone`, `role` (coach/parent/admin), `authProvider`, `status` | 1:1 with `CoachProfile` or `ParentProfile`; FK from `Message`, `ModerationCase` | Soft delete via `deletedAt` |
| `CoachProfile` | `userId`, `bio`, `headline`, `sports[]`, `pricingSummary`, `geoPoint`, `verificationStatus` | Has many `Service`, `AvailabilitySlot`, `Booking` (as coach) | Store `stripeAccountId` once payments live |
| `ParentProfile` | `userId`, `defaultLocation`, `householdNotes` | Has many `Child`, `Booking` (as parent) | Preferences for notifications |
| `Child` | `parentId`, `firstName`, `dob`, `medicalNotes`, `preferredFoot` | Linked to `Booking`, `PerformanceEntry` | Age derived for eligibility rules |
| `Service` | `coachId`, `title`, `format`, `durationMinutes`, `priceUsd`, `maxAthletes`, `locationType` | Referenced by `AvailabilitySlot`, `Booking` | Future: tiered pricing & promo codes |
| `AvailabilitySlot` | `coachId`, `serviceId`, `start`, `end`, `capacity`, `recurrenceRule`, `status` | Bookings reference slot; indexes on `start`, `geoPoint` | `status` includes `open`, `held`, `blocked` |
| `Booking` | `parentId`, `childId`, `coachId`, `serviceId`, `slotId`, `status`, `notes`, `cancellationReason`, `paymentStatus` | Connects to `Message`, `Attendance`, `PerformanceEntry`, `Invoice` | Lifecycle tracked via status history table |
| `Attendance` | `bookingId`, `coachMark`, `parentConfirm`, `notes`, `recordedAt` | 1:1 with booking but flexible for edits | Feeds performance timeline |
| `Invite` | `token`, `email`, `role`, `expiresAt`, `status`, `metadata` | Optionally tied to `CoachProfile` or `ParentProfile` once accepted | Audit fields for who sent invite |

## Future / Pluggable Tables
| Table | Purpose | Dependencies |
| --- | --- | --- |
| `Message` | Store chat messages + attachments | Booking must exist; references `User` |
| `MessageAttachment` | Metadata for media stored in buckets | Links to `Message` |
| `PerformanceEntry` | Notes/media/metrics from sessions | Booking + Child |
| `PerformanceMetric` | Structured metric data (value, unit, trend) | PerformanceEntry |
| `VerificationDocument` | Track KYC/DBS/Insurance artifacts | CoachProfile |
| `PaymentTransaction` | Stripe payment + payout records | Booking, CoachProfile |
| `Invoice` | Parent-facing invoice per booking | Booking, PaymentTransaction |
| `ModerationCase` | Reports from chat/media | Booking, Message, User |
| `SafeguardingReport` | High-severity cases needing escalation | Booking, Child |

## Relationship Diagram Notes
- One parent can have multiple children; bookings always reference exactly one child to keep progress tracking precise.
- Services define pricing + format; availability slots reference service to inherit duration/price, allowing bulk edits by updating service.
- Booking stores denormalized fields (coachName, serviceTitle) for historical accuracy even if coach later edits profile.

## Indexing & Querying
- Geo indexes: `CoachProfile.geoPoint` for discovery radius queries; `AvailabilitySlot` may include derived `geoHash` for map bounds.
- Compound index on `Booking` (`coachId`, `status`, `startTime`) for coach calendar queries.
- Partial index on `PerformanceEntry` for `childId` + `entryType` to speed timeline filters.

## Migration Sequencing (Future)
1. **Auth core**: `User`, `CoachProfile`, `ParentProfile`, `Child`, `Invite`.
2. **Availability/Booking**: `Service`, `AvailabilitySlot`, `Booking`, `Attendance`.
3. **Messaging/Performance**: `Message`, `MessageAttachment`, `PerformanceEntry`, `PerformanceMetric`.
4. **Trust/Payments**: `VerificationDocument`, `PaymentTransaction`, `Invoice`, `ModerationCase`, `SafeguardingReport`.

## Data Integrity Rules
- Enforce FK constraints with cascading soft delete checks (e.g., cannot delete coach if bookings exist; mark as inactive instead).
- Use database triggers or Prisma middleware to ensure slot capacity decrements/increments atomically on booking create/cancel.
- Audit tables for status changes: `BookingStatusHistory`, `VerificationStatusHistory` (not detailed here but recommended).

## Seed & Fixture Strategy
- Seed reference data: sports, skill tags, price units, verification track types.
- Provide fixture scripts for demo environments (sample coaches, parents, children, bookings) without real PII.
- Keep separate `.seed.json` per sprint module to prevent monolithic seeds.

## Outstanding Questions
- Should children have their own login in future? (Potential `ChildUser` linking.)
- Do we store GPS traces for sessions? (Not MVP; consider privacy implications.)
- How to version structured notes templates? (Option: `PerformanceTemplate` table for future customization.)
