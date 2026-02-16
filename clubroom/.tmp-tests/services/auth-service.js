"use strict";
/**
 * Auth Service
 *
 * Handles user authentication, registration, and session management.
 * Supports both mock (demo) and real API modes via USE_MOCK toggle.
 * Uses apiClient for client-side persistence (never imports AsyncStorage directly).
 * All methods return Result<T, ServiceError> for standardized error handling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const api_client_1 = require("./api-client");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('AuthService');
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false'; // defaults to true
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
// ============================================================================
// MOCK DATA STORE
// ============================================================================
let usersCache = [];
let currentUser = null;
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function generateId() {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
function generateToken() {
    return `token_${Date.now()}_${Math.random().toString(36).substring(2, 18)}`;
}
function generateMockTokens() {
    return {
        accessToken: `mock_access_${Date.now()}_${Math.random().toString(36).substring(2, 18)}`,
        refreshToken: `mock_refresh_${Date.now()}_${Math.random().toString(36).substring(2, 18)}`,
        expiresAt: Date.now() + 3600 * 1000,
    };
}
// ============================================================================
// API FETCH HELPER (for real API mode)
// ============================================================================
async function apiFetch(path, options) {
    try {
        const url = `${API_URL}${path}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const message = errorBody.message;
            const errorMessage = typeof message === 'string' ? message : `API error: ${response.status}`;
            if (response.status === 401) {
                return (0, result_1.err)((0, result_1.unauthorized)(errorMessage));
            }
            return (0, result_1.err)((0, result_1.networkError)(errorMessage));
        }
        const data = (await response.json());
        return (0, result_1.ok)(data);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Network request failed';
        return (0, result_1.err)((0, result_1.networkError)(message));
    }
}
// ============================================================================
// SERVICE METHODS
// ============================================================================
exports.authService = {
    async login(email, password) {
        logger.info('Login attempt', { email });
        if (USE_MOCK) {
            return this._mockLogin(email, password);
        }
        const result = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (!result.success) {
            logger.warn('Login failed', { email, error: result.error.message });
            return result;
        }
        await this.storeTokens(result.data.tokens);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AUTH_USER, result.data.user);
        currentUser = result.data.user;
        logger.success('Login successful', { userId: result.data.user.id });
        return (0, result_1.ok)({
            user: result.data.user,
            tokens: result.data.tokens,
            token: result.data.tokens.accessToken,
        });
    },
    async register(input) {
        logger.info('Registration attempt', { email: input.email, accountType: input.accountType });
        if (USE_MOCK) {
            return this._mockRegister(input);
        }
        const result = await apiFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(input),
        });
        if (!result.success) {
            logger.warn('Registration failed', { email: input.email, error: result.error.message });
            return result;
        }
        await this.storeTokens(result.data.tokens);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AUTH_USER, result.data.user);
        currentUser = result.data.user;
        logger.success('Registration successful', { userId: result.data.user.id });
        return (0, result_1.ok)({
            user: result.data.user,
            tokens: result.data.tokens,
            token: result.data.tokens.accessToken,
        });
    },
    async storeTokens(tokens) {
        try {
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AUTH_TOKENS, tokens);
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken);
        }
        catch (error) {
            logger.error('Failed to store tokens', error);
        }
    },
    async getTokens() {
        try {
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.AUTH_TOKENS, null);
            return stored;
        }
        catch (error) {
            logger.error('Failed to get tokens', error);
        }
        return null;
    },
    async refreshToken() {
        logger.info('Token refresh attempt');
        if (USE_MOCK) {
            const newTokens = generateMockTokens();
            await this.storeTokens(newTokens);
            logger.success('Mock token refreshed');
            return (0, result_1.ok)(newTokens);
        }
        const currentTokens = await this.getTokens();
        if (!currentTokens) {
            return (0, result_1.err)((0, result_1.unauthorized)('No refresh token available'));
        }
        const result = await apiFetch('/api/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken: currentTokens.refreshToken }),
        });
        if (!result.success) {
            return (0, result_1.err)(result.error);
        }
        await this.storeTokens(result.data.tokens);
        logger.success('Token refreshed');
        return (0, result_1.ok)(result.data.tokens);
    },
    async logout() {
        logger.info('Logout');
        if (!USE_MOCK) {
            try {
                const tokens = await this.getTokens();
                if (tokens) {
                    await apiFetch('/api/auth/logout', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${tokens.accessToken}` },
                    });
                }
            }
            catch (error) {
                logger.warn('Server logout failed, continuing local cleanup', error);
            }
        }
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.AUTH_USER);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.AUTH_TOKEN);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.AUTH_TOKENS);
        currentUser = null;
    },
    async checkAuth() {
        logger.info('Checking auth state');
        try {
            const tokens = await this.getTokens();
            const storedUser = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.AUTH_USER, null);
            if (!tokens || !storedUser) {
                return { isAuthenticated: false, user: null, tokens: null };
            }
            if (tokens.expiresAt < Date.now()) {
                logger.info('Token expired, attempting refresh');
                const refreshResult = await this.refreshToken();
                if (!refreshResult.success) {
                    logger.warn('Token refresh failed during auth check');
                    await this.logout();
                    return { isAuthenticated: false, user: null, tokens: null };
                }
                currentUser = storedUser;
                return { isAuthenticated: true, user: storedUser, tokens: refreshResult.data };
            }
            currentUser = storedUser;
            logger.success('Auth state restored', { userId: storedUser.id });
            return { isAuthenticated: true, user: storedUser, tokens };
        }
        catch (error) {
            logger.error('Auth check failed', error);
            return { isAuthenticated: false, user: null, tokens: null };
        }
    },
    async forgotPassword(email) {
        logger.info('Password reset requested', { email });
        if (USE_MOCK) {
            const user = usersCache.find((u) => u.email.toLowerCase() === email.toLowerCase());
            if (user) {
                logger.info('Password reset email would be sent', { userId: user.id });
            }
            return;
        }
        await apiFetch('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },
    async resetPassword(token, newPassword) {
        logger.info('Password reset attempt');
        if (USE_MOCK) {
            logger.info('Password reset would be processed');
            return;
        }
        const result = await apiFetch('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword }),
        });
        if (!result.success) {
            logger.warn('Password reset failed', { error: result.error.message });
            return;
        }
        logger.success('Password reset successful');
    },
    // ============================================================================
    // BACKWARDS-COMPATIBLE METHODS
    // ============================================================================
    async getCurrentUser() {
        if (currentUser)
            return currentUser;
        try {
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.AUTH_USER, null);
            if (stored) {
                currentUser = stored;
                return currentUser;
            }
        }
        catch (error) {
            logger.error('Failed to get current user', error);
        }
        return null;
    },
    async updateProfile(updates) {
        if (!currentUser) {
            return (0, result_1.err)((0, result_1.unauthorized)('Not authenticated'));
        }
        if (USE_MOCK) {
            const userIndex = usersCache.findIndex((u) => u.id === currentUser.id);
            if (userIndex === -1) {
                return (0, result_1.err)((0, result_1.notFound)('User'));
            }
            const updatedUser = {
                ...usersCache[userIndex],
                ...updates,
                updatedAt: new Date().toISOString(),
            };
            usersCache[userIndex] = updatedUser;
            const { password, ...userWithoutPassword } = updatedUser;
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AUTH_USER, userWithoutPassword);
            currentUser = userWithoutPassword;
            logger.info('Profile updated', { userId: currentUser.id });
            return (0, result_1.ok)({ user: userWithoutPassword });
        }
        const tokens = await this.getTokens();
        const result = await apiFetch('/api/users/me', {
            method: 'PATCH',
            headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
            body: JSON.stringify(updates),
        });
        if (!result.success) {
            return result;
        }
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AUTH_USER, result.data.user);
        currentUser = result.data.user;
        return (0, result_1.ok)({ user: result.data.user });
    },
    async completeOnboarding(data) {
        logger.info('Completing onboarding', { accountType: data.accountType });
        const registerResult = await this.register({
            email: data.email,
            password: data.password,
            phone: data.phone,
            accountType: data.accountType,
            firstName: data.firstName,
            lastName: data.lastName,
            dateOfBirth: data.dateOfBirth,
            skillLevel: data.skillLevel,
            position: data.position,
            sport: data.sport,
            isOrganization: data.isOrganization,
            organizationName: data.organizationName,
            inviteCode: data.inviteCode,
        });
        if (!registerResult.success) {
            return registerResult;
        }
        const updateResult = await this.updateProfile({
            addressLine: data.addressLine,
            city: data.city,
            postcode: data.postcode,
            country: data.country,
            goals: data.goals,
            yearsExperience: data.yearsExperience,
            specializations: data.specializations,
            certifications: data.certifications,
            bio: data.bio,
            hourlyRate: data.hourlyRate,
            onboardingComplete: true,
        });
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.ONBOARDING_COMPLETE, true);
        logger.success('Onboarding complete', { userId: currentUser?.id });
        return updateResult;
    },
    async isOnboardingComplete() {
        const complete = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ONBOARDING_COMPLETE, false);
        return complete === true;
    },
    async requestPasswordReset(email) {
        try {
            await this.forgotPassword(email);
            return { success: true };
        }
        catch {
            return { success: true };
        }
    },
    async verifyEmail(code) {
        if (!currentUser) {
            return (0, result_1.err)((0, result_1.unauthorized)('Not authenticated'));
        }
        if (USE_MOCK) {
            if (code.length !== 6) {
                return (0, result_1.err)((0, result_1.validationError)('Invalid verification code'));
            }
            return this.updateProfile({ isVerified: true });
        }
        const tokens = await this.getTokens();
        const fetchResult = await apiFetch('/api/auth/verify-email', {
            method: 'POST',
            headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
            body: JSON.stringify({ code }),
        });
        if (!fetchResult.success) {
            return (0, result_1.err)(fetchResult.error);
        }
        return this.updateProfile({ isVerified: true });
    },
    async checkEmailAvailable(email) {
        if (USE_MOCK) {
            const existing = usersCache.find((u) => u.email.toLowerCase() === email.toLowerCase());
            return !existing;
        }
        const result = await apiFetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
        return result.success ? result.data.available : true;
    },
    // ============================================================================
    // MOCK IMPLEMENTATIONS (internal)
    // ============================================================================
    async _mockLogin(email, password) {
        const user = usersCache.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (!user) {
            logger.warn('Login failed: Invalid credentials', { email });
            return (0, result_1.err)((0, result_1.unauthorized)('Invalid email or password'));
        }
        const tokens = generateMockTokens();
        const legacyToken = generateToken();
        const { password: _, ...userWithoutPassword } = user;
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AUTH_USER, userWithoutPassword);
        await this.storeTokens(tokens);
        currentUser = userWithoutPassword;
        logger.success('Login successful', { userId: user.id });
        return (0, result_1.ok)({ user: userWithoutPassword, tokens, token: legacyToken });
    },
    async _mockRegister(input) {
        const existing = usersCache.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
        if (existing) {
            logger.warn('Registration failed: Email exists', { email: input.email });
            return (0, result_1.err)((0, result_1.conflictError)('An account with this email already exists'));
        }
        const now = new Date().toISOString();
        const userId = generateId();
        const newUser = {
            id: userId,
            email: input.email.toLowerCase(),
            phone: input.phone,
            password: input.password,
            accountType: input.accountType,
            firstName: input.firstName,
            lastName: input.lastName,
            dateOfBirth: input.dateOfBirth,
            skillLevel: input.skillLevel,
            position: input.position,
            sport: input.sport,
            isOrganization: input.isOrganization,
            organizationName: input.organizationName,
            isVerified: false,
            isLive: input.accountType === 'COACH' ? false : undefined,
            onboardingComplete: false,
            createdAt: now,
            updatedAt: now,
        };
        usersCache.push(newUser);
        const tokens = generateMockTokens();
        const legacyToken = generateToken();
        const { password: _, ...userWithoutPassword } = newUser;
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AUTH_USER, userWithoutPassword);
        await this.storeTokens(tokens);
        currentUser = userWithoutPassword;
        logger.success('Registration successful', { userId, accountType: input.accountType });
        return (0, result_1.ok)({ user: userWithoutPassword, tokens, token: legacyToken });
    },
};
