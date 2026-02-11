"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POC_ACCOUNT_ALIASES = exports.POC_ACCOUNT_IDS = void 0;
exports.isPocCoachId = isPocCoachId;
const account_id_1 = require("@/utils/account-id");
/**
 * Canonical account graph for the POC environment.
 *
 * Keep tests and demo flows anchored to these IDs so relationships stay stable.
 * Services may store legacy variants (for example "coach-1"); aliases handle that.
 */
exports.POC_ACCOUNT_IDS = {
    user: 'user1',
    parent: 'parent1',
    coach: 'coach1',
    coachStorage: 'coach-1',
    athlete: 'athlete1',
    athleteStorage: 'athlete-1',
    childSeed: 'child_tom',
};
exports.POC_ACCOUNT_ALIASES = {
    coach: [exports.POC_ACCOUNT_IDS.coach, exports.POC_ACCOUNT_IDS.coachStorage],
    athlete: [exports.POC_ACCOUNT_IDS.athlete, exports.POC_ACCOUNT_IDS.athleteStorage, exports.POC_ACCOUNT_IDS.childSeed],
    parent: [exports.POC_ACCOUNT_IDS.parent],
    user: [exports.POC_ACCOUNT_IDS.user],
};
function isPocCoachId(candidate) {
    const normalized = (0, account_id_1.normalizeAccountId)(candidate);
    return exports.POC_ACCOUNT_ALIASES.coach.some((id) => (0, account_id_1.normalizeAccountId)(id) === normalized);
}
