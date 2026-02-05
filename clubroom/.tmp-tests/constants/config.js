"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.ui = exports.rateLimits = exports.maps = exports.notifications = exports.logging = exports.analytics = exports.storage = exports.auth = exports.api = exports.isFeatureEnabled = exports.features = exports.isDebug = exports.isProduction = exports.isStaging = exports.isDevelopment = void 0;
const expo_constants_1 = __importDefault(require("expo-constants"));
// -----------------------------------------------------------------------------
// Environment Helpers
// -----------------------------------------------------------------------------
const getEnv = (key, defaultValue = '') => {
    // Try Expo Constants first (from app.config.ts extra)
    const extra = expo_constants_1.default.expoConfig?.extra;
    if (extra && key in extra) {
        return String(extra[key]);
    }
    // Fall back to process.env for build-time values
    const envKey = `EXPO_PUBLIC_${key.toUpperCase()}`;
    return process.env[envKey] ?? defaultValue;
};
const getBool = (key, defaultValue = false) => {
    const value = getEnv(key);
    if (value === '')
        return defaultValue;
    return value === 'true' || value === '1';
};
const getNumber = (key, defaultValue = 0) => {
    const value = getEnv(key);
    if (value === '')
        return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
};
const env = getEnv('ENV', 'development');
exports.isDevelopment = env === 'development';
exports.isStaging = env === 'staging';
exports.isProduction = env === 'production';
exports.isDebug = getBool('DEBUG', exports.isDevelopment);
// -----------------------------------------------------------------------------
// Feature Flags
// -----------------------------------------------------------------------------
exports.features = {
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
};
/**
 * Check if a feature is enabled.
 */
const isFeatureEnabled = (flag) => exports.features[flag];
exports.isFeatureEnabled = isFeatureEnabled;
// -----------------------------------------------------------------------------
// API Configuration
// -----------------------------------------------------------------------------
exports.api = {
    baseUrl: getEnv('API_URL', 'http://localhost:3000/api/v1'),
    timeout: getNumber('API_TIMEOUT', 30000),
    useMock: getBool('USE_MOCK', true),
};
// -----------------------------------------------------------------------------
// Authentication Configuration
// -----------------------------------------------------------------------------
exports.auth = {
    provider: getEnv('AUTH_PROVIDER', 'mock'),
    sessionTimeout: getNumber('SESSION_TIMEOUT', 0), // minutes, 0 = no timeout
};
// -----------------------------------------------------------------------------
// Storage Configuration
// -----------------------------------------------------------------------------
exports.storage = {
    provider: getEnv('STORAGE_PROVIDER', 'async-storage'),
    cacheTtl: getNumber('CACHE_TTL', 300), // seconds
};
// -----------------------------------------------------------------------------
// Analytics Configuration
// -----------------------------------------------------------------------------
exports.analytics = {
    enabled: getBool('ANALYTICS_ENABLED', false),
    provider: getEnv('ANALYTICS_PROVIDER', 'segment'),
    segmentWriteKey: getEnv('SEGMENT_WRITE_KEY'),
    sentryDsn: getEnv('SENTRY_DSN'),
};
exports.logging = {
    level: getEnv('LOG_LEVEL', exports.isDevelopment ? 'debug' : 'warn'),
    enableConsole: exports.isDevelopment,
    enableRemote: exports.isProduction,
};
// -----------------------------------------------------------------------------
// Notifications Configuration
// -----------------------------------------------------------------------------
exports.notifications = {
    provider: getEnv('PUSH_PROVIDER', 'expo'),
    quietHoursStart: getEnv('QUIET_HOURS_START', '22:00'),
    quietHoursEnd: getEnv('QUIET_HOURS_END', '07:00'),
};
// -----------------------------------------------------------------------------
// Maps Configuration
// -----------------------------------------------------------------------------
exports.maps = {
    googleApiKey: getEnv('GOOGLE_MAPS_API_KEY'),
    defaultSearchRadius: getNumber('DEFAULT_SEARCH_RADIUS', 10), // miles
};
// -----------------------------------------------------------------------------
// Rate Limiting
// -----------------------------------------------------------------------------
exports.rateLimits = {
    apiRequestsPerMinute: getNumber('RATE_LIMIT_RPM', 60),
    bookingsPerHour: getNumber('BOOKING_RATE_LIMIT', 10),
};
// -----------------------------------------------------------------------------
// UI Configuration
// -----------------------------------------------------------------------------
exports.ui = {
    hapticsEnabled: getBool('HAPTICS_ENABLED', true),
    animationScale: getNumber('ANIMATION_SCALE', 1),
    defaultCurrency: getEnv('DEFAULT_CURRENCY', 'GBP'),
    defaultLocale: getEnv('DEFAULT_LOCALE', 'en-GB'),
};
// -----------------------------------------------------------------------------
// Unified Config Export
// -----------------------------------------------------------------------------
exports.config = {
    env,
    isDevelopment: exports.isDevelopment,
    isStaging: exports.isStaging,
    isProduction: exports.isProduction,
    isDebug: exports.isDebug,
    features: exports.features,
    api: exports.api,
    auth: exports.auth,
    storage: exports.storage,
    analytics: exports.analytics,
    logging: exports.logging,
    notifications: exports.notifications,
    maps: exports.maps,
    rateLimits: exports.rateLimits,
    ui: exports.ui,
};
exports.default = exports.config;
