"use strict";
/**
 * Auth Service Tests
 *
 * Tests for the authService in mock mode: login, register, logout,
 * getCurrentUser, checkAuth, updateProfile, verifyEmail, checkEmailAvailable.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const auth_service_1 = require("../../services/auth-service");
// Helper to create a unique test user
function makeRegisterInput(overrides) {
    const rand = Math.random().toString(36).substring(2, 10);
    return {
        email: `test_${rand}@example.com`,
        password: 'securePass123',
        accountType: 'COACH',
        firstName: 'Test',
        lastName: 'User',
        ...overrides,
    };
}
(0, node_test_1.describe)('AuthService (mock mode)', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Ensure clean state: logout removes stored user/tokens
        await auth_service_1.authService.logout();
    });
    // ---------------------------------------------------------------------------
    // register
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('register', () => {
        (0, node_test_1.default)('creates a new user and returns AuthData', async () => {
            const input = makeRegisterInput({ accountType: 'COACH' });
            const result = await auth_service_1.authService.register(input);
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.ok(result.data.user, 'Should return user');
            strict_1.default.ok(result.data.user.id, 'User should have an ID');
            strict_1.default.equal(result.data.user.email, input.email.toLowerCase());
            strict_1.default.equal(result.data.user.firstName, 'Test');
            strict_1.default.equal(result.data.user.accountType, 'COACH');
            strict_1.default.equal(result.data.user.isVerified, false);
            strict_1.default.equal(result.data.user.onboardingComplete, false);
            strict_1.default.ok(result.data.tokens, 'Should return tokens');
            strict_1.default.ok(result.data.tokens?.accessToken, 'Should have accessToken');
            strict_1.default.ok(result.data.tokens?.refreshToken, 'Should have refreshToken');
        });
        (0, node_test_1.default)('rejects duplicate email', async () => {
            const input = makeRegisterInput();
            const first = await auth_service_1.authService.register(input);
            strict_1.default.equal(first.success, true);
            const second = await auth_service_1.authService.register(input);
            strict_1.default.equal(second.success, false);
            if (second.success)
                return;
            strict_1.default.equal(second.error.code, 'CONFLICT');
        });
        (0, node_test_1.default)('sets coach-specific fields', async () => {
            const input = makeRegisterInput({
                accountType: 'COACH',
                isOrganization: true,
                organizationName: 'Test Academy',
            });
            const result = await auth_service_1.authService.register(input);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.user.accountType, 'COACH');
            strict_1.default.equal(result.data.user.isLive, false);
        });
        (0, node_test_1.default)('sets currentUser after registration', async () => {
            const input = makeRegisterInput();
            await auth_service_1.authService.register(input);
            const user = await auth_service_1.authService.getCurrentUser();
            strict_1.default.ok(user, 'getCurrentUser should return the registered user');
            strict_1.default.equal(user?.email, input.email.toLowerCase());
        });
    });
    // ---------------------------------------------------------------------------
    // login
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('login', () => {
        (0, node_test_1.default)('succeeds with correct credentials', async () => {
            const input = makeRegisterInput();
            await auth_service_1.authService.register(input);
            await auth_service_1.authService.logout();
            const result = await auth_service_1.authService.login(input.email, input.password);
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.user.email, input.email.toLowerCase());
            strict_1.default.ok(result.data.tokens, 'Should return tokens');
        });
        (0, node_test_1.default)('fails with wrong password', async () => {
            const input = makeRegisterInput();
            await auth_service_1.authService.register(input);
            await auth_service_1.authService.logout();
            const result = await auth_service_1.authService.login(input.email, 'wrongPassword');
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'UNAUTHORIZED');
        });
        (0, node_test_1.default)('fails with non-existent email', async () => {
            const result = await auth_service_1.authService.login('nobody@nowhere.com', 'pass');
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'UNAUTHORIZED');
        });
        (0, node_test_1.default)('login is case-insensitive for email', async () => {
            const input = makeRegisterInput({ email: 'CamelCase@Test.com' });
            await auth_service_1.authService.register(input);
            await auth_service_1.authService.logout();
            const result = await auth_service_1.authService.login('camelcase@test.com', input.password);
            strict_1.default.equal(result.success, true);
        });
        (0, node_test_1.default)('does not include password in returned user', async () => {
            const input = makeRegisterInput();
            await auth_service_1.authService.register(input);
            await auth_service_1.authService.logout();
            const result = await auth_service_1.authService.login(input.email, input.password);
            if (!result.success)
                return;
            const user = result.data.user;
            strict_1.default.equal(user.password, undefined, 'Password should not be in returned user');
        });
    });
    // ---------------------------------------------------------------------------
    // logout
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('logout', () => {
        (0, node_test_1.default)('clears current user', async () => {
            const input = makeRegisterInput();
            await auth_service_1.authService.register(input);
            strict_1.default.ok(await auth_service_1.authService.getCurrentUser(), 'User should be set before logout');
            await auth_service_1.authService.logout();
            const user = await auth_service_1.authService.getCurrentUser();
            strict_1.default.equal(user, null, 'getCurrentUser should return null after logout');
        });
        (0, node_test_1.default)('clears tokens', async () => {
            const input = makeRegisterInput();
            await auth_service_1.authService.register(input);
            await auth_service_1.authService.logout();
            const tokens = await auth_service_1.authService.getTokens();
            strict_1.default.equal(tokens, null, 'Tokens should be null after logout');
        });
        (0, node_test_1.default)('multiple logouts do not throw', async () => {
            await strict_1.default.doesNotReject(auth_service_1.authService.logout());
            await strict_1.default.doesNotReject(auth_service_1.authService.logout());
        });
    });
    // ---------------------------------------------------------------------------
    // getCurrentUser
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getCurrentUser', () => {
        (0, node_test_1.default)('returns null when not authenticated', async () => {
            const user = await auth_service_1.authService.getCurrentUser();
            strict_1.default.equal(user, null);
        });
        (0, node_test_1.default)('returns current user after login', async () => {
            const input = makeRegisterInput();
            await auth_service_1.authService.register(input);
            const user = await auth_service_1.authService.getCurrentUser();
            strict_1.default.ok(user);
            strict_1.default.equal(user?.firstName, 'Test');
        });
    });
    // ---------------------------------------------------------------------------
    // checkAuth
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('checkAuth', () => {
        (0, node_test_1.default)('returns not authenticated when no stored data', async () => {
            const state = await auth_service_1.authService.checkAuth();
            strict_1.default.equal(state.isAuthenticated, false);
            strict_1.default.equal(state.user, null);
            strict_1.default.equal(state.tokens, null);
        });
        (0, node_test_1.default)('returns authenticated after login', async () => {
            const input = makeRegisterInput();
            await auth_service_1.authService.register(input);
            const state = await auth_service_1.authService.checkAuth();
            strict_1.default.equal(state.isAuthenticated, true);
            strict_1.default.ok(state.user);
            strict_1.default.ok(state.tokens);
            strict_1.default.equal(state.user?.email, input.email.toLowerCase());
        });
    });
    // ---------------------------------------------------------------------------
    // updateProfile
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('updateProfile', () => {
        (0, node_test_1.default)('updates user fields', async () => {
            const input = makeRegisterInput();
            await auth_service_1.authService.register(input);
            const result = await auth_service_1.authService.updateProfile({
                firstName: 'Updated',
                city: 'London',
            });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.user.firstName, 'Updated');
            strict_1.default.equal(result.data.user.city, 'London');
        });
        (0, node_test_1.default)('fails when not authenticated', async () => {
            const result = await auth_service_1.authService.updateProfile({ firstName: 'Nope' });
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'UNAUTHORIZED');
        });
        (0, node_test_1.default)('persists changes to getCurrentUser', async () => {
            const input = makeRegisterInput();
            await auth_service_1.authService.register(input);
            await auth_service_1.authService.updateProfile({ bio: 'Test bio' });
            const user = await auth_service_1.authService.getCurrentUser();
            strict_1.default.equal(user?.bio, 'Test bio');
        });
    });
    // ---------------------------------------------------------------------------
    // verifyEmail
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('verifyEmail', () => {
        (0, node_test_1.default)('verifies email with valid 6-digit code', async () => {
            const input = makeRegisterInput();
            await auth_service_1.authService.register(input);
            const result = await auth_service_1.authService.verifyEmail('123456');
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.user.isVerified, true);
        });
        (0, node_test_1.default)('rejects invalid code length', async () => {
            const input = makeRegisterInput();
            await auth_service_1.authService.register(input);
            const result = await auth_service_1.authService.verifyEmail('123');
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'VALIDATION');
        });
        (0, node_test_1.default)('fails when not authenticated', async () => {
            const result = await auth_service_1.authService.verifyEmail('123456');
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // checkEmailAvailable
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('checkEmailAvailable', () => {
        (0, node_test_1.default)('returns true for unregistered email', async () => {
            const rand = Math.random().toString(36).substring(2, 10);
            const available = await auth_service_1.authService.checkEmailAvailable(`fresh_${rand}@example.com`);
            strict_1.default.equal(available, true);
        });
        (0, node_test_1.default)('returns false for registered email', async () => {
            const input = makeRegisterInput();
            await auth_service_1.authService.register(input);
            const available = await auth_service_1.authService.checkEmailAvailable(input.email);
            strict_1.default.equal(available, false);
        });
        (0, node_test_1.default)('check is case-insensitive', async () => {
            const input = makeRegisterInput({ email: 'Upper@Test.com' });
            await auth_service_1.authService.register(input);
            const available = await auth_service_1.authService.checkEmailAvailable('upper@test.com');
            strict_1.default.equal(available, false);
        });
    });
    // ---------------------------------------------------------------------------
    // refreshToken
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('refreshToken', () => {
        (0, node_test_1.default)('generates new mock tokens', async () => {
            const input = makeRegisterInput();
            await auth_service_1.authService.register(input);
            const oldTokens = await auth_service_1.authService.getTokens();
            strict_1.default.ok(oldTokens);
            const result = await auth_service_1.authService.refreshToken();
            strict_1.default.ok(result.success);
            if (result.success) {
                strict_1.default.ok(result.data.accessToken);
                strict_1.default.ok(result.data.refreshToken);
                strict_1.default.ok(result.data.expiresAt > Date.now());
            }
        });
    });
    // ---------------------------------------------------------------------------
    // forgotPassword / requestPasswordReset
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('forgotPassword', () => {
        (0, node_test_1.default)('does not throw for existing or non-existing email', async () => {
            await strict_1.default.doesNotReject(auth_service_1.authService.forgotPassword('someone@example.com'));
        });
    });
    (0, node_test_1.describe)('requestPasswordReset', () => {
        (0, node_test_1.default)('returns success', async () => {
            const result = await auth_service_1.authService.requestPasswordReset('someone@example.com');
            strict_1.default.equal(result.success, true);
        });
    });
    // ---------------------------------------------------------------------------
    // isOnboardingComplete
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('isOnboardingComplete', () => {
        (0, node_test_1.default)('returns false by default', async () => {
            const complete = await auth_service_1.authService.isOnboardingComplete();
            strict_1.default.equal(complete, false);
        });
    });
});
