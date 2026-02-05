"use strict";
/**
 * Event Display Service
 *
 * Handles formatting and display utilities for events: type labels, icons,
 * colors, price formatting, date/time formatting, and RSVP status display.
 *
 * These are pure synchronous helpers with no persistence or API calls.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventDisplayService = void 0;
const logger_1 = require("@/utils/logger");
const _logger = (0, logger_1.createLogger)('EventDisplayService');
exports.eventDisplayService = {
    /**
     * Format event type for display
     */
    formatEventType(type) {
        const labels = {
            TOURNAMENT: 'Tournament',
            SOCIAL: 'Social Event',
            MEETING: 'Meeting',
            PRESENTATION: 'Presentation',
            FUNDRAISER: 'Fundraiser',
            TRIAL_DAY: 'Trial Day',
            TRAINING_CAMP: 'Training Camp',
            OTHER: 'Other',
        };
        return labels[type] || type;
    },
    /**
     * Get event type icon
     */
    getEventTypeIcon(type) {
        const icons = {
            TOURNAMENT: 'trophy',
            SOCIAL: 'people',
            MEETING: 'chatbubbles',
            PRESENTATION: 'ribbon',
            FUNDRAISER: 'cash',
            TRIAL_DAY: 'football',
            TRAINING_CAMP: 'fitness',
            OTHER: 'calendar',
        };
        return icons[type] || 'calendar';
    },
    /**
     * Get event type color
     */
    getEventTypeColor(type) {
        const colors = {
            TOURNAMENT: '#F59E0B', // amber
            SOCIAL: '#8B5CF6', // purple
            MEETING: '#3B82F6', // blue
            PRESENTATION: '#10B981', // green
            FUNDRAISER: '#EC4899', // pink
            TRIAL_DAY: '#06B6D4', // cyan
            TRAINING_CAMP: '#EF4444', // red
            OTHER: '#6B7280', // gray
        };
        return colors[type] || '#6B7280';
    },
    /**
     * Format audience for display
     */
    formatAudience(audience) {
        const labels = {
            ALL: 'Everyone',
            COACHES: 'Coaches Only',
            PARENTS: 'Parents Only',
            ATHLETES: 'Athletes Only',
            SQUAD: 'Specific Squads',
        };
        return labels[audience] || audience;
    },
    /**
     * Format price for display
     */
    formatPrice(price, currency = 'GBP') {
        if (price === 0)
            return 'Free';
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency,
        }).format(price);
    },
    /**
     * Format date for display
     */
    formatEventDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    },
    /**
     * Format time for display
     */
    formatEventTime(startTime, endTime) {
        if (endTime) {
            return `${startTime} - ${endTime}`;
        }
        return startTime;
    },
    /**
     * Format RSVP status for display
     */
    formatRSVPStatus(status) {
        const labels = {
            GOING: 'Going',
            NOT_GOING: "Can't Go",
            MAYBE: 'Maybe',
        };
        return labels[status] || status;
    },
    /**
     * Get RSVP status color
     */
    getRSVPStatusColor(status) {
        const colors = {
            GOING: '#10B981', // green
            NOT_GOING: '#EF4444', // red
            MAYBE: '#F59E0B', // amber
        };
        return colors[status] || '#6B7280';
    },
    /**
     * Get RSVP status icon
     */
    getRSVPStatusIcon(status) {
        const icons = {
            GOING: 'checkmark-circle',
            NOT_GOING: 'close-circle',
            MAYBE: 'help-circle',
        };
        return icons[status] || 'ellipse';
    },
    /**
     * Format time ago for display
     */
    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        if (diffDays === 1)
            return 'Yesterday';
        if (diffDays < 7)
            return `${diffDays}d ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    },
};
