"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventService = void 0;
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('EventService');
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
var index_1 = require("./event/index");
Object.defineProperty(exports, "eventService", { enumerable: true, get: function () { return index_1.eventService; } });
