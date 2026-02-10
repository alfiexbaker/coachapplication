import { createLogger } from '@/utils/logger';
const logger = createLogger('BookingService');

/**
 * Booking Service - Re-export Facade
 *
 * This file has been refactored into focused modules under services/booking/.
 * It re-exports everything for full backward compatibility.
 *
 * See:
 * - services/booking/booking-crud-service.ts (CRUD, draft, validation, creation)
 * - services/booking/booking-status-service.ts (confirmations, status transitions, reminders)
 * - services/booking/booking-search-service.ts (user queries, upcoming, awaiting completion)
 * - services/booking/index.ts (unified facade)
 */

export { bookingService } from './booking/index';
export type { BookingDraft, CreateBookingParams } from './booking/index';
