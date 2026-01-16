/**
 * Auth Service
 *
 * Handles user authentication, registration, and session management.
 * Currently uses AsyncStorage for client-side persistence.
 * Ready for API integration.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AuthService');

const STORAGE_KEYS = {
  USER: 'auth_user',
  TOKEN: 'auth_token',
  ONBOARDING_COMPLETE: 'onboarding_complete',
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AccountType = 'COACH' | 'PARENT' | 'ATHLETE';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  accountType: AccountType;

  // Basic info
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  photoUrl?: string;

  // Location
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
  isLive?: boolean; // For coaches
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

  // Optional fields based on account type
  skillLevel?: SkillLevel;
  position?: string;
  sport?: string;

  // Coach specific
  isOrganization?: boolean;
  organizationName?: string;
  inviteCode?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  token?: string;
  error?: string;
}

export interface OnboardingData {
  // Step 1: Account type
  accountType: AccountType;

  // Step 2: Basic info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  dateOfBirth?: string;

  // Step 3: Location
  city?: string;
  postcode?: string;
  country?: string;

  // Step 4a: Athlete details
  skillLevel?: SkillLevel;
  position?: string;
  sport?: string;
  goals?: string[];
  hasChildren?: boolean; // Athletes can also be parents

  // Step 4b: Coach details
  isOrganization?: boolean;
  organizationName?: string;
  yearsExperience?: number;
  specializations?: string[];
  certifications?: string[];
  bio?: string;
  hourlyRate?: number;
  inviteCode?: string;
}

// ============================================================================
// MOCK DATA STORE
// ============================================================================

let usersCache: (UserProfile & { password: string })[] = [];
let currentUser: UserProfile | null = null;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateToken(): string {
  return `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

export const authService = {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    logger.info('Registration attempt', { email: input.email, accountType: input.accountType });

    // Check if email already exists
    const existing = usersCache.find(u => u.email.toLowerCase() === input.email.toLowerCase());
    if (existing) {
      logger.warn('Registration failed: Email exists', { email: input.email });
      return { success: false, error: 'An account with this email already exists' };
    }

    const now = new Date().toISOString();
    const userId = generateId();

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

    // Generate token
    const token = generateToken();

    // Store in AsyncStorage
    const { password, ...userWithoutPassword } = newUser;
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userWithoutPassword));
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);

    currentUser = userWithoutPassword;

    logger.success('Registration successful', { userId, accountType: input.accountType });

    return {
      success: true,
      user: userWithoutPassword,
      token,
    };
  },

  /**
   * Login with email and password
   */
  async login(input: LoginInput): Promise<AuthResult> {
    logger.info('Login attempt', { email: input.email });

    const user = usersCache.find(
      u => u.email.toLowerCase() === input.email.toLowerCase() && u.password === input.password
    );

    if (!user) {
      logger.warn('Login failed: Invalid credentials', { email: input.email });
      return { success: false, error: 'Invalid email or password' };
    }

    const token = generateToken();
    const { password, ...userWithoutPassword } = user;

    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userWithoutPassword));
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);

    currentUser = userWithoutPassword;

    logger.success('Login successful', { userId: user.id });

    return {
      success: true,
      user: userWithoutPassword,
      token,
    };
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    logger.info('Logout');

    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    currentUser = null;
  },

  /**
   * Get current user from storage
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    if (currentUser) return currentUser;

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        currentUser = JSON.parse(stored);
        return currentUser;
      }
    } catch (error) {
      logger.error('Failed to get current user', error);
    }

    return null;
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<AuthResult> {
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    const userIndex = usersCache.findIndex(u => u.id === currentUser!.id);
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
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userWithoutPassword));
    currentUser = userWithoutPassword;

    logger.info('Profile updated', { userId: currentUser.id });

    return {
      success: true,
      user: userWithoutPassword,
    };
  },

  /**
   * Complete onboarding with all collected data
   */
  async completeOnboarding(data: OnboardingData): Promise<AuthResult> {
    logger.info('Completing onboarding', { accountType: data.accountType });

    // First register the user
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

    // Then update with additional profile data
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

    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');

    logger.success('Onboarding complete', { userId: currentUser?.id });

    return updateResult;
  },

  /**
   * Check if onboarding is complete
   */
  async isOnboardingComplete(): Promise<boolean> {
    const complete = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    return complete === 'true';
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    logger.info('Password reset requested', { email });

    const user = usersCache.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Don't reveal if email exists
      return { success: true };
    }

    // In production, would send email here
    logger.info('Password reset email would be sent', { userId: user.id });

    return { success: true };
  },

  /**
   * Verify email with code
   */
  async verifyEmail(code: string): Promise<AuthResult> {
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    // In production, would verify code here
    if (code.length !== 6) {
      return { success: false, error: 'Invalid verification code' };
    }

    return this.updateProfile({ isVerified: true });
  },

  /**
   * Check if email is available
   */
  async checkEmailAvailable(email: string): Promise<boolean> {
    const existing = usersCache.find(u => u.email.toLowerCase() === email.toLowerCase());
    return !existing;
  },
};
