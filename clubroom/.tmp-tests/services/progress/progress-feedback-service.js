"use strict";
/**
 * Progress Feedback Service
 *
 * Handles session feedback and session notes: create, read, filter
 * with role-based visibility control.
 *
 * API Integration Notes:
 * - Feedback and notes are persisted via apiClient (AsyncStorage in dev, API in prod)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressFeedbackService = void 0;
const api_client_1 = require("../api-client");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const progress_skills_service_1 = require("./progress-skills-service");
const logger = (0, logger_1.createLogger)('ProgressFeedbackService');
// ============================================================================
// SESSION FEEDBACK MANAGEMENT
// ============================================================================
async function getAllSessionFeedback() {
    return api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SESSION_FEEDBACK, []);
}
async function addSessionFeedback(feedback) {
    const allFeedback = await getAllSessionFeedback();
    const newFeedback = {
        ...feedback,
        id: `feedback_${Date.now()}`,
        createdAt: new Date().toISOString(),
    };
    // Update skill levels based on ratings
    if (feedback.skillRatings && feedback.skillRatings.length > 0) {
        await progress_skills_service_1.progressSkillsService.updateMultipleSkillLevels(feedback.athleteId, feedback.skillRatings.map((r) => ({ skill: r.skill, level: r.rating })), feedback.coachId);
    }
    allFeedback.unshift(newFeedback);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_FEEDBACK, allFeedback);
    logger.info('session_feedback_added', {
        feedbackId: newFeedback.id,
        sessionId: feedback.sessionId,
        athleteId: feedback.athleteId,
        coachId: feedback.coachId,
        skillCount: feedback.skillRatings?.length ?? 0,
    });
    return newFeedback;
}
async function getSessionFeedback(sessionId) {
    const allFeedback = await getAllSessionFeedback();
    return allFeedback.find((f) => f.sessionId === sessionId) ?? null;
}
async function getFeedbackForAthlete(athleteId, viewerRole, limit) {
    const allFeedback = await getAllSessionFeedback();
    let filtered = allFeedback.filter((f) => f.athleteId === athleteId);
    // Filter based on visibility
    if (viewerRole === 'parent') {
        filtered = filtered.filter((f) => f.visibility !== 'coach_only');
        // Remove private notes for parents
        filtered = filtered.map((f) => ({ ...f, privateNotes: undefined }));
    }
    else if (viewerRole === 'athlete') {
        filtered = filtered.filter((f) => f.visibility === 'athlete');
        // Remove private notes for athletes
        filtered = filtered.map((f) => ({ ...f, privateNotes: undefined }));
    }
    if (limit) {
        filtered = filtered.slice(0, limit);
    }
    return filtered;
}
// ============================================================================
// SESSION NOTES MANAGEMENT
// ============================================================================
async function getAllSessionNotes() {
    return api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SESSION_NOTES, {});
}
async function getSessionNote(bookingId) {
    const notes = await getAllSessionNotes();
    return notes[bookingId] ?? null;
}
async function saveSessionNote(bookingId, payload) {
    const existing = await getAllSessionNotes();
    const record = {
        ...payload,
        updatedAt: new Date().toISOString(),
    };
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_NOTES, { ...existing, [bookingId]: record });
    logger.info('session_note_saved', {
        bookingId,
        focusAreas: payload.focus.length,
        videoCount: payload.videoUrls?.length ?? 0,
        imageCount: payload.imageUrls?.length ?? 0,
    });
    return record;
}
// ============================================================================
// EXPORTS
// ============================================================================
exports.progressFeedbackService = {
    addSessionFeedback,
    getSessionFeedback,
    getFeedbackForAthlete,
    getSessionNote,
    saveSessionNote,
};
