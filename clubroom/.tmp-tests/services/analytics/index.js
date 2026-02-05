"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.coachAnalyticsService = exports.analyticsService = exports.analyticsExportService = exports.analyticsQueryService = exports.analyticsTrackingService = void 0;
// Re-export individual services for direct use
var analytics_tracking_service_1 = require("./analytics-tracking-service");
Object.defineProperty(exports, "analyticsTrackingService", { enumerable: true, get: function () { return analytics_tracking_service_1.analyticsTrackingService; } });
var analytics_query_service_1 = require("./analytics-query-service");
Object.defineProperty(exports, "analyticsQueryService", { enumerable: true, get: function () { return analytics_query_service_1.analyticsQueryService; } });
var analytics_export_service_1 = require("./analytics-export-service");
Object.defineProperty(exports, "analyticsExportService", { enumerable: true, get: function () { return analytics_export_service_1.analyticsExportService; } });
// Import services for the unified facade
const analytics_tracking_service_2 = require("./analytics-tracking-service");
const analytics_query_service_2 = require("./analytics-query-service");
const analytics_export_service_2 = require("./analytics-export-service");
// ============================================================================
// UNIFIED FACADE FOR BACKWARD COMPATIBILITY
// ============================================================================
/**
 * Unified analytics service facade that maintains the original API surface.
 * Delegates to the appropriate focused service under the hood.
 */
exports.analyticsService = {
    // ==========================================================================
    // QUERY METHODS (from analyticsQueryService)
    // ==========================================================================
    /**
     * Get analytics for an athlete
     */
    getAthleteAnalytics: analytics_query_service_2.analyticsQueryService.getAthleteAnalytics.bind(analytics_query_service_2.analyticsQueryService),
    /**
     * Get skill progression history for an athlete
     */
    getSkillHistory: analytics_query_service_2.analyticsQueryService.getSkillHistory.bind(analytics_query_service_2.analyticsQueryService),
    /**
     * Get all goals for an athlete
     */
    getAthleteGoals: analytics_query_service_2.analyticsQueryService.getAthleteGoals.bind(analytics_query_service_2.analyticsQueryService),
    /**
     * Get comparison stats (for radar chart)
     */
    getSkillComparison: analytics_query_service_2.analyticsQueryService.getSkillComparison.bind(analytics_query_service_2.analyticsQueryService),
    // ==========================================================================
    // TRACKING METHODS (from analyticsTrackingService)
    // ==========================================================================
    /**
     * Create a new goal
     */
    createGoal: analytics_tracking_service_2.analyticsTrackingService.createGoal.bind(analytics_tracking_service_2.analyticsTrackingService),
    /**
     * Update goal progress
     */
    updateGoalProgress: analytics_tracking_service_2.analyticsTrackingService.updateGoalProgress.bind(analytics_tracking_service_2.analyticsTrackingService),
    /**
     * Complete a milestone
     */
    completeMilestone: analytics_tracking_service_2.analyticsTrackingService.completeMilestone.bind(analytics_tracking_service_2.analyticsTrackingService),
    /**
     * Add milestone to goal
     */
    addMilestone: analytics_tracking_service_2.analyticsTrackingService.addMilestone.bind(analytics_tracking_service_2.analyticsTrackingService),
    /**
     * Abandon a goal
     */
    abandonGoal: analytics_tracking_service_2.analyticsTrackingService.abandonGoal.bind(analytics_tracking_service_2.analyticsTrackingService),
    /**
     * Update skill level (called after session)
     */
    updateSkillLevel: analytics_tracking_service_2.analyticsTrackingService.updateSkillLevel.bind(analytics_tracking_service_2.analyticsTrackingService),
};
/**
 * Coach analytics service facade that maintains the original API surface.
 * Delegates to analyticsExportService under the hood.
 */
exports.coachAnalyticsService = {
    /**
     * Get comprehensive analytics for a coach
     */
    getCoachAnalytics: analytics_export_service_2.analyticsExportService.getCoachAnalytics.bind(analytics_export_service_2.analyticsExportService),
    /**
     * Get revenue chart data for a specific period
     */
    getRevenueChart: analytics_export_service_2.analyticsExportService.getRevenueChart.bind(analytics_export_service_2.analyticsExportService),
    /**
     * Get retention metrics for a coach
     */
    getRetentionMetrics: analytics_export_service_2.analyticsExportService.getRetentionMetrics.bind(analytics_export_service_2.analyticsExportService),
    /**
     * Get cancellation patterns and statistics
     */
    getCancellationPatterns: analytics_export_service_2.analyticsExportService.getCancellationPatterns.bind(analytics_export_service_2.analyticsExportService),
    /**
     * Get peak hours data for heatmap visualization
     */
    getPeakHours: analytics_export_service_2.analyticsExportService.getPeakHours.bind(analytics_export_service_2.analyticsExportService),
    /**
     * Get top skills taught by the coach
     */
    getTopSkills: analytics_export_service_2.analyticsExportService.getTopSkills.bind(analytics_export_service_2.analyticsExportService),
    /**
     * Get session statistics
     */
    getSessionStats: analytics_export_service_2.analyticsExportService.getSessionStats.bind(analytics_export_service_2.analyticsExportService),
    /**
     * Reset to mock data (useful for testing)
     */
    resetToMockData: analytics_export_service_2.analyticsExportService.resetToMockData.bind(analytics_export_service_2.analyticsExportService),
};
