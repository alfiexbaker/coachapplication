"use strict";
/**
 * API Contracts - Backend Integration Blueprint
 *
 * This file defines ALL API endpoints required to replace AsyncStorage
 * with a real backend. Each endpoint includes:
 * - HTTP method and path
 * - Request body/params type
 * - Response type
 * - Authentication requirements
 *
 * USAGE FOR BACKEND TEAM:
 * 1. Implement each endpoint following the contract
 * 2. Return data matching the response types
 * 3. All endpoints require JWT auth unless marked PUBLIC
 *
 * STATUS: Ready for backend implementation
 * PRIORITY: High (Core flows) → Medium → Low (Nice-to-have)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVICE_MIGRATION_STATUS = exports.API_CONFIG = void 0;
// ============================================================================
// API CONFIGURATION
// ============================================================================
exports.API_CONFIG = {
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.clubroom.app',
    version: 'v1',
    timeout: 30000,
};
// ============================================================================
// SERVICE MIGRATION STATUS
// ============================================================================
/**
 * Current services and their API readiness status
 * Use this to track backend implementation progress
 */
exports.SERVICE_MIGRATION_STATUS = {
    // HIGH PRIORITY - Core booking flow
    'availability-service': { status: 'READY', endpoints: 8 },
    'booking-service': { status: 'READY', endpoints: 6 },
    'invite-service': { status: 'READY', endpoints: 5 },
    'family-service': { status: 'READY', endpoints: 10 },
    'wallet-service': { status: 'READY', endpoints: 4 },
    'earnings-service': { status: 'READY', endpoints: 4 },
    // MEDIUM PRIORITY - Supporting features
    'notification-service': { status: 'READY', endpoints: 6 },
    'badge-service': { status: 'READY', endpoints: 4 },
    'review-service': { status: 'READY', endpoints: 2 },
    'scheduling-rules-service': { status: 'READY', endpoints: 6 }, // Includes cancellation policies
    // LOWER PRIORITY - Can use mock data longer
    'discover-service': { status: 'PARTIAL', endpoints: 2 },
    'analytics-service': { status: 'PARTIAL', endpoints: 3 },
    'social-feed-service': { status: 'PARTIAL', endpoints: 4 },
    'messaging-service': { status: 'PARTIAL', endpoints: 5 },
    'club-service': { status: 'PARTIAL', endpoints: 6 },
};
