"use strict";
/**
 * Session Display Service
 *
 * Handles formatting and display utilities for group sessions:
 * price formatting and session type labels.
 *
 * These are pure synchronous helpers with no persistence or API calls.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionDisplayService = void 0;
const logger_1 = require("@/utils/logger");
const _logger = (0, logger_1.createLogger)('SessionDisplayService');
exports.sessionDisplayService = {
    /**
     * Format price for display
     */
    formatPrice(amount, currency = 'GBP') {
        if (amount === 0)
            return 'Free';
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency,
        }).format(amount);
    },
    /**
     * Format session type for display
     */
    formatSessionType(type) {
        const labels = {
            CAMP: 'Camp',
            CLINIC: 'Clinic',
            TEAM_TRAINING: 'Team Training',
            OPEN_SESSION: 'Open Session',
            TRIAL: 'Trial Session',
            TRAINING: 'Training',
        };
        return labels[type] || type;
    },
};
