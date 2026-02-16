"use strict";
/**
 * Repeat Invite Helper
 *
 * Finds the next matching slot for a "repeat next week" flow.
 * Given a completed session, looks for the same day/time next week.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRepeatSlot = findRepeatSlot;
const availability_service_1 = require("../availability-service");
const logger_1 = require("@/utils/logger");
const format_1 = require("@/utils/format");
const logger = (0, logger_1.createLogger)('RepeatInviteHelper');
/**
 * Find the best slot to repeat a session next week.
 */
async function findRepeatSlot(coachId, originalDate, originalStartTime, sessionTemplateId) {
    // Calculate next week's matching date
    const orig = new Date(originalDate + 'T00:00:00');
    const nextWeek = new Date(orig);
    nextWeek.setDate(orig.getDate() + 7);
    const startDate = (0, format_1.toDateStr)(nextWeek);
    // Search the entire week for alternatives
    const weekEnd = new Date(nextWeek);
    weekEnd.setDate(nextWeek.getDate() + 6);
    const endDate = (0, format_1.toDateStr)(weekEnd);
    try {
        const slots = await availability_service_1.availabilityService.getInvitableSlots(coachId, startDate, endDate, sessionTemplateId);
        // Find exact match: same date + same start time
        const primarySlot = slots.find((s) => s.date === startDate && s.startTime === originalStartTime) || null;
        // Find alternatives: same date different time, or nearby dates same time
        const alternatives = slots
            .filter((s) => {
            if (primarySlot && s.date === primarySlot.date && s.startTime === primarySlot.startTime) {
                return false; // Exclude the primary slot
            }
            return true;
        })
            .slice(0, 5); // Max 5 alternatives
        return { primarySlot, alternatives };
    }
    catch (error) {
        logger.error('Failed to find repeat slot', error);
        return { primarySlot: null, alternatives: [] };
    }
}
