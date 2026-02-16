"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureCoachSessionsSeeded = ensureCoachSessionsSeeded;
const coach_session_seeds_1 = require("@/constants/coach-session-seeds");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const relational_demo_seed_service_1 = require("@/services/relational-demo-seed-service");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('CoachSessionSeedService');
async function ensureCoachSessionsSeeded() {
    try {
        await (0, relational_demo_seed_service_1.ensureRelationalDemoSeeded)();
        const existing = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_SESSIONS, []);
        if (existing.length > 0)
            return existing;
        const seeds = (0, coach_session_seeds_1.buildCoachSessionSeeds)();
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COACH_SESSIONS, seeds);
        logger.info('coach_sessions_seeded', { count: seeds.length });
        return seeds;
    }
    catch (error) {
        logger.error('failed_to_seed_coach_sessions', error);
        return [];
    }
}
