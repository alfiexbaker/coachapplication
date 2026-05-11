import { Platform } from 'react-native';
import type { ComponentType } from 'react';
import * as Sentry from '@sentry/react-native';

import { analytics, api, env, isDevelopment } from '@/constants/config';

type BreadcrumbLevel = 'debug' | 'info' | 'warning' | 'error' | 'log';
type SentryWithAppLoaded = typeof Sentry & {
  appLoaded?: () => void;
};

interface SentryUserShape {
  id: string;
  email?: string | null;
  username?: string | null;
  name?: string | null;
  role?: string | null;
}

interface CaptureContextShape {
  tags?: Record<string, string>;
  contexts?: Record<string, Record<string, unknown>>;
}

let initialized = false;
let appLoadedSent = false;

export const isSentryEnabled = (): boolean => analytics.sentryEnabled;

export function initSentry(): void {
  if (initialized || !analytics.sentryEnabled) {
    return;
  }

  Sentry.init({
    enabled: analytics.sentryEnabled,
    dsn: analytics.sentryDsn || undefined,
    debug: isDevelopment,
    environment: analytics.sentryEnvironment,
    release: analytics.sentryRelease,
    tracesSampleRate: analytics.sentryTracesSampleRate,
    attachStacktrace: true,
    initialScope: {
      tags: {
        app_env: env,
        platform: Platform.OS,
        runtime_mode: api.useMock ? 'mock' : 'api',
      },
    },
  });

  initialized = true;
}

export function wrapRootWithSentry<P extends Record<string, unknown>>(
  RootComponent: ComponentType<P>,
): ComponentType<P> {
  initSentry();
  return analytics.sentryEnabled ? Sentry.wrap(RootComponent) : RootComponent;
}

export function markSentryAppLoaded(): void {
  initSentry();

  if (!initialized || appLoadedSent) {
    return;
  }

  appLoadedSent = true;
  (Sentry as SentryWithAppLoaded).appLoaded?.();
}

export function setSentryUser(user: SentryUserShape | null): void {
  initSentry();

  if (!initialized) {
    return;
  }

  if (!user) {
    Sentry.setUser(null);
    Sentry.setTag('user_role', 'anonymous');
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
    username: user.username ?? undefined,
    name: user.name ?? undefined,
  });
  Sentry.setTag('user_role', user.role ?? 'unknown');
}

export function addSentryBreadcrumb(
  level: BreadcrumbLevel,
  message: string,
  data?: Record<string, unknown>,
): void {
  initSentry();

  if (!initialized) {
    return;
  }

  Sentry.addBreadcrumb({
    category: 'app.log',
    level,
    message,
    data,
  });
}

export function captureSentryException(
  error: Error,
  captureContext?: CaptureContextShape,
): void {
  initSentry();

  if (!initialized) {
    return;
  }

  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(captureContext?.tags ?? {})) {
      scope.setTag(key, value);
    }

    for (const [key, value] of Object.entries(captureContext?.contexts ?? {})) {
      scope.setContext(key, value);
    }

    Sentry.captureException(error);
  });
}

export function captureSentryMessage(
  message: string,
  level: 'info' | 'warning' | 'error',
  captureContext?: CaptureContextShape,
): void {
  initSentry();

  if (!initialized) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel(level);

    for (const [key, value] of Object.entries(captureContext?.tags ?? {})) {
      scope.setTag(key, value);
    }

    for (const [key, value] of Object.entries(captureContext?.contexts ?? {})) {
      scope.setContext(key, value);
    }

    Sentry.captureMessage(message);
  });
}
