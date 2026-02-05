/**
 * Centralized App Configuration
 *
 * Single source of truth for all app settings.
 * Reads from environment variables with sensible defaults.
 *
 * Usage:
 *   import { config } from '@/constants/config';
 *   if (config.features.payments) { ... }
 *   fetch(`${config.api.baseUrl}/users`);
 */

import Constants from 'expo-constants';

// -----------------------------------------------------------------------------
// Environment Helpers
// -----------------------------------------------------------------------------

const getEnv = (key: string, defaultValue: string = ''): string => {
  // Try Expo Constants first (from app.config.ts extra)
  const extra = Constants.expoConfig?.extra;
  if (extra && key in extra) {
    return String(extra[key]);
  }

  // Fall back to process.env for build-time values
  const envKey = `EXPO_PUBLIC_${key.toUpperCase()}`;
  return process.env[envKey] ?? defaultValue;
};

const getBool = (key: string, defaultValue: boolean = false): boolean => {
  const value = getEnv(key);
  if (value === '') return defaultValue;
  return value === 'true' || value === '1';
};

const getNumber = (key: string, defaultValue: number = 0): number => {
  const value = getEnv(key);
  if (value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// -----------------------------------------------------------------------------
// Environment Detection
// -----------------------------------------------------------------------------

export type Environment = 'development' | 'staging' | 'production';

const env = (getEnv('ENV', 'development') as Environment);

export const isDevelopment = env === 'development';
export const isStaging = env === 'staging';
export const isProduction = env === 'production';
export const isDebug = getBool('DEBUG', isDevelopment);

// -----------------------------------------------------------------------------
// Feature Flags
// -----------------------------------------------------------------------------

export const features = {
  // Core features
  familySharing: getBool('FEATURE_FAMILY_SHARING', true),
  groupSessions: getBool('FEATURE_GROUP_SESSIONS', true),
  videoAnalysis: getBool('FEATURE_VIDEO_ANALYSIS', true),
  skillTree: getBool('FEATURE_SKILL_TREE', true),

  // Payment features
  payments: getBool('FEATURE_PAYMENTS', false),
  packages: getBool('FEATURE_PACKAGES', true),
  promoCodes: getBool('FEATURE_PROMO_CODES', true),

  // Social features
  clubFeed: getBool('FEATURE_CLUB_FEED', true),
  challenges: getBool('FEATURE_CHALLENGES', true),
  leaderboards: getBool('FEATURE_LEADERBOARDS', false),

  // Experimental features
  aiInsights: getBool('FEATURE_AI_INSIGHTS', false),
  liveTracking: getBool('FEATURE_LIVE_TRACKING', false),
} as const;

export type FeatureFlag = keyof typeof features;

/**
 * Check if a feature is enabled.
 */
export const isFeatureEnabled = (flag: FeatureFlag): boolean => features[flag];

// -----------------------------------------------------------------------------
// API Configuration
// -----------------------------------------------------------------------------

export const api = {
  baseUrl: getEnv('API_URL', 'http://localhost:3000/api/v1'),
  timeout: getNumber('API_TIMEOUT', 30000),
  useMock: getBool('USE_MOCK', true),
} as const;

// -----------------------------------------------------------------------------
// Authentication Configuration
// -----------------------------------------------------------------------------

export const auth = {
  provider: getEnv('AUTH_PROVIDER', 'mock') as 'mock' | 'firebase' | 'auth0' | 'supabase',
  sessionTimeout: getNumber('SESSION_TIMEOUT', 0), // minutes, 0 = no timeout
} as const;

// -----------------------------------------------------------------------------
// Storage Configuration
// -----------------------------------------------------------------------------

export const storage = {
  provider: getEnv('STORAGE_PROVIDER', 'async-storage') as 'async-storage' | 'mmkv',
  cacheTtl: getNumber('CACHE_TTL', 300), // seconds
} as const;

// -----------------------------------------------------------------------------
// Analytics Configuration
// -----------------------------------------------------------------------------

export const analytics = {
  enabled: getBool('ANALYTICS_ENABLED', false),
  provider: getEnv('ANALYTICS_PROVIDER', 'segment') as 'segment' | 'amplitude' | 'mixpanel',
  segmentWriteKey: getEnv('SEGMENT_WRITE_KEY'),
  sentryDsn: getEnv('SENTRY_DSN'),
} as const;

// -----------------------------------------------------------------------------
// Logging Configuration
// -----------------------------------------------------------------------------

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const logging = {
  level: getEnv('LOG_LEVEL', isDevelopment ? 'debug' : 'warn') as LogLevel,
  enableConsole: isDevelopment,
  enableRemote: isProduction,
} as const;

// -----------------------------------------------------------------------------
// Notifications Configuration
// -----------------------------------------------------------------------------

export const notifications = {
  provider: getEnv('PUSH_PROVIDER', 'expo') as 'expo' | 'firebase' | 'onesignal',
  quietHoursStart: getEnv('QUIET_HOURS_START', '22:00'),
  quietHoursEnd: getEnv('QUIET_HOURS_END', '07:00'),
} as const;

// -----------------------------------------------------------------------------
// Maps Configuration
// -----------------------------------------------------------------------------

export const maps = {
  googleApiKey: getEnv('GOOGLE_MAPS_API_KEY'),
  defaultSearchRadius: getNumber('DEFAULT_SEARCH_RADIUS', 10), // miles
} as const;

// -----------------------------------------------------------------------------
// Rate Limiting
// -----------------------------------------------------------------------------

export const rateLimits = {
  apiRequestsPerMinute: getNumber('RATE_LIMIT_RPM', 60),
  bookingsPerHour: getNumber('BOOKING_RATE_LIMIT', 10),
} as const;

// -----------------------------------------------------------------------------
// UI Configuration
// -----------------------------------------------------------------------------

export const ui = {
  hapticsEnabled: getBool('HAPTICS_ENABLED', true),
  animationScale: getNumber('ANIMATION_SCALE', 1),
  defaultCurrency: getEnv('DEFAULT_CURRENCY', 'GBP'),
  defaultLocale: getEnv('DEFAULT_LOCALE', 'en-GB'),
} as const;

// -----------------------------------------------------------------------------
// Unified Config Export
// -----------------------------------------------------------------------------

export const config = {
  env,
  isDevelopment,
  isStaging,
  isProduction,
  isDebug,
  features,
  api,
  auth,
  storage,
  analytics,
  logging,
  notifications,
  maps,
  rateLimits,
  ui,
} as const;

export default config;
