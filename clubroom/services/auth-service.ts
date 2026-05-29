/**
 * Auth Service
 *
 * Handles user authentication, registration, and session management.
 * Supports both mock (demo) and real API modes via USE_MOCK toggle.
 * Uses apiClient for client-side persistence (never imports AsyncStorage directly).
 * All methods return Result<T, ServiceError> for standardized error handling.
 */

import { apiClient } from './api-client';
import { registerApiAuthService } from '@/services/auth-service-registry';
import { createLogger } from '@/utils/logger';
import { generateId, generateMockToken } from '@/utils/generate-id';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { emitTyped, onTyped, ServiceEvents } from '@/services/event-bus';
import { api as apiConfig } from '@/constants/config';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  unauthorized,
  networkError,
  notFound,
  validationError,
  conflictError,
} from '@/types/result';

const logger = createLogger('AuthService');

const USE_MOCK = apiConfig.useMock;

function normalizeApiOrigin(rawUrl?: string): string {
  const fallback = 'http://localhost:4000';
  if (!rawUrl || !rawUrl.trim()) {
    return fallback;
  }

  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  return trimmed.replace(/\/api\/v1$|\/v1$/i, '');
}

const API_URL = normalizeApiOrigin(process.env.EXPO_PUBLIC_API_URL || apiConfig.baseUrl);

const AUTH_ENDPOINTS = {
  login: '/v1/auth/login',
  register: '/v1/auth/register',
  refresh: '/v1/auth/refresh',
  logout: '/v1/auth/logout',
  revoke: '/v1/auth/revoke',
  me: '/v1/auth/me',
  forgotPassword: '/v1/auth/forgot-password',
  resetPassword: '/v1/auth/reset-password',
  verifyEmail: '/v1/auth/verify-email',
  checkEmail: '/v1/auth/check-email',
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AccountType = 'COACH' | 'PARENT' | 'ATHLETE';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/** Data payload returned on successful auth operations */
export interface AuthData {
  user: UserProfile;
  tokens?: AuthTokens;
  token?: string;
}

/**
 * @deprecated Use Result<AuthData, ServiceError> instead.
 * Kept for backward compatibility — will be removed in a future release.
 */
export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  token?: string;
  tokens?: AuthTokens;
  error?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  accountType: AccountType;
  appRole?: 'COACH' | 'USER' | 'ADMIN';
  roles?: string[];

  // Basic info
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  photoUrl?: string;

  // Location
  addressLine?: string;
  city?: string;
  postcode?: string;
  country?: string;

  // For athletes
  skillLevel?: SkillLevel;
  position?: string;
  sport?: string;
  goals?: string[];

  // For parents
  childrenCount?: number;
  hasChildren?: boolean;
  children?: Array<{
    childId: string;
    childName: string;
    relationshipType: 'PARENT_CHILD' | 'GUARDIAN';
    addedAt: string;
  }>;

  // For coaches
  isOrganization?: boolean;
  organizationName?: string;
  certifications?: string[];
  yearsExperience?: number;
  specializations?: string[];
  bio?: string;
  hourlyRate?: number;

  // Status
  isVerified: boolean;
  isLive?: boolean;
  onboardingComplete: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  phone?: string;
  accountType: AccountType;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;

  skillLevel?: SkillLevel;
  position?: string;
  sport?: string;

  isOrganization?: boolean;
  organizationName?: string;
  inviteCode?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface OnboardingData {
  accountType: AccountType;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  dateOfBirth?: string;
  addressLine?: string;
  city?: string;
  postcode?: string;
  country?: string;
  skillLevel?: SkillLevel;
  position?: string;
  sport?: string;
  goals?: string[];
  hasChildren?: boolean;
  isOrganization?: boolean;
  organizationName?: string;
  yearsExperience?: number;
  specializations?: string[];
  certifications?: string[];
  bio?: string;
  hourlyRate?: number;
  childrenCount?: number;
  inviteCode?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  tokens: AuthTokens | null;
}

// ============================================================================
// MOCK DATA STORE
// ============================================================================

let usersCache: (UserProfile & { password: string })[] = [];
let currentUser: UserProfile | null = null;
let tokenExpiryMonitorUnsubscribe: (() => void) | null = null;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateMockTokens(): AuthTokens {
  return {
    accessToken: generateMockToken('mock_access'),
    refreshToken: generateMockToken('mock_refresh'),
    expiresAt: Date.now() + 3600 * 1000,
  };
}

// ============================================================================
// API FETCH HELPER (for real API mode)
// ============================================================================

async function apiFetch<T>(path: string, options?: RequestInit): Promise<Result<T, ServiceError>> {
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
      const message = (errorBody as Record<string, unknown>).message;
      const errorMessage = typeof message === 'string' ? message : `API error: ${response.status}`;

      if (response.status === 401) {
        return err(unauthorized(errorMessage));
      }
      return err(networkError(errorMessage));
    }

    const data = (await response.json()) as T;
    return ok(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Network request failed';
    return err(networkError(message));
  }
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

export const authService = {
  async login(email: string, password: string): Promise<Result<AuthData, ServiceError>> {
    logger.info('Login attempt', { email });

    if (USE_MOCK) {
      return this._mockLogin(email, password);
    }

    const result = await apiFetch<{ user: UserProfile; tokens: AuthTokens }>(AUTH_ENDPOINTS.login, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!result.success) {
      logger.warn('Login failed', { email, error: result.error.message });
      return result;
    }

    await this.storeTokens(result.data.tokens);
    await apiClient.set(STORAGE_KEYS.AUTH_USER, result.data.user);
    currentUser = result.data.user;
    logger.success('Login successful', { userId: result.data.user.id });
    return ok({
      user: result.data.user,
      tokens: result.data.tokens,
      token: result.data.tokens.accessToken,
    });
  },

  async register(input: RegisterInput): Promise<Result<AuthData, ServiceError>> {
    logger.info('Registration attempt', { email: input.email, accountType: input.accountType });

    // Age validation for self-registration
    if (input.dateOfBirth) {
      const ageValidation = this._validateAge(input.dateOfBirth);
      if (!ageValidation.success) {
        return err(ageValidation.error);
      }
    }

    if (USE_MOCK) {
      return this._mockRegister(input);
    }

    const result = await apiFetch<{ user: UserProfile; tokens: AuthTokens }>(
      AUTH_ENDPOINTS.register,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );

    if (!result.success) {
      logger.warn('Registration failed', { email: input.email, error: result.error.message });
      return result;
    }

    await this.storeTokens(result.data.tokens);
    await apiClient.set(STORAGE_KEYS.AUTH_USER, result.data.user);
    currentUser = result.data.user;
    logger.success('Registration successful', { userId: result.data.user.id });
    return ok({
      user: result.data.user,
      tokens: result.data.tokens,
      token: result.data.tokens.accessToken,
    });
  },

  async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      await apiClient.set(STORAGE_KEYS.AUTH_TOKENS, tokens);
      await apiClient.set(STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken);
    } catch (error) {
      logger.error('Failed to store tokens', error);
    }
  },

  async getTokens(): Promise<AuthTokens | null> {
    try {
      const stored = await apiClient.get<AuthTokens | null>(STORAGE_KEYS.AUTH_TOKENS, null);
      return stored;
    } catch (error) {
      logger.error('Failed to get tokens', error);
    }
    return null;
  },

  async refreshToken(): Promise<Result<AuthTokens, ServiceError>> {
    logger.info('Token refresh attempt');

    if (USE_MOCK) {
      const newTokens = generateMockTokens();
      await this.storeTokens(newTokens);
      logger.success('Mock token refreshed');
      return ok(newTokens);
    }

    const currentTokens = await this.getTokens();
    if (!currentTokens) {
      return err(unauthorized('No refresh token available'));
    }

    const result = await apiFetch<{ tokens: AuthTokens }>(AUTH_ENDPOINTS.refresh, {
      method: 'POST',
      body: JSON.stringify({ refreshToken: currentTokens.refreshToken }),
    });

    if (!result.success) {
      return err(result.error);
    }

    await this.storeTokens(result.data.tokens);
    logger.success('Token refreshed');
    return ok(result.data.tokens);
  },

  async logout(): Promise<void> {
    logger.info('Logout');

    if (!USE_MOCK) {
      try {
        const tokens = await this.getTokens();
        if (tokens) {
          await apiFetch(AUTH_ENDPOINTS.logout, {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokens.accessToken}` },
          });
        }
      } catch (error) {
        logger.warn('Server logout failed, continuing local cleanup', error);
      }
    }

    await Promise.all([
      apiClient.remove(STORAGE_KEYS.AUTH_USER),
      apiClient.remove(STORAGE_KEYS.AUTH_TOKEN),
      apiClient.remove(STORAGE_KEYS.AUTH_TOKENS),
    ]);
    currentUser = null;
  },

  async checkAuth(): Promise<AuthState> {
    logger.info('Checking auth state');

    try {
      const tokens = await this.getTokens();
      const storedUser = await apiClient.get<UserProfile | null>(STORAGE_KEYS.AUTH_USER, null);

      if (!tokens) {
        return { isAuthenticated: false, user: null, tokens: null };
      }

      let activeTokens = tokens;
      if (tokens.expiresAt < Date.now()) {
        logger.info('Token expired, attempting refresh');
        const refreshResult = await this.refreshToken();
        if (!refreshResult.success) {
          logger.warn('Token refresh failed during auth check');
          await this.logout();
          return { isAuthenticated: false, user: null, tokens: null };
        }
        activeTokens = refreshResult.data;
      }

      if (USE_MOCK) {
        if (!storedUser) {
          return { isAuthenticated: false, user: null, tokens: null };
        }

        currentUser = storedUser;
        logger.success('Auth state restored', { userId: storedUser.id });
        return { isAuthenticated: true, user: storedUser, tokens: activeTokens };
      }

      const meResult = await apiFetch<{ user: UserProfile }>(AUTH_ENDPOINTS.me, {
        method: 'GET',
        headers: { Authorization: `Bearer ${activeTokens.accessToken}` },
      });
      if (!meResult.success) {
        logger.warn('Auth me lookup failed during auth check', { error: meResult.error.message });
        await this.logout();
        return { isAuthenticated: false, user: null, tokens: null };
      }

      await apiClient.set(STORAGE_KEYS.AUTH_USER, meResult.data.user);
      currentUser = meResult.data.user;
      logger.success('Auth state restored from API', { userId: meResult.data.user.id });
      return { isAuthenticated: true, user: meResult.data.user, tokens: activeTokens };
    } catch (error) {
      logger.error('Auth check failed', error);
      return { isAuthenticated: false, user: null, tokens: null };
    }
  },

  initTokenExpiryMonitor(): void {
    if (tokenExpiryMonitorUnsubscribe) return;

    tokenExpiryMonitorUnsubscribe = onTyped(ServiceEvents.APP_ACTIVE, () => {
      void this.checkTokenExpiryOnResume();
    });

    logger.info('Token expiry monitor initialized');
  },

  cleanupTokenExpiryMonitor(): void {
    tokenExpiryMonitorUnsubscribe?.();
    tokenExpiryMonitorUnsubscribe = null;
  },

  async checkTokenExpiryOnResume(): Promise<Result<void, ServiceError>> {
    const tokens = await this.getTokens();
    if (!tokens) {
      return ok(undefined);
    }

    if (tokens.expiresAt > Date.now()) {
      return ok(undefined);
    }

    logger.info('Token expired on app resume, attempting refresh');
    const refreshResult = await this.refreshToken();
    if (refreshResult.success) {
      return ok(undefined);
    }

    logger.warn('Token refresh failed after app resume', { error: refreshResult.error.message });
    emitTyped(ServiceEvents.TOKEN_EXPIRED_BACKGROUND, { timestamp: Date.now() });
    return err(refreshResult.error);
  },

  async forgotPassword(email: string): Promise<void> {
    logger.info('Password reset requested', { email });

    if (USE_MOCK) {
      const user = usersCache.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        logger.info('Password reset email would be sent', { userId: user.id });
      }
      return;
    }

    await apiFetch(AUTH_ENDPOINTS.forgotPassword, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    logger.info('Password reset attempt');

    if (USE_MOCK) {
      logger.info('Password reset would be processed');
      return;
    }

    const result = await apiFetch(AUTH_ENDPOINTS.resetPassword, {
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

  async getCurrentUser(): Promise<UserProfile | null> {
    if (currentUser) return currentUser;

    try {
      const stored = await apiClient.get<UserProfile | null>(STORAGE_KEYS.AUTH_USER, null);
      if (stored) {
        currentUser = stored;
        return currentUser;
      }

      if (!USE_MOCK) {
        const tokens = await this.getTokens();
        if (!tokens?.accessToken) {
          return null;
        }

        const meResult = await apiFetch<{ user: UserProfile }>(AUTH_ENDPOINTS.me, {
          method: 'GET',
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        if (meResult.success) {
          currentUser = meResult.data.user;
          await apiClient.set(STORAGE_KEYS.AUTH_USER, currentUser);
          return currentUser;
        }
      }
    } catch (error) {
      logger.error('Failed to get current user', error);
    }

    return null;
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<Result<AuthData, ServiceError>> {
    if (!currentUser) {
      return err(unauthorized('Not authenticated'));
    }

    if (USE_MOCK) {
      const userIndex = usersCache.findIndex((u) => u.id === currentUser!.id);
      if (userIndex === -1) {
        return err(notFound('User'));
      }

      const updatedUser = {
        ...usersCache[userIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      usersCache[userIndex] = updatedUser;

      const { password, ...userWithoutPassword } = updatedUser;
      await apiClient.set(STORAGE_KEYS.AUTH_USER, userWithoutPassword);
      currentUser = userWithoutPassword;
      emitTyped(ServiceEvents.USER_PROFILE_CHANGED, {
        userId: currentUser.id,
        changes: updates,
      });
      logger.info('Profile updated', { userId: currentUser.id });
      return ok({ user: userWithoutPassword });
    }

    const tokens = await this.getTokens();
    const result = await apiFetch<{ user: UserProfile }>(AUTH_ENDPOINTS.me, {
      method: 'PATCH',
      headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
      body: JSON.stringify(updates),
    });

    if (!result.success) {
      return result;
    }

    await apiClient.set(STORAGE_KEYS.AUTH_USER, result.data.user);
    currentUser = result.data.user;
    emitTyped(ServiceEvents.USER_PROFILE_CHANGED, {
      userId: currentUser.id,
      changes: updates,
    });
    return ok({ user: result.data.user });
  },

  async completeOnboarding(data: OnboardingData): Promise<Result<AuthData, ServiceError>> {
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

    await apiClient.set(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
    logger.success('Onboarding complete', { userId: currentUser?.id });
    return updateResult;
  },

  async isOnboardingComplete(): Promise<boolean> {
    const complete = await apiClient.get<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETE, false);
    return complete === true;
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.forgotPassword(email);
      return { success: true };
    } catch {
      return { success: true };
    }
  },

  async verifyEmail(code: string): Promise<Result<AuthData, ServiceError>> {
    if (!currentUser) {
      return err(unauthorized('Not authenticated'));
    }

    if (USE_MOCK) {
      if (code.length !== 6) {
        return err(validationError('Invalid verification code'));
      }
      return this.updateProfile({ isVerified: true });
    }

    const tokens = await this.getTokens();
    const fetchResult = await apiFetch<{ user?: UserProfile }>(AUTH_ENDPOINTS.verifyEmail, {
      method: 'POST',
      headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
      body: JSON.stringify({ code }),
    });

    if (!fetchResult.success) {
      return err(fetchResult.error);
    }

    if (fetchResult.data.user) {
      await apiClient.set(STORAGE_KEYS.AUTH_USER, fetchResult.data.user);
      currentUser = fetchResult.data.user;
      return ok({ user: fetchResult.data.user });
    }

    return this.updateProfile({ isVerified: true });
  },

  async checkEmailAvailable(email: string): Promise<boolean> {
    if (USE_MOCK) {
      const existing = usersCache.find((u) => u.email.toLowerCase() === email.toLowerCase());
      return !existing;
    }

    const result = await apiFetch<{ available: boolean }>(
      `${AUTH_ENDPOINTS.checkEmail}?email=${encodeURIComponent(email)}`,
    );
    return result.success ? result.data.available : true;
  },

  // ============================================================================
  // MOCK IMPLEMENTATIONS (internal)
  // ============================================================================

  /**
   * Validate date of birth for registration.
   * Under-13: blocked (COPPA compliance).
   * 13-17: allowed but flagged for parental consent.
   */
  _validateAge(dateOfBirth: string): Result<{ age: number; isMinor: boolean }, ServiceError> {
    const parts = dateOfBirth.split('-');
    if (parts.length !== 3) {
      return err(validationError('Please enter a valid date of birth'));
    }
    const dob = new Date(
      Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)),
    );
    if (isNaN(dob.getTime())) {
      return err(validationError('Please enter a valid date of birth'));
    }

    const today = new Date();
    let age = today.getFullYear() - dob.getUTCFullYear();
    const monthDiff = today.getMonth() - dob.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getUTCDate())) {
      age--;
    }

    if (age < 13) {
      logger.warn('Under-13 self-registration blocked', { age });
      return err(
        validationError(
          'Users under 13 must be registered by a parent or guardian. Please ask your parent to create an account and add you as a child.',
        ),
      );
    }

    if (age > 120) {
      return err(validationError('Please enter a valid date of birth'));
    }

    const isMinor = age < 18;
    if (isMinor) {
      logger.info('Minor self-registration flagged for parental consent', { age });
    }

    return ok({ age, isMinor });
  },

  async _mockLogin(email: string, password: string): Promise<Result<AuthData, ServiceError>> {
    const user = usersCache.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );

    if (!user) {
      logger.warn('Login failed: Invalid credentials', { email });
      return err(unauthorized('Invalid email or password'));
    }

    const tokens = generateMockTokens();
    const legacyToken = generateMockToken('token');
    const { password: _, ...userWithoutPassword } = user;

    await apiClient.set(STORAGE_KEYS.AUTH_USER, userWithoutPassword);
    await this.storeTokens(tokens);
    currentUser = userWithoutPassword;

    logger.success('Login successful', { userId: user.id });
    return ok({ user: userWithoutPassword, tokens, token: legacyToken });
  },

  async _mockRegister(input: RegisterInput): Promise<Result<AuthData, ServiceError>> {
    const existing = usersCache.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
    if (existing) {
      logger.warn('Registration failed: Email exists', { email: input.email });
      return err(conflictError('An account with this email already exists'));
    }

    const now = new Date().toISOString();
    const userId = generateId('user');

    const newUser: UserProfile & { password: string } = {
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
    const legacyToken = generateMockToken('token');

    const { password: _, ...userWithoutPassword } = newUser;
    await apiClient.set(STORAGE_KEYS.AUTH_USER, userWithoutPassword);
    await this.storeTokens(tokens);
    currentUser = userWithoutPassword;

    logger.success('Registration successful', { userId, accountType: input.accountType });
    return ok({ user: userWithoutPassword, tokens, token: legacyToken });
  },

  /**
   * Check if the current access token is expired or about to expire.
   * Returns true if expired or within the buffer window.
   */
  async isTokenExpired(bufferMs: number = 60_000): Promise<boolean> {
    const tokens = await this.getTokens();
    if (!tokens) return true;
    return tokens.expiresAt < Date.now() + bufferMs;
  },

  /**
   * Revoke the current session server-side (for logout-everywhere).
   * In mock mode, just clears local tokens.
   */
  async revokeSession(): Promise<Result<void, ServiceError>> {
    logger.info('Revoking session');

    if (USE_MOCK) {
      await this.logout();
      return ok(undefined);
    }

    const tokens = await this.getTokens();
    if (!tokens) {
      return err(unauthorized('No active session to revoke'));
    }

    const result = await apiFetch<void>(AUTH_ENDPOINTS.revoke, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });

    // Always clear local state regardless of server response
    await this.logout();

    if (!result.success) {
      logger.warn('Server-side revocation failed, local tokens cleared', result.error);
      return ok(undefined); // Still consider it success since local state is clean
    }

    logger.success('Session revoked');
    return ok(undefined);
  },

  /**
   * Ensure a valid token is available, refreshing if needed.
   * Returns the current access token or an error.
   */
  async ensureValidToken(): Promise<Result<string, ServiceError>> {
    const tokens = await this.getTokens();
    if (!tokens) {
      return err(unauthorized('Not authenticated'));
    }

    // Token still valid
    if (tokens.expiresAt > Date.now() + 60_000) {
      return ok(tokens.accessToken);
    }

    // Need to refresh
    const refreshResult = await this.refreshToken();
    if (!refreshResult.success) {
      return err(refreshResult.error);
    }

    return ok(refreshResult.data.accessToken);
  },
};

registerApiAuthService(authService);
