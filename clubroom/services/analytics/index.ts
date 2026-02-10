/**
 * Analytics Service Module
 *
 * Provides detailed analytics for athletes and coaches.
 * Tracks progress, skills, goals, and performance metrics.
 *
 * This module is split into focused services:
 * - analyticsTrackingService: Event tracking (skill updates, goal management)
 * - analyticsQueryService: Querying and aggregation (athlete analytics, skill history, goals)
 * - analyticsExportService: Coach analytics, reports, and export (revenue, retention, etc.)
 *
 * This index file provides unified facades (analyticsService, coachAnalyticsService)
 * for backward compatibility, re-exporting all functionality from the split services.
 *
 * API Integration Notes:
 * - GET /api/athletes/:id/analytics?period=MONTH - Get analytics
 * - GET /api/athletes/:id/skills/history - Skill progression
 * - POST /api/athletes/:id/goals - Create goal
 * - PATCH /api/goals/:id/progress - Update progress
 */

// Re-export individual services for direct use
export { analyticsTrackingService } from './analytics-tracking-service';
export { analyticsQueryService } from './analytics-query-service';
export { analyticsExportService } from './analytics-export-service';

// Re-export types
export type { AnalyticsPeriod } from './analytics-query-service';

// Import services for the unified facade
import { analyticsTrackingService } from './analytics-tracking-service';
import { analyticsQueryService } from './analytics-query-service';
import { analyticsExportService } from './analytics-export-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AnalyticsFacade');
void logger;

// ============================================================================
// UNIFIED FACADE FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Unified analytics service facade that maintains the original API surface.
 * Delegates to the appropriate focused service under the hood.
 */
export const analyticsService = {
  // ==========================================================================
  // QUERY METHODS (from analyticsQueryService)
  // ==========================================================================

  /**
   * Get analytics for an athlete
   */
  getAthleteAnalytics: (
    ...args: Parameters<typeof analyticsQueryService.getAthleteAnalytics>
  ) => analyticsQueryService.getAthleteAnalytics(...args),

  /**
   * Get skill progression history for an athlete
   */
  getSkillHistory: (
    ...args: Parameters<typeof analyticsQueryService.getSkillHistory>
  ) => analyticsQueryService.getSkillHistory(...args),

  /**
   * Get all goals for an athlete
   */
  getAthleteGoals: (
    ...args: Parameters<typeof analyticsQueryService.getAthleteGoals>
  ) => analyticsQueryService.getAthleteGoals(...args),

  /**
   * Get comparison stats (for radar chart)
   */
  getSkillComparison: (
    ...args: Parameters<typeof analyticsQueryService.getSkillComparison>
  ) => analyticsQueryService.getSkillComparison(...args),

  // ==========================================================================
  // TRACKING METHODS (from analyticsTrackingService)
  // ==========================================================================

  /**
   * Create a new goal
   */
  createGoal: (
    ...args: Parameters<typeof analyticsTrackingService.createGoal>
  ) => analyticsTrackingService.createGoal(...args),

  /**
   * Update goal progress
   */
  updateGoalProgress: (
    ...args: Parameters<typeof analyticsTrackingService.updateGoalProgress>
  ) => analyticsTrackingService.updateGoalProgress(...args),

  /**
   * Complete a milestone
   */
  completeMilestone: (
    ...args: Parameters<typeof analyticsTrackingService.completeMilestone>
  ) => analyticsTrackingService.completeMilestone(...args),

  /**
   * Add milestone to goal
   */
  addMilestone: (
    ...args: Parameters<typeof analyticsTrackingService.addMilestone>
  ) => analyticsTrackingService.addMilestone(...args),

  /**
   * Abandon a goal
   */
  abandonGoal: (
    ...args: Parameters<typeof analyticsTrackingService.abandonGoal>
  ) => analyticsTrackingService.abandonGoal(...args),

  /**
   * Update skill level (called after session)
   */
  updateSkillLevel: (
    ...args: Parameters<typeof analyticsTrackingService.updateSkillLevel>
  ) => analyticsTrackingService.updateSkillLevel(...args),
};

/**
 * Coach analytics service facade that maintains the original API surface.
 * Delegates to analyticsExportService under the hood.
 */
export const coachAnalyticsService = {
  /**
   * Get comprehensive analytics for a coach
   */
  getCoachAnalytics: (
    ...args: Parameters<typeof analyticsExportService.getCoachAnalytics>
  ) => analyticsExportService.getCoachAnalytics(...args),

  /**
   * Get revenue chart data for a specific period
   */
  getRevenueChart: (
    ...args: Parameters<typeof analyticsExportService.getRevenueChart>
  ) => analyticsExportService.getRevenueChart(...args),

  /**
   * Get retention metrics for a coach
   */
  getRetentionMetrics: (
    ...args: Parameters<typeof analyticsExportService.getRetentionMetrics>
  ) => analyticsExportService.getRetentionMetrics(...args),

  /**
   * Get cancellation patterns and statistics
   */
  getCancellationPatterns: (
    ...args: Parameters<typeof analyticsExportService.getCancellationPatterns>
  ) => analyticsExportService.getCancellationPatterns(...args),

  /**
   * Get peak hours data for heatmap visualization
   */
  getPeakHours: (
    ...args: Parameters<typeof analyticsExportService.getPeakHours>
  ) => analyticsExportService.getPeakHours(...args),

  /**
   * Get top skills taught by the coach
   */
  getTopSkills: (
    ...args: Parameters<typeof analyticsExportService.getTopSkills>
  ) => analyticsExportService.getTopSkills(...args),

  /**
   * Get session statistics
   */
  getSessionStats: (
    ...args: Parameters<typeof analyticsExportService.getSessionStats>
  ) => analyticsExportService.getSessionStats(...args),

  /**
   * Reset to mock data (useful for testing)
   */
  resetToMockData: (
    ...args: Parameters<typeof analyticsExportService.resetToMockData>
  ) => analyticsExportService.resetToMockData(...args),
};
