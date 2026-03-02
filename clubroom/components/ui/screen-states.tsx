/**
 * Screen States
 *
 * Reusable components for common screen states:
 * - LoadingState: Skeleton loading with variants (list, card, detail, form, calendar)
 * - ErrorState: Error display with retry button
 * - EmptyState: Re-exported from empty-state.tsx for convenience
 *
 * Usage:
 *   <LoadingState variant="list" />
 *   <ErrorState message="Failed to load" onRetry={refetch} />
 *   <EmptyState title="No items" message="Add your first item" />
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Typography } from '@/constants/theme';
import { createButtonStyles } from '@/constants/styles';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { useTheme } from '@/hooks/useTheme';
import { VARIANT_MAP } from './screen-states-sections';
import type { ServiceError } from '@/types/result';

// Re-export EmptyState for convenience (single source of truth)
export { EmptyState } from './empty-state';
export type { LoadingVariant } from './screen-states-sections';

// ============================================================================
// TYPES
// ============================================================================

export interface LoadingStateProps {
  variant: 'list' | 'card' | 'detail' | 'form' | 'calendar';
}

export interface ErrorStateProps {
  message: string;
  error?: ServiceError;
  onRetry: () => void;
  title?: string;
}

// ============================================================================
// LOADING STATE
// ============================================================================

export function LoadingState({ variant }: LoadingStateProps) {
  const { colors } = useTheme();
  const VariantComponent = VARIANT_MAP[variant];
  return (
    <View style={loadingStyles.container}>
      <VariantComponent baseColor={colors.border} highlightColor={colors.background} />
    </View>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

const USER_FACING_CODES: string[] = [
  'NETWORK',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
];

export function ErrorState({ message, error, onRetry, title }: ErrorStateProps) {
  const { colors } = useTheme();
  const ButtonStyles = createButtonStyles(colors);
  const debugDetails = error?.details;

  return (
    <View style={errorStyles.container}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
      <ThemedText style={[errorStyles.title, { color: colors.text }]}>
        {title ?? 'Something went wrong'}
      </ThemedText>
      <ThemedText style={[errorStyles.message, { color: colors.muted }]}>{message}</ThemedText>

      {error?.code && (__DEV__ || USER_FACING_CODES.includes(error.code)) && (
        <ThemedText style={[errorStyles.code, { color: colors.muted }]}>
          Error: {error.code}
        </ThemedText>
      )}

      <Clickable
        onPress={onRetry}
        style={[ButtonStyles.primary, { marginTop: Spacing.xs }]}
        accessibilityLabel="Try again"
        accessibilityRole="button"
      >
        <ThemedText style={ButtonStyles.primaryText}>Try again</ThemedText>
      </Clickable>

      {__DEV__ && Boolean(debugDetails) ? (
        <View style={{ marginTop: Spacing.md, width: '90%' }}>
          <ThemedText style={[errorStyles.title, { color: colors.muted }]}>
            Debug Info (Dev Only)
          </ThemedText>
          <ThemedText style={[errorStyles.message, { color: colors.muted, fontFamily: 'monospace' }]}>
            {typeof debugDetails === 'string' ? debugDetails : JSON.stringify(debugDetails, null, 2)}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

// ============================================================================
// EMPTY STATE - Use EmptyState from './empty-state' (re-exported above)
// ============================================================================

/**
 * @deprecated Use EmptyState from '@/components/ui/empty-state' instead
 */
export const EmptyStateScreen = null; // Removed - use EmptyState instead

// ============================================================================
// STYLESHEETS
// ============================================================================

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.sm,
  },
});

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  title: {
    ...Typography.heading,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    textAlign: 'center',
  },
  code: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
