import { createLogger } from '@/utils/logger';
const logger = createLogger('AnalyticsService');

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

export { analyticsService, coachAnalyticsService } from './analytics/index';
export type { AnalyticsPeriod } from './analytics/index';
