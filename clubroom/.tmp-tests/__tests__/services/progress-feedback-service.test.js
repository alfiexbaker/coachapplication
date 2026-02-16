"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const progress_feedback_service_1 = require("@/services/progress/progress-feedback-service");
(0, node_test_1.describe)('progressFeedbackService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SESSION_FEEDBACK);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SESSION_NOTES);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SKILL_LEVELS);
    });
    (0, node_test_1.it)('adds and retrieves session feedback (happy path)', async () => {
        const feedback = await progress_feedback_service_1.progressFeedbackService.addSessionFeedback({
            sessionId: 'session_pf_1',
            coachId: 'coach_pf_1',
            coachName: 'Coach PF',
            athleteId: 'athlete_pf_1',
            athleteName: 'Athlete PF',
            publicSummary: 'Solid technical work',
            skillsWorkedOn: ['Passing'],
            skillRatings: [{ skill: 'Passing', rating: 7 }],
            improvements: 'Release ball earlier',
            homework: 'Wall passing 20 mins',
            effortRating: 4,
            overallPerformance: 4,
            visibility: 'parent',
            privateNotes: 'Monitor posture under pressure',
        });
        const fetched = await progress_feedback_service_1.progressFeedbackService.getSessionFeedback('session_pf_1');
        strict_1.default.equal(fetched?.id, feedback.id);
        strict_1.default.equal(fetched?.athleteId, 'athlete_pf_1');
    });
    (0, node_test_1.it)('filters out coach-only feedback for parent view (empty path for parent-visible set)', async () => {
        await progress_feedback_service_1.progressFeedbackService.addSessionFeedback({
            sessionId: 'session_pf_2',
            coachId: 'coach_pf_1',
            coachName: 'Coach PF',
            athleteId: 'athlete_pf_2',
            athleteName: 'Athlete PF2',
            publicSummary: 'Coach-only note',
            skillsWorkedOn: ['Defending'],
            skillRatings: [{ skill: 'Defending', rating: 6 }],
            improvements: 'Body orientation',
            homework: 'Mirror footwork',
            effortRating: 3,
            overallPerformance: 3,
            visibility: 'coach_only',
            privateNotes: 'Not parent visible',
        });
        const parentView = await progress_feedback_service_1.progressFeedbackService.getFeedbackForAthlete('athlete_pf_2', 'parent');
        strict_1.default.deepEqual(parentView, []);
    });
    (0, node_test_1.it)('saves and returns session notes', async () => {
        await progress_feedback_service_1.progressFeedbackService.saveSessionNote('booking_pf_1', {
            summary: 'Good rhythm',
            focus: ['Scanning'],
            improvements: 'Faster head checks',
            homework: '2 touch rondo',
            effort: 5,
            attendance: 'present',
        });
        const note = await progress_feedback_service_1.progressFeedbackService.getSessionNote('booking_pf_1');
        strict_1.default.ok(note);
        strict_1.default.equal(note?.summary, 'Good rhythm');
    });
});
