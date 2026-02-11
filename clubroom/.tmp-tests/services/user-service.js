"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const storage_keys_1 = require("@/constants/storage-keys");
const result_1 = require("@/types/result");
const logger_1 = require("@/utils/logger");
const api_client_1 = require("./api-client");
const event_bus_1 = require("./event-bus");
const logger = (0, logger_1.createLogger)('UserService');
function normalizeUserRole(rawRole, rawAccountType) {
    const candidate = (typeof rawRole === 'string'
        ? rawRole
        : typeof rawAccountType === 'string'
            ? rawAccountType
            : 'USER').toUpperCase();
    if (candidate === 'COACH' || candidate === 'PARENT' || candidate === 'ADMIN' || candidate === 'USER') {
        return candidate;
    }
    // Auth profile can return ATHLETE; app-level User role equivalent is USER.
    if (candidate === 'ATHLETE') {
        return 'USER';
    }
    return 'USER';
}
function mapAuthUserToUser(authUser) {
    if (typeof authUser.id !== 'string' || authUser.id.length === 0) {
        return null;
    }
    const explicitName = typeof authUser.name === 'string' ? authUser.name.trim() : '';
    const firstName = typeof authUser.firstName === 'string' ? authUser.firstName.trim() : '';
    const lastName = typeof authUser.lastName === 'string' ? authUser.lastName.trim() : '';
    const joinedName = [firstName, lastName].filter(Boolean).join(' ').trim();
    return {
        id: authUser.id,
        name: explicitName || joinedName || 'Unknown User',
        email: typeof authUser.email === 'string' ? authUser.email : '',
        avatar: typeof authUser.avatar === 'string'
            ? authUser.avatar
            : typeof authUser.photoUrl === 'string'
                ? authUser.photoUrl
                : undefined,
        postcode: typeof authUser.postcode === 'string' ? authUser.postcode : '',
        dateOfBirth: typeof authUser.dateOfBirth === 'string' ? authUser.dateOfBirth : '',
        role: normalizeUserRole(authUser.role, authUser.accountType),
    };
}
class UserService {
    async loadUsers() {
        const users = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.USERS, []);
        if (users.length > 0) {
            return users;
        }
        const authUser = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.AUTH_USER, null);
        const mappedUser = authUser ? mapAuthUserToUser(authUser) : null;
        return mappedUser ? [mappedUser] : [];
    }
    async getUserById(id) {
        try {
            const users = await this.loadUsers();
            const user = users.find((candidate) => candidate.id === id);
            if (!user) {
                return (0, result_1.err)((0, result_1.notFound)('User', id));
            }
            return (0, result_1.ok)(user);
        }
        catch (error) {
            logger.error('Failed to get user by id', { id, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load user'));
        }
    }
    async getUsersByIds(ids) {
        try {
            const uniqueIds = [...new Set(ids.filter(Boolean))];
            if (uniqueIds.length === 0) {
                return (0, result_1.ok)([]);
            }
            const users = await this.loadUsers();
            const usersById = new Map(users.map((user) => [user.id, user]));
            const result = uniqueIds
                .map((id) => usersById.get(id))
                .filter((user) => Boolean(user));
            return (0, result_1.ok)(result);
        }
        catch (error) {
            logger.error('Failed to get users by ids', { ids, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load users'));
        }
    }
    async searchUsers(query) {
        try {
            const normalizedQuery = query.trim().toLowerCase();
            const users = await this.loadUsers();
            if (!normalizedQuery) {
                return (0, result_1.ok)(users);
            }
            const filtered = users.filter((user) => {
                const name = user.name.toLowerCase();
                const email = user.email.toLowerCase();
                const postcode = user.postcode.toLowerCase();
                const role = user.role.toLowerCase();
                return (name.includes(normalizedQuery) ||
                    email.includes(normalizedQuery) ||
                    postcode.includes(normalizedQuery) ||
                    role.includes(normalizedQuery));
            });
            return (0, result_1.ok)(filtered);
        }
        catch (error) {
            logger.error('Failed to search users', { query, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to search users'));
        }
    }
    async getCurrentUser() {
        try {
            const authUser = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.AUTH_USER, null);
            if (!authUser) {
                return (0, result_1.err)((0, result_1.notFound)('Current user'));
            }
            if (typeof authUser.id === 'string' && authUser.id.length > 0) {
                const existingUserResult = await this.getUserById(authUser.id);
                if (existingUserResult.success) {
                    return existingUserResult;
                }
            }
            const mappedUser = mapAuthUserToUser(authUser);
            if (!mappedUser) {
                return (0, result_1.err)((0, result_1.notFound)('Current user'));
            }
            return (0, result_1.ok)(mappedUser);
        }
        catch (error) {
            logger.error('Failed to get current user', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to load current user'));
        }
    }
    async updateUserProfile(userId, changes) {
        try {
            const users = await this.loadUsers();
            const userIndex = users.findIndex((user) => user.id === userId);
            if (userIndex === -1) {
                return (0, result_1.err)((0, result_1.notFound)('User', userId));
            }
            const updatedUser = {
                ...users[userIndex],
                ...changes,
            };
            users[userIndex] = updatedUser;
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.USERS, users);
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.USER_UPDATED, { userId, changes });
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.USER_PROFILE_CHANGED, { userId, changes });
            return (0, result_1.ok)(updatedUser);
        }
        catch (error) {
            logger.error('Failed to update user profile', { userId, changes, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update user profile'));
        }
    }
}
exports.userService = new UserService();
