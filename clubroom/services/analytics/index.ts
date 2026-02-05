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
  getAthleteAnalytics: analyticsQueryService.getAthleteAnalytics.bind(analyticsQueryService),

  /**
   * Get skill progression history for an athlete
   */
  getSkillHistory: analyticsQueryService.getSkillHistory.bind(analyticsQueryService),

  /**
   * Get all goals for an athlete
   */
  getAthleteGoals: analyticsQueryService.getAthleteGoals.bind(analyticsQueryService),

  /**
   * Get comparison stats (for radar chart)
   */
  getSkillComparison: analyticsQueryService.getSkillComparison.bind(analyticsQueryService),

  // ==========================================================================
  // TRACKING METHODS (from analyticsTrackingService)
  // ==========================================================================

  /**
   * Create a new goal
   */
  createGoal: analyticsTrackingService.createGoal.bind(analyticsTrackingService),

  /**
   * Update goal progress
   */
  updateGoalProgress: analyticsTrackingService.updateGoalProgress.bind(analyticsTrackingService),

  /**
   * Complete a milestone
   */
  completeMilestone: analyticsTrackingService.completeMilestone.bind(analyticsTrackingService),

  /**
   * Add milestone to goal
   */
  addMilestone: analyticsTrackingService.addMilestone.bind(analyticsTrackingService),

  /**
   * Abandon a goal
   */
  abandonGoal: analyticsTrackingService.abandonGoal.bind(analyticsTrackingService),

  /**
   * Update skill level (called after session)
   */
  updateSkillLevel: analyticsTrackingService.updateSkillLevel.bind(analyticsTrackingService),
};

/**
 * Coach analytics service facade that maintains the original API surface.
 * Delegates to analyticsExportService under the hood.
 */
export const coachAnalyticsService = {
  /**
   * Get comprehensive analytics for a coach
   */
  getCoachAnalytics: analyticsExportService.getCoachAnalytics.bind(analyticsExportService),

  /**
   * Get revenue chart data for a specific period
   */
  getRevenueChart: analyticsExportService.getRevenueChart.bind(analyticsExportService),

  /**
   * Get retention metrics for a coach
   */
  getRetentionMetrics: analyticsExportService.getRetentionMetrics.bind(analyticsExportService),

  /**
   * Get cancellation patterns and statistics
   */
  getCancellationPatterns: analyticsExportService.getCancellationPatterns.bind(analyticsExportService),

  /**
   * Get peak hours data for heatmap visualization
   */
  getPeakHours: analyticsExportService.getPeakHours.bind(analyticsExportService),

  /**
   * Get top skills taught by the coach
   */
  getTopSkills: analyticsExportService.getTopSkills.bind(analyticsExportService),

  /**
   * Get session statistics
   */
  getSessionStats: analyticsExportService.getSessionStats.bind(analyticsExportService),

  /**
   * Reset to mock data (useful for testing)
   */
  resetToMockData: analyticsExportService.resetToMockData.bind(analyticsExportService),
};
