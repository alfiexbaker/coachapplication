"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const session_invite_service_1 = require("@/services/invite/session-invite-service");
const poc_accounts_1 = require("@/constants/poc-accounts");
function expectOk(result) {
    strict_1.default.equal(result.success, true);
    return result.data;
}
let seq = 0;
function nextId(prefix) {
    seq += 1;
    return `${prefix}_${seq}`;
}
(0, node_test_1.describe)('sessionInviteService', () => {
    (0, node_test_1.beforeEach)(async () => {
        seq = 0;
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_INVITES, []);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.INVITE_SLOT_HOLDS, []);
        await session_invite_service_1.sessionInviteService.clearCache();
    });
    (0, node_test_1.it)('creates invite and retrieves it by id', async () => {
        const parentId = nextId('parent');
        const invite = expectOk(await session_invite_service_1.sessionInviteService.createInvite(nextId('athlete'), {
            coachId: nextId('coach'),
            coachName: 'Coach Test',
            parentId,
            parentName: 'Parent Test',
            athleteNames: 'Athlete Test',
            proposedSlots: [],
            sessionType: '1:1 Coaching',
            focus: 'Passing',
            priceUsd: 50,
            duration: 60,
        }));
        const fetched = await session_invite_service_1.sessionInviteService.getInvite(invite.id);
        strict_1.default.ok(fetched);
        strict_1.default.equal(fetched?.id, invite.id);
        strict_1.default.equal(fetched?.parentId, parentId);
        strict_1.default.equal(fetched?.status, 'PENDING');
    });
    (0, node_test_1.it)('responds to invite with DECLINED and updates status', async () => {
        const invite = expectOk(await session_invite_service_1.sessionInviteService.createInvite(nextId('athlete'), {
            coachId: nextId('coach'),
            coachName: 'Coach Test',
            parentId: nextId('parent'),
            parentName: 'Parent Test',
            athleteNames: 'Athlete Test',
            proposedSlots: [],
            sessionType: '1:1 Coaching',
            focus: 'Finishing',
        }));
        const updated = expectOk(await session_invite_service_1.sessionInviteService.respondToInvite({
            inviteId: invite.id,
            response: 'DECLINED',
        }));
        strict_1.default.equal(updated.status, 'DECLINED');
    });
    (0, node_test_1.it)('cancels invite and excludes it from open invites', async () => {
        const invite = expectOk(await session_invite_service_1.sessionInviteService.createInvite(nextId('athlete'), {
            coachId: nextId('coach'),
            coachName: 'Coach Test',
            parentId: nextId('parent'),
            parentName: 'Parent Test',
            athleteNames: 'Athlete Test',
            proposedSlots: [],
            sessionType: '1:1 Coaching',
            focus: 'Dribbling',
        }));
        await session_invite_service_1.sessionInviteService.cancelInvite(invite.id);
        const fetched = await session_invite_service_1.sessionInviteService.getInvite(invite.id);
        strict_1.default.equal(fetched?.status, 'EXPIRED');
        const openInvites = await session_invite_service_1.sessionInviteService.getOpenInvites();
        strict_1.default.ok(!openInvites.some((item) => item.id === invite.id));
    });
    (0, node_test_1.it)('matches canonical aliases in coach/parent invite lookups', async () => {
        const created = expectOk(await session_invite_service_1.sessionInviteService.createInvite(poc_accounts_1.POC_ACCOUNT_IDS.athleteStorage, {
            coachId: poc_accounts_1.POC_ACCOUNT_IDS.coachStorage,
            coachName: 'Coach Alias',
            parentId: poc_accounts_1.POC_ACCOUNT_IDS.parent,
            parentName: 'Parent Alias',
            athleteNames: 'Athlete Alias',
            proposedSlots: [],
            sessionType: '1:1 Coaching',
            focus: 'Passing',
        }));
        const byCoach = await session_invite_service_1.sessionInviteService.getCoachInvites(poc_accounts_1.POC_ACCOUNT_IDS.coach);
        const byParent = await session_invite_service_1.sessionInviteService.getParentInvites(poc_accounts_1.POC_ACCOUNT_IDS.parent);
        strict_1.default.ok(byCoach.length >= 1);
        strict_1.default.ok(byParent.length >= 1);
        strict_1.default.ok(byCoach.some((invite) => invite.id === created.id));
        strict_1.default.ok(byParent.some((invite) => invite.id === created.id));
    });
});
