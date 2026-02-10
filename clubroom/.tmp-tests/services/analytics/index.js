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
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('AnalyticsFacade');
void logger;
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
    getAthleteAnalytics: (...args) => analytics_query_service_2.analyticsQueryService.getAthleteAnalytics(...args),
    /**
     * Get skill progression history for an athlete
     */
    getSkillHistory: (...args) => analytics_query_service_2.analyticsQueryService.getSkillHistory(...args),
    /**
     * Get all goals for an athlete
     */
    getAthleteGoals: (...args) => analytics_query_service_2.analyticsQueryService.getAthleteGoals(...args),
    /**
     * Get comparison stats (for radar chart)
     */
    getSkillComparison: (...args) => analytics_query_service_2.analyticsQueryService.getSkillComparison(...args),
    // ==========================================================================
    // TRACKING METHODS (from analyticsTrackingService)
    // ==========================================================================
    /**
     * Create a new goal
     */
    createGoal: (...args) => analytics_tracking_service_2.analyticsTrackingService.createGoal(...args),
    /**
     * Update goal progress
     */
    updateGoalProgress: (...args) => analytics_tracking_service_2.analyticsTrackingService.updateGoalProgress(...args),
    /**
     * Complete a milestone
     */
    completeMilestone: (...args) => analytics_tracking_service_2.analyticsTrackingService.completeMilestone(...args),
    /**
     * Add milestone to goal
     */
    addMilestone: (...args) => analytics_tracking_service_2.analyticsTrackingService.addMilestone(...args),
    /**
     * Abandon a goal
     */
    abandonGoal: (...args) => analytics_tracking_service_2.analyticsTrackingService.abandonGoal(...args),
    /**
     * Update skill level (called after session)
     */
    updateSkillLevel: (...args) => analytics_tracking_service_2.analyticsTrackingService.updateSkillLevel(...args),
};
/**
 * Coach analytics service facade that maintains the original API surface.
 * Delegates to analyticsExportService under the hood.
 */
exports.coachAnalyticsService = {
    /**
     * Get comprehensive analytics for a coach
     */
    getCoachAnalytics: (...args) => analytics_export_service_2.analyticsExportService.getCoachAnalytics(...args),
    /**
     * Get revenue chart data for a specific period
     */
    getRevenueChart: (...args) => analytics_export_service_2.analyticsExportService.getRevenueChart(...args),
    /**
     * Get retention metrics for a coach
     */
    getRetentionMetrics: (...args) => analytics_export_service_2.analyticsExportService.getRetentionMetrics(...args),
    /**
     * Get cancellation patterns and statistics
     */
    getCancellationPatterns: (...args) => analytics_export_service_2.analyticsExportService.getCancellationPatterns(...args),
    /**
     * Get peak hours data for heatmap visualization
     */
    getPeakHours: (...args) => analytics_export_service_2.analyticsExportService.getPeakHours(...args),
    /**
     * Get top skills taught by the coach
     */
    getTopSkills: (...args) => analytics_export_service_2.analyticsExportService.getTopSkills(...args),
    /**
     * Get session statistics
     */
    getSessionStats: (...args) => analytics_export_service_2.analyticsExportService.getSessionStats(...args),
    /**
     * Reset to mock data (useful for testing)
     */
    resetToMockData: (...args) => analytics_export_service_2.analyticsExportService.resetToMockData(...args),
};
