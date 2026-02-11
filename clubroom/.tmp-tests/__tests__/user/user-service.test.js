"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const poc_accounts_1 = require("@/constants/poc-accounts");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const event_bus_1 = require("@/services/event-bus");
const user_service_1 = require("@/services/user-service");
const USERS_SEED = [
    {
        id: 'user-a',
        email: 'coach.a@example.com',
        role: 'COACH',
        name: 'Coach Alpha',
        postcode: 'E1 1AA',
        dateOfBirth: '1990-01-01',
    },
    {
        id: 'user-b',
        email: 'parent.b@example.com',
        role: 'USER',
        name: 'Parent Bravo',
        postcode: 'SW1A 1AA',
        dateOfBirth: '1988-05-10',
    },
];
(0, node_test_1.describe)('userService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.USERS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.AUTH_USER);
        event_bus_1.eventBus.clearAll();
    });
    (0, node_test_1.it)('maps current user from AUTH_USER fallback (happy path)', async () => {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AUTH_USER, {
            id: 'auth-user-1',
            firstName: 'Alex',
            lastName: 'Stone',
            email: 'alex.stone@example.com',
            accountType: 'COACH',
        });
        const result = await user_service_1.userService.getCurrentUser();
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data.id, 'auth-user-1');
        strict_1.default.equal(result.data.name, 'Alex Stone');
        strict_1.default.equal(result.data.role, 'COACH');
    });
    (0, node_test_1.it)('returns not found for unknown user id (error path)', async () => {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.USERS, USERS_SEED);
        const result = await user_service_1.userService.getUserById('user-missing');
        strict_1.default.equal(result.success, false);
        if (result.success)
            return;
        strict_1.default.equal(result.error.code, 'NOT_FOUND');
    });
    (0, node_test_1.it)('resolves canonical account aliases (coach1 -> coach-1)', async () => {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.USERS, [
            ...USERS_SEED,
            {
                id: poc_accounts_1.POC_ACCOUNT_IDS.coachStorage,
                email: 'coach.one@example.com',
                role: 'COACH',
                name: 'Coach One',
                postcode: 'N1 1AA',
                dateOfBirth: '1991-04-10',
            },
        ]);
        const result = await user_service_1.userService.getUserById(poc_accounts_1.POC_ACCOUNT_IDS.coach);
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data.id, poc_accounts_1.POC_ACCOUNT_IDS.coachStorage);
    });
    (0, node_test_1.it)('returns empty list for empty id input (empty path)', async () => {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.USERS, USERS_SEED);
        const result = await user_service_1.userService.getUsersByIds([]);
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.deepEqual(result.data, []);
    });
    (0, node_test_1.it)('searches users by name/email/role', async () => {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.USERS, USERS_SEED);
        const byRole = await user_service_1.userService.searchUsers('coach');
        strict_1.default.equal(byRole.success, true);
        if (byRole.success) {
            strict_1.default.equal(byRole.data.length, 1);
            strict_1.default.equal(byRole.data[0].id, 'user-a');
        }
        const byEmail = await user_service_1.userService.searchUsers('parent.b@');
        strict_1.default.equal(byEmail.success, true);
        if (byEmail.success) {
            strict_1.default.equal(byEmail.data.length, 1);
            strict_1.default.equal(byEmail.data[0].id, 'user-b');
        }
    });
    (0, node_test_1.it)('updates user profile and emits USER_UPDATED + USER_PROFILE_CHANGED', async () => {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.USERS, USERS_SEED);
        const emitted = [];
        const offUpdated = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.USER_UPDATED, () => emitted.push('updated'));
        const offProfile = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.USER_PROFILE_CHANGED, () => emitted.push('profile'));
        const result = await user_service_1.userService.updateUserProfile('user-a', {
            name: 'Coach Alpha Prime',
            postcode: 'N1 9GU',
        });
        offUpdated();
        offProfile();
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data.name, 'Coach Alpha Prime');
        strict_1.default.equal(result.data.postcode, 'N1 9GU');
        strict_1.default.deepEqual(emitted.sort(), ['profile', 'updated']);
    });
    (0, node_test_1.it)('returns storage error when user load fails', async () => {
        const apiClientInternals = api_client_1.apiClient;
        const originalGet = apiClientInternals.get;
        apiClientInternals.get = async () => {
            throw new Error('forced user load failure');
        };
        try {
            const result = await user_service_1.userService.getUserById('user-any');
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'STORAGE');
        }
        finally {
            apiClientInternals.get = originalGet;
        }
    });
});
