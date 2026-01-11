/**
 * Configuration Service
 *
 * Centralized application configuration management.
 * Provides type-safe access to environment variables and feature flags.
 *
 * Usage:
 * ```typescript
 * import { config, featureFlags } from '@/services/config-service';
 *
 * if (config.useMock) {
 *   // Use mock data
 * }
 *
 * if (featureFlags.enableNewBookingFlow) {
 *   // Show new booking flow
 * }
 * ```
 */

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Detect if running in development mode
 * Uses __DEV__ from React Native, falls back to NODE_ENV
 */
const isDevelopment = (): boolean => {
  // __DEV__ is a global provided by React Native/Metro
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__;
  }
  // Fallback for non-RN environments
  return process.env.NODE_ENV !== 'production';
};

// ============================================================================
// Configuration Types
// ============================================================================

export interface AppConfig {
  // API Configuration
  useMock: boolean;
  apiBaseUrl: string;
  apiTimeout: number;
  apiRetryAttempts: number;
  apiRetryDelay: number;

  // App Information
  appName: string;
  appVersion: string;
  environment: 'development' | 'staging' | 'production';

  // Feature Settings
  enableLogging: boolean;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
}

export interface FeatureFlags {
  // Feature Toggles
  enableNewBookingFlow: boolean;
  enableGroupSessions: boolean;
  enableVideoChat: boolean;
  enableClubManagement: boolean;
  enableBadges: boolean;
  enableNotifications: boolean;
  enablePayments: boolean;
  enableReviews: boolean;
  enableMessaging: boolean;
  enableSocialFeed: boolean;
}

// ============================================================================
// Configuration Values
// ============================================================================

/**
 * Main application configuration
 */
export const config: AppConfig = {
  // API Configuration
  useMock: isDevelopment(),
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.clubroom.app',
  apiTimeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10),
  apiRetryAttempts: parseInt(process.env.EXPO_PUBLIC_API_RETRY_ATTEMPTS || '3', 10),
  apiRetryDelay: parseInt(process.env.EXPO_PUBLIC_API_RETRY_DELAY || '1000', 10),

  // App Information
  appName: 'ClubRoom',
  appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  environment: getEnvironment(),

  // Feature Settings
  enableLogging: isDevelopment(),
  enableAnalytics: !isDevelopment(),
  enableCrashReporting: !isDevelopment(),
};

/**
 * Feature flags for conditional features
 */
export const featureFlags: FeatureFlags = {
  enableNewBookingFlow: true,
  enableGroupSessions: true,
  enableVideoChat: true,
  enableClubManagement: true,
  enableBadges: true,
  enableNotifications: true,
  enablePayments: false, // Payment integration pending
  enableReviews: true,
  enableMessaging: true,
  enableSocialFeed: true,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine current environment
 */
function getEnvironment(): 'development' | 'staging' | 'production' {
  const env = process.env.EXPO_PUBLIC_ENVIRONMENT || process.env.NODE_ENV;

  switch (env) {
    case 'production':
      return 'production';
    case 'staging':
      return 'staging';
    default:
      return 'development';
  }
}

/**
 * Check if currently in development mode
 */
export function isDevMode(): boolean {
  return config.environment === 'development';
}

/**
 * Check if currently in production mode
 */
export function isProdMode(): boolean {
  return config.environment === 'production';
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return featureFlags[feature];
}

// ============================================================================
// Runtime Configuration Updates
// ============================================================================

/**
 * Override configuration at runtime (useful for testing)
 * Note: Changes are not persisted across app restarts
 */
export function updateConfig(updates: Partial<AppConfig>): void {
  Object.assign(config, updates);
}

/**
 * Override feature flags at runtime (useful for testing)
 * Note: Changes are not persisted across app restarts
 */
export function updateFeatureFlags(updates: Partial<FeatureFlags>): void {
  Object.assign(featureFlags, updates);
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  Object.assign(config, {
    useMock: isDevelopment(),
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.clubroom.app',
    apiTimeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10),
    apiRetryAttempts: parseInt(process.env.EXPO_PUBLIC_API_RETRY_ATTEMPTS || '3', 10),
    apiRetryDelay: parseInt(process.env.EXPO_PUBLIC_API_RETRY_DELAY || '1000', 10),
    appName: 'ClubRoom',
    appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    environment: getEnvironment(),
    enableLogging: isDevelopment(),
    enableAnalytics: !isDevelopment(),
    enableCrashReporting: !isDevelopment(),
  });
}
