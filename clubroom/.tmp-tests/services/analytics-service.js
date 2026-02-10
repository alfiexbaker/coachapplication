"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coachAnalyticsService = exports.analyticsService = void 0;
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('AnalyticsService');
/**
 * Analytics Service - Re-export Facade
 *
 * This file has been refactored into focused modules under services/analytics/.
 * It re-exports everything for full backward compatibility.
 *
 * See:
 * - services/analytics/analytics-tracking-service.ts (goal management, skill updates)
 * - services/analytics/analytics-query-service.ts (athlete analytics, skill history, goals)
 * - services/analytics/analytics-export-service.ts (coach analytics, revenue, retention)
 * - services/analytics/index.ts (unified facade)
 */
var index_1 = require("./analytics/index");
Object.defineProperty(exports, "analyticsService", { enumerable: true, get: function () { return index_1.analyticsService; } });
Object.defineProperty(exports, "coachAnalyticsService", { enumerable: true, get: function () { return index_1.coachAnalyticsService; } });
