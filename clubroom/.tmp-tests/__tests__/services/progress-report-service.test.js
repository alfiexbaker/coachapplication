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
const progress_skills_service_1 = require("@/services/progress/progress-skills-service");
const progress_report_service_1 = require("@/services/progress/progress-report-service");
(0, node_test_1.describe)('progressReportService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SKILL_LEVELS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SESSION_FEEDBACK);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.GOALS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.BADGE_AWARDS);
    });
    (0, node_test_1.it)('aggregates athlete progress data (happy path)', async () => {
        await progress_skills_service_1.progressSkillsService.updateSkillLevel('athlete_pr_1', 'Passing', 6, 'coach_pr_1');
        await progress_feedback_service_1.progressFeedbackService.addSessionFeedback({
            sessionId: 'session_pr_1',
            coachId: 'coach_pr_1',
            coachName: 'Coach PR',
            athleteId: 'athlete_pr_1',
            athleteName: 'Athlete PR',
            publicSummary: 'Good rhythm and body shape',
            skillsWorkedOn: ['Passing'],
            skillRatings: [{ skill: 'Passing', rating: 6 }],
            improvements: 'Release timing',
            homework: 'Wall passing',
            effortRating: 4,
            overallPerformance: 4,
            visibility: 'parent',
        });
        const progress = await progress_report_service_1.progressReportService.getAthleteProgress('athlete_pr_1', 'parent');
        strict_1.default.equal(progress.athleteId, 'athlete_pr_1');
        strict_1.default.equal(progress.totalSessions, 1);
        strict_1.default.ok(progress.skills.length >= 1);
    });
    (0, node_test_1.it)('returns empty metrics for athlete with no activity (empty path)', async () => {
        const progress = await progress_report_service_1.progressReportService.getAthleteProgress('athlete_pr_none', 'parent');
        strict_1.default.equal(progress.totalSessions, 0);
        strict_1.default.deepEqual(progress.skills, []);
        strict_1.default.equal(progress.recentFeedback.length, 0);
    });
});
