/**
 * useFeatureFlag Hook
 *
 * React hook for checking feature flags with runtime override support.
 * Useful for A/B testing and gradual rollouts.
 *
 * Usage:
 *   const isPaymentsEnabled = useFeatureFlag('payments');
 *   if (isPaymentsEnabled) { ... }
 *
 * Override in development:
 *   // In console or dev tools
 *   window.__FEATURE_OVERRIDES__ = { payments: true };
 */

import { useState, useEffect } from 'react';
import { features, type FeatureFlag, isFeatureEnabled } from '@/constants/config';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FeatureFlags');

// Runtime overrides (useful for testing)
const overrides = new Map<FeatureFlag, boolean>();

/**
 * Set a runtime feature flag override.
 * Only works in development mode.
 */
export const setFeatureOverride = (flag: FeatureFlag, enabled: boolean): void => {
  if (__DEV__) {
    overrides.set(flag, enabled);
    logger.info(`Feature override set: ${flag} = ${enabled}`);
  }
};

/**
 * Clear a runtime feature flag override.
 */
export const clearFeatureOverride = (flag: FeatureFlag): void => {
  overrides.delete(flag);
};

/**
 * Clear all runtime feature flag overrides.
 */
export const clearAllFeatureOverrides = (): void => {
  overrides.clear();
};

/**
 * Get the current value of a feature flag (with overrides).
 */
export const getFeatureFlag = (flag: FeatureFlag): boolean => {
  // Check runtime overrides first
  if (overrides.has(flag)) {
    return overrides.get(flag)!;
  }

  // Fall back to config
  return isFeatureEnabled(flag);
};

/**
 * Hook to check if a feature is enabled.
 * Re-renders when overrides change (in development).
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  const [enabled, setEnabled] = useState(() => getFeatureFlag(flag));

  // In development, poll for override changes
  useEffect(() => {
    if (!__DEV__) return;

    const interval = setInterval(() => {
      const current = getFeatureFlag(flag);
      if (current !== enabled) {
        setEnabled(current);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [flag, enabled]);

  return enabled;
}

/**
 * Hook to get multiple feature flags at once.
 */
export function useFeatureFlags<T extends readonly FeatureFlag[]>(
  flags: T,
): Record<T[number], boolean> {
  type FlagRecord = Record<T[number], boolean>;

  const [values, setValues] = useState<FlagRecord>(() => {
    const result = {} as FlagRecord;
    for (const flag of flags) {
      (result as Record<FeatureFlag, boolean>)[flag] = getFeatureFlag(flag);
    }
    return result;
  });

  useEffect(() => {
    if (!__DEV__) return;

    const interval = setInterval(() => {
      const newValues = {} as FlagRecord;
      let changed = false;

      for (const flag of flags) {
        const current = getFeatureFlag(flag);
        (newValues as Record<FeatureFlag, boolean>)[flag] = current;
        if (current !== (values as Record<FeatureFlag, boolean>)[flag]) {
          changed = true;
        }
      }

      if (changed) {
        setValues(newValues);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [flags, values]);

  return values;
}

/**
 * Component wrapper that only renders children if feature is enabled.
 */
export function FeatureGate({
  flag,
  children,
  fallback = null,
}: {
  flag: FeatureFlag;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): React.ReactNode {
  const enabled = useFeatureFlag(flag);
  return enabled ? children : fallback;
}

/**
 * List all feature flags and their current values.
 * Useful for debugging.
 */
export const listFeatureFlags = (): Record<
  FeatureFlag,
  { config: boolean; override?: boolean; effective: boolean }
> => {
  const result = {} as Record<
    FeatureFlag,
    { config: boolean; override?: boolean; effective: boolean }
  >;

  for (const [key, configValue] of Object.entries(features)) {
    const flag = key as FeatureFlag;
    const override = overrides.get(flag);

    result[flag] = {
      config: configValue,
      override,
      effective: getFeatureFlag(flag),
    };
  }

  return result;
};

export default useFeatureFlag;
