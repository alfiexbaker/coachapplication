/**
 * Expo Dynamic Configuration
 *
 * This file allows environment-specific configuration at build time.
 * Values from .env files are injected via process.env.
 *
 * @see https://docs.expo.dev/workflow/configuration/
 */

import { ExpoConfig, ConfigContext } from 'expo/config';

function parseFloatEnv(value: string | undefined, defaultValue: number): number {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function compactObject<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const env = process.env.EXPO_PUBLIC_ENV || 'development';
  const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || env;
  const sentryRelease = process.env.SENTRY_RELEASE || `clubroom@1.0.0+${env}`;
  const sentryTracesSampleRate = parseFloatEnv(
    process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? process.env.SENTRY_TRACES_SAMPLE_RATE,
    env === 'development' ? 1 : 0.1,
  );

  return {
    ...config,
    name: getAppName(env),
    slug: 'clubroom',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'clubroom',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: getBundleId(env),
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },

    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      package: getBundleId(env),
    },

    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },

    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow Clubroom to capture training photos and videos',
          microphonePermission: 'Allow Clubroom to record training videos with audio',
        },
      ],
      [
        '@sentry/react-native/expo',
        compactObject({
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          url: process.env.SENTRY_URL,
          options: compactObject({
            dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
            environment: sentryEnvironment,
            release: sentryRelease,
            tracesSampleRate: sentryTracesSampleRate,
          }),
        }),
      ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      // Environment info
      env,
      isProduction: env === 'production',
      isStaging: env === 'staging',
      isDevelopment: env === 'development',

      // API config
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      apiTimeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10),
      useMock: process.env.EXPO_PUBLIC_USE_MOCK === 'true',

      // Feature flags (loaded from env)
      features: {
        familySharing: process.env.EXPO_PUBLIC_FEATURE_FAMILY_SHARING === 'true',
        groupSessions: process.env.EXPO_PUBLIC_FEATURE_GROUP_SESSIONS === 'true',
        videoAnalysis: process.env.EXPO_PUBLIC_FEATURE_VIDEO_ANALYSIS === 'true',
        skillTree: process.env.EXPO_PUBLIC_FEATURE_SKILL_TREE === 'true',
        payments: process.env.EXPO_PUBLIC_FEATURE_PAYMENTS === 'true',
        packages: process.env.EXPO_PUBLIC_FEATURE_PACKAGES === 'true',
        promoCodes: process.env.EXPO_PUBLIC_FEATURE_PROMO_CODES === 'true',
        clubFeed: process.env.EXPO_PUBLIC_FEATURE_CLUB_FEED === 'true',
        challenges: process.env.EXPO_PUBLIC_FEATURE_CHALLENGES === 'true',
        leaderboards: process.env.EXPO_PUBLIC_FEATURE_LEADERBOARDS === 'true',
        aiInsights: process.env.EXPO_PUBLIC_FEATURE_AI_INSIGHTS === 'true',
        liveTracking: process.env.EXPO_PUBLIC_FEATURE_LIVE_TRACKING === 'true',
      },

      // Analytics
      analyticsEnabled: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true',
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      sentryEnvironment,
      sentryRelease,
      sentryTracesSampleRate,

      // Router config
      router: {},

      // EAS config
      eas: {
        projectId: '9d89d9ae-d218-4670-89aa-38d0f7564554',
      },
    },

    owner: 'coachapptrial',
  };
};

/**
 * Get app name based on environment.
 */
function getAppName(env: string): string {
  switch (env) {
    case 'production':
      return 'Clubroom';
    case 'staging':
      return 'Clubroom (Staging)';
    default:
      return 'Clubroom (Dev)';
  }
}

/**
 * Get bundle identifier based on environment.
 */
function getBundleId(env: string): string {
  switch (env) {
    case 'production':
      return 'com.coachapptrial.clubroom';
    case 'staging':
      return 'com.coachapptrial.clubroom.staging';
    default:
      return 'com.coachapptrial.clubroom.dev';
  }
}
