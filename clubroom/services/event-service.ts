/**
 * Event Service - Re-export Facade
 *
 * This file has been refactored into focused modules under services/event/.
 * It re-exports everything for full backward compatibility.
 *
 * See:
 * - services/event/event-crud-service.ts (CRUD operations, publish, cancel, invitations)
 * - services/event/event-rsvp-service.ts (RSVP management, calendar integration)
 * - services/event/event-attendance-service.ts (check-in, attendance tracking, stats)
 * - services/event/event-display-service.ts (formatting and display utilities)
 * - services/event/index.ts (unified facade)
 */

export { eventService } from './event/index';
export type { CreateEventInput } from './event/index';
