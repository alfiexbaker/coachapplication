"use strict";
/**
 * Auth Service
 *
 * Handles user authentication, registration, and session management.
 * Supports both mock (demo) and real API modes via USE_MOCK toggle.
 * Currently uses AsyncStorage for client-side persistence.
 * Ready for API integration.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('AuthService');
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false'; // defaults to true
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const STORAGE_KEYS = {
    USER: 'auth_user',
    TOKEN: 'auth_token',
    TOKENS: 'auth_tokens',
    ONBOARDING_COMPLETE: 'onboarding_complete',
};
// ============================================================================
// MOCK DATA STORE
// ============================================================================
let usersCache = [];
let currentUser = null;
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function generateId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function generateToken() {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}
function generateMockTokens() {
    return {
        accessToken: `mock_access_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`,
        refreshToken: `mock_refresh_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`,
        expiresAt: Date.now() + 3600 * 1000,
    };
}
// ============================================================================
// API FETCH HELPER (for real API mode)
// ============================================================================
async function apiFetch(path, options) {
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
        throw new Error(errorBody.message || `API error: ${response.status}`);
    }
    return response.json();
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
        try {
            const result = await apiFetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            await this.storeTokens(result.tokens);
            await async_storage_1.default.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));
            currentUser = result.user;
            logger.success('Login successful', { userId: result.user.id });
            return { success: true, user: result.user, tokens: result.tokens, token: result.tokens.accessToken };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid email or password';
            logger.warn('Login failed', { email, error: message });
            return { success: false, error: message };
        }
    },
    async register(input) {
        logger.info('Registration attempt', { email: input.email, accountType: input.accountType });
        if (USE_MOCK) {
            return this._mockRegister(input);
        }
        try {
            const result = await apiFetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(input),
            });
            await this.storeTokens(result.tokens);
            await async_storage_1.default.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));
            currentUser = result.user;
            logger.success('Registration successful', { userId: result.user.id });
            return { success: true, user: result.user, tokens: result.tokens, token: result.tokens.accessToken };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Registration failed';
            logger.warn('Registration failed', { email: input.email, error: message });
            return { success: false, error: message };
        }
    },
    async storeTokens(tokens) {
        try {
            await async_storage_1.default.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
            await async_storage_1.default.setItem(STORAGE_KEYS.TOKEN, tokens.accessToken);
        }
        catch (error) {
            logger.error('Failed to store tokens', error);
        }
    },
    async getTokens() {
        try {
            const stored = await async_storage_1.default.getItem(STORAGE_KEYS.TOKENS);
            if (stored) {
                return JSON.parse(stored);
            }
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
            return newTokens;
        }
        const currentTokens = await this.getTokens();
        if (!currentTokens) {
            throw new Error('No refresh token available');
        }
        const result = await apiFetch('/api/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken: currentTokens.refreshToken }),
        });
        await this.storeTokens(result.tokens);
        logger.success('Token refreshed');
        return result.tokens;
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
        await async_storage_1.default.removeItem(STORAGE_KEYS.USER);
        await async_storage_1.default.removeItem(STORAGE_KEYS.TOKEN);
        await async_storage_1.default.removeItem(STORAGE_KEYS.TOKENS);
        currentUser = null;
    },
    async checkAuth() {
        logger.info('Checking auth state');
        try {
            const tokens = await this.getTokens();
            const storedUser = await async_storage_1.default.getItem(STORAGE_KEYS.USER);
            if (!tokens || !storedUser) {
                return { isAuthenticated: false, user: null, tokens: null };
            }
            const user = JSON.parse(storedUser);
            if (tokens.expiresAt < Date.now()) {
                logger.info('Token expired, attempting refresh');
                try {
                    const newTokens = await this.refreshToken();
                    currentUser = user;
                    return { isAuthenticated: true, user, tokens: newTokens };
                }
                catch {
                    logger.warn('Token refresh failed during auth check');
                    await this.logout();
                    return { isAuthenticated: false, user: null, tokens: null };
                }
            }
            currentUser = user;
            logger.success('Auth state restored', { userId: user.id });
            return { isAuthenticated: true, user, tokens };
        }
        catch (error) {
            logger.error('Auth check failed', error);
            return { isAuthenticated: false, user: null, tokens: null };
        }
    },
    async forgotPassword(email) {
        logger.info('Password reset requested', { email });
        if (USE_MOCK) {
            const user = usersCache.find(u => u.email.toLowerCase() === email.toLowerCase());
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
        await apiFetch('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword }),
        });
        logger.success('Password reset successful');
    },
    // ============================================================================
    // BACKWARDS-COMPATIBLE METHODS
    // ============================================================================
    async getCurrentUser() {
        if (currentUser)
            return currentUser;
        try {
            const stored = await async_storage_1.default.getItem(STORAGE_KEYS.USER);
            if (stored) {
                currentUser = JSON.parse(stored);
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
            return { success: false, error: 'Not authenticated' };
        }
        if (USE_MOCK) {
            const userIndex = usersCache.findIndex(u => u.id === currentUser.id);
            if (userIndex === -1) {
                return { success: false, error: 'User not found' };
            }
            const updatedUser = {
                ...usersCache[userIndex],
                ...updates,
                updatedAt: new Date().toISOString(),
            };
            usersCache[userIndex] = updatedUser;
            const { password, ...userWithoutPassword } = updatedUser;
            await async_storage_1.default.setItem(STORAGE_KEYS.USER, JSON.stringify(userWithoutPassword));
            currentUser = userWithoutPassword;
            logger.info('Profile updated', { userId: currentUser.id });
            return { success: true, user: userWithoutPassword };
        }
        try {
            const tokens = await this.getTokens();
            const result = await apiFetch('/api/users/me', {
                method: 'PATCH',
                headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
                body: JSON.stringify(updates),
            });
            await async_storage_1.default.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));
            currentUser = result.user;
            return { success: true, user: result.user };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Profile update failed' };
        }
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
        await async_storage_1.default.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
        logger.success('Onboarding complete', { userId: currentUser?.id });
        return updateResult;
    },
    async isOnboardingComplete() {
        const complete = await async_storage_1.default.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
        return complete === 'true';
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
            return { success: false, error: 'Not authenticated' };
        }
        if (USE_MOCK) {
            if (code.length !== 6) {
                return { success: false, error: 'Invalid verification code' };
            }
            return this.updateProfile({ isVerified: true });
        }
        try {
            const tokens = await this.getTokens();
            await apiFetch('/api/auth/verify-email', {
                method: 'POST',
                headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
                body: JSON.stringify({ code }),
            });
            return this.updateProfile({ isVerified: true });
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Email verification failed' };
        }
    },
    async checkEmailAvailable(email) {
        if (USE_MOCK) {
            const existing = usersCache.find(u => u.email.toLowerCase() === email.toLowerCase());
            return !existing;
        }
        try {
            const result = await apiFetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
            return result.available;
        }
        catch {
            return true;
        }
    },
    // ============================================================================
    // MOCK IMPLEMENTATIONS (internal)
    // ============================================================================
    async _mockLogin(email, password) {
        const user = usersCache.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (!user) {
            logger.warn('Login failed: Invalid credentials', { email });
            return { success: false, error: 'Invalid email or password' };
        }
        const tokens = generateMockTokens();
        const legacyToken = generateToken();
        const { password: _, ...userWithoutPassword } = user;
        await async_storage_1.default.setItem(STORAGE_KEYS.USER, JSON.stringify(userWithoutPassword));
        await this.storeTokens(tokens);
        currentUser = userWithoutPassword;
        logger.success('Login successful', { userId: user.id });
        return { success: true, user: userWithoutPassword, tokens, token: legacyToken };
    },
    async _mockRegister(input) {
        const existing = usersCache.find(u => u.email.toLowerCase() === input.email.toLowerCase());
        if (existing) {
            logger.warn('Registration failed: Email exists', { email: input.email });
            return { success: false, error: 'An account with this email already exists' };
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
        await async_storage_1.default.setItem(STORAGE_KEYS.USER, JSON.stringify(userWithoutPassword));
        await this.storeTokens(tokens);
        currentUser = userWithoutPassword;
        logger.success('Registration successful', { userId, accountType: input.accountType });
        return { success: true, user: userWithoutPassword, tokens, token: legacyToken };
    },
};
