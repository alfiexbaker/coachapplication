"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingService = void 0;
var index_1 = require("./booking/index");
Object.defineProperty(exports, "bookingService", { enumerable: true, get: function () { return index_1.bookingService; } });
