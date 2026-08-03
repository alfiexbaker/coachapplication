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

// -----------------------------------------------------------------------------
// Environment Helpers
// -----------------------------------------------------------------------------

const PUBLIC_ENV_VALUES = {
  ENV: process.env.EXPO_PUBLIC_ENV,
  DEBUG: process.env.EXPO_PUBLIC_DEBUG,
  NATIVE_AUDIT_TEST_MODE: process.env.EXPO_PUBLIC_NATIVE_AUDIT_TEST_MODE,
  REVYL_AUTH_BYPASS_ENABLED: process.env.EXPO_PUBLIC_REVYL_AUTH_BYPASS_ENABLED,
  REVYL_AUTH_BYPASS_TOKEN: process.env.EXPO_PUBLIC_REVYL_AUTH_BYPASS_TOKEN,
  FEATURE_FAMILY_SHARING: process.env.EXPO_PUBLIC_FEATURE_FAMILY_SHARING,
  FEATURE_GROUP_SESSIONS: process.env.EXPO_PUBLIC_FEATURE_GROUP_SESSIONS,
  FEATURE_VIDEO_ANALYSIS: process.env.EXPO_PUBLIC_FEATURE_VIDEO_ANALYSIS,
  FEATURE_SKILL_TREE: process.env.EXPO_PUBLIC_FEATURE_SKILL_TREE,
  FEATURE_PAYMENTS: process.env.EXPO_PUBLIC_FEATURE_PAYMENTS,
  FEATURE_PACKAGES: process.env.EXPO_PUBLIC_FEATURE_PACKAGES,
  FEATURE_PROMO_CODES: process.env.EXPO_PUBLIC_FEATURE_PROMO_CODES,
  FEATURE_CLUB_FEED: process.env.EXPO_PUBLIC_FEATURE_CLUB_FEED,
  FEATURE_CHALLENGES: process.env.EXPO_PUBLIC_FEATURE_CHALLENGES,
  FEATURE_LEADERBOARDS: process.env.EXPO_PUBLIC_FEATURE_LEADERBOARDS,
  FEATURE_AI_INSIGHTS: process.env.EXPO_PUBLIC_FEATURE_AI_INSIGHTS,
  FEATURE_LIVE_TRACKING: process.env.EXPO_PUBLIC_FEATURE_LIVE_TRACKING,
  API_URL: process.env.EXPO_PUBLIC_API_URL,
  API_TIMEOUT: process.env.EXPO_PUBLIC_API_TIMEOUT,
  USE_MOCK: process.env.EXPO_PUBLIC_USE_MOCK,
  PRE_API_LIVE_MODE: process.env.EXPO_PUBLIC_PRE_API_LIVE_MODE,
  AUTH_PROVIDER: process.env.EXPO_PUBLIC_AUTH_PROVIDER,
  SESSION_TIMEOUT: process.env.EXPO_PUBLIC_SESSION_TIMEOUT,
  STORAGE_PROVIDER: process.env.EXPO_PUBLIC_STORAGE_PROVIDER,
  CACHE_TTL: process.env.EXPO_PUBLIC_CACHE_TTL,
  ANALYTICS_ENABLED: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED,
  ANALYTICS_PROVIDER: process.env.EXPO_PUBLIC_ANALYTICS_PROVIDER,
  SEGMENT_WRITE_KEY: process.env.EXPO_PUBLIC_SEGMENT_WRITE_KEY,
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  SENTRY_ENVIRONMENT: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
  SENTRY_RELEASE: process.env.EXPO_PUBLIC_SENTRY_RELEASE,
  SENTRY_TRACES_SAMPLE_RATE: process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  LOG_LEVEL: process.env.EXPO_PUBLIC_LOG_LEVEL,
  PUSH_PROVIDER: process.env.EXPO_PUBLIC_PUSH_PROVIDER,
  QUIET_HOURS_START: process.env.EXPO_PUBLIC_QUIET_HOURS_START,
  QUIET_HOURS_END: process.env.EXPO_PUBLIC_QUIET_HOURS_END,
  GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  DEFAULT_SEARCH_RADIUS: process.env.EXPO_PUBLIC_DEFAULT_SEARCH_RADIUS,
  RATE_LIMIT_RPM: process.env.EXPO_PUBLIC_RATE_LIMIT_RPM,
  BOOKING_RATE_LIMIT: process.env.EXPO_PUBLIC_BOOKING_RATE_LIMIT,
  HAPTICS_ENABLED: process.env.EXPO_PUBLIC_HAPTICS_ENABLED,
  ANIMATION_SCALE: process.env.EXPO_PUBLIC_ANIMATION_SCALE,
  DEFAULT_CURRENCY: process.env.EXPO_PUBLIC_DEFAULT_CURRENCY,
  DEFAULT_LOCALE: process.env.EXPO_PUBLIC_DEFAULT_LOCALE,
} as const;

type PublicEnvKey = keyof typeof PUBLIC_ENV_VALUES;

const getEnv = (key: PublicEnvKey, defaultValue: string = ''): string =>
  PUBLIC_ENV_VALUES[key] ?? defaultValue;

const getBool = (key: PublicEnvKey, defaultValue: boolean = false): boolean => {
  const value = getEnv(key);
  if (value === '') return defaultValue;
  return value === 'true' || value === '1';
};

const getNumber = (key: PublicEnvKey, defaultValue: number = 0): number => {
  const value = getEnv(key);
  if (value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const getFloat = (key: PublicEnvKey, defaultValue: number = 0): number => {
  const value = getEnv(key);
  if (value === '') return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// -----------------------------------------------------------------------------
// Environment Detection
// -----------------------------------------------------------------------------

export type Environment = 'development' | 'staging' | 'production';

export const env = getEnv('ENV', 'development') as Environment;

export const isDevelopment = env === 'development';
export const isStaging = env === 'staging';
export const isProduction = env === 'production';
export const isDebug = getBool('DEBUG', isDevelopment);
export const isTestRuntime = process.env.NODE_ENV === 'test';

/**
 * Local native-audit escape hatch. It exists solely to let a development client
 * exercise retained mock role fixtures without real credentials or data.
 * Any non-development environment fails closed, including staging and production.
 */
export const nativeAudit = {
  testMode: isDevelopment && getBool('NATIVE_AUDIT_TEST_MODE', false),
  authBypassEnabled: getBool('REVYL_AUTH_BYPASS_ENABLED', false),
  authBypassToken: getEnv('REVYL_AUTH_BYPASS_TOKEN'),
} as const;

/** Whether to show detailed error info (stack traces, error codes). True only in dev builds. */
export const showErrorDetails = __DEV__;

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
  baseUrl: getEnv('API_URL', 'http://localhost:4000'),
  timeout: getNumber('API_TIMEOUT', 30000),
  useMock: getBool('USE_MOCK', false),
} as const;

function assertRuntimeModeConfig(): void {
  if (getBool('PRE_API_LIVE_MODE', false)) {
    throw new Error(
      'Invalid Clubroom runtime config: EXPO_PUBLIC_PRE_API_LIVE_MODE=true is no longer supported.',
    );
  }
  if (api.useMock && !isTestRuntime && !nativeAudit.testMode) {
    throw new Error(
      'Invalid Clubroom runtime config: EXPO_PUBLIC_USE_MOCK=true is test-only; normal app runtimes must use the /v1 API.',
    );
  }
}

assertRuntimeModeConfig();

// -----------------------------------------------------------------------------
// Authentication Configuration
// -----------------------------------------------------------------------------

export const auth = {
  provider: getEnv('AUTH_PROVIDER', 'api') as 'api' | 'firebase' | 'auth0' | 'supabase',
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
  sentryEnabled: getEnv('SENTRY_DSN').trim().length > 0,
  sentryEnvironment: getEnv('SENTRY_ENVIRONMENT', env),
  sentryRelease: getEnv('SENTRY_RELEASE', `clubroom@1.0.0+${env}`),
  sentryTracesSampleRate: getFloat('SENTRY_TRACES_SAMPLE_RATE', isDevelopment ? 1 : 0.1),
} as const;

// -----------------------------------------------------------------------------
// Logging Configuration
// -----------------------------------------------------------------------------

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const logging = {
  level: getEnv('LOG_LEVEL', isDevelopment ? 'debug' : 'warn') as LogLevel,
  enableConsole: isDevelopment,
  enableRemote: analytics.sentryEnabled && !isDevelopment,
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
  isTestRuntime,
  nativeAudit,
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
