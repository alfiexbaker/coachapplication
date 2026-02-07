"use strict";
/**
 * Invite Hold Service
 *
 * Manages soft-holds on availability slots for pending invites.
 * When a coach sends an invite with proposed slots, those slots are
 * temporarily held so other invite flows don't double-book them.
 *
 * Holds auto-expire when the invite expires or is resolved.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteHoldService = void 0;
const api_client_1 = require("./api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('InviteHoldService');
async function loadHolds() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.INVITE_SLOT_HOLDS, null);
        return stored || [];
    }
    catch (error) {
        logger.error('Failed to load holds', error);
        return [];
    }
}
async function saveHolds(holds) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.INVITE_SLOT_HOLDS, holds);
    }
    catch (error) {
        logger.error('Failed to save holds', error);
    }
}
exports.inviteHoldService = {
    /**
     * Create holds for all proposed slots in an invite.
     */
    async createHolds(coachId, inviteId, slots, expiresAt) {
        const holds = await loadHolds();
        const newHolds = slots.map((slot, i) => ({
            id: `hold_${inviteId}_${i}`,
            coachId,
            inviteId,
            slotDate: slot.date,
            slotStartTime: slot.startTime,
            slotEndTime: slot.endTime,
            expiresAt,
            status: 'active',
        }));
        holds.push(...newHolds);
        await saveHolds(holds);
        logger.info('Created holds', { inviteId, count: newHolds.length });
        return newHolds;
    },
    /**
     * Release all holds for an invite.
     */
    async releaseHoldsForInvite(inviteId) {
        const holds = await loadHolds();
        let changed = false;
        for (const hold of holds) {
            if (hold.inviteId === inviteId && hold.status === 'active') {
                hold.status = 'released';
                changed = true;
            }
        }
        if (changed) {
            await saveHolds(holds);
            logger.info('Released holds', { inviteId });
        }
    },
    /**
     * Release specific holds (e.g. non-selected slots on accept).
     */
    async releaseHolds(holdIds) {
        const holds = await loadHolds();
        let changed = false;
        for (const hold of holds) {
            if (holdIds.includes(hold.id) && hold.status === 'active') {
                hold.status = 'released';
                changed = true;
            }
        }
        if (changed) {
            await saveHolds(holds);
        }
    },
    /**
     * Get active (non-expired) holds for a coach.
     * Automatically filters out expired and released holds.
     */
    async getActiveHolds(coachId) {
        const holds = await loadHolds();
        const now = new Date().toISOString();
        return holds.filter((h) => h.coachId === coachId && h.status === 'active' && h.expiresAt > now);
    },
    /**
     * Check if a specific slot is held by a pending invite.
     */
    async isSlotHeld(coachId, date, startTime) {
        const active = await this.getActiveHolds(coachId);
        return active.some((h) => h.slotDate === date && h.slotStartTime === startTime);
    },
    /**
     * Cleanup stale holds (past expiry). Can be called periodically.
     */
    async cleanup() {
        const holds = await loadHolds();
        const now = new Date().toISOString();
        const active = holds.filter((h) => h.status === 'active' && h.expiresAt > now);
        const removed = holds.length - active.length;
        if (removed > 0) {
            await saveHolds(active);
            logger.info('Cleaned up stale holds', { removed });
        }
        return removed;
    },
};
