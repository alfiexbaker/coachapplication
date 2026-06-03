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
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Typography } from '@/constants/theme';
import { createButtonStyles } from '@/constants/styles';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { useTheme } from '@/hooks/useTheme';
import { Skeleton, SkeletonCircle, SkeletonPill } from './skeleton';
import type { LoadingScope, LoadingVariant } from './screen-states-sections';
import { VARIANT_MAP } from './screen-states-variants';
import type { ServiceError } from '@/types/result';

// Re-export EmptyState for convenience (single source of truth)
export { EmptyState } from './empty-state';
export type { LoadingScope, LoadingVariant } from './screen-states-sections';

// ============================================================================
// TYPES
// ============================================================================

export interface LoadingStateProps {
  variant: LoadingVariant;
  scope?: LoadingScope;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
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

export function LoadingState(props: LoadingStateProps) {
  return <LoadingStateBase {...props} />;
}

interface SectionSkeletonProps {
  variant?: LoadingVariant;
  titleWidth?: DimensionValue;
  actionWidth?: number;
  style?: StyleProp<ViewStyle>;
}

interface SubmitProgressStateProps {
  label?: string;
  style?: StyleProp<ViewStyle>;
}

function LoadingStateBase({
  variant,
  scope = 'screen',
  style,
  accessibilityLabel = 'Loading screen content',
}: LoadingStateProps) {
  const VariantComponent = VARIANT_MAP[variant];

  return (
    <View
      style={[
        loadingStyles.container,
        scope === 'screen' ? loadingStyles.screenContainer : loadingStyles.sectionContainer,
        style,
      ]}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
    >
      <VariantComponent scope={scope} />
    </View>
  );
}

export function SectionSkeleton({
  variant = 'tab-pane',
  titleWidth = '38%',
  actionWidth,
  style,
}: SectionSkeletonProps) {
  return (
    <View
      style={[sectionStyles.container, style]}
      accessibilityRole="none"
      accessibilityLabel="Loading section"
    >
      <View style={sectionStyles.header}>
        <Skeleton width={titleWidth} height={16} accessibilityLabel="Loading section heading" />
        {actionWidth ? (
          <SkeletonPill
            width={actionWidth}
            height={28}
            accessibilityLabel="Loading section action"
          />
        ) : null}
      </View>
      <LoadingStateBase
        variant={variant}
        scope="section"
        accessibilityLabel="Loading section content"
      />
    </View>
  );
}

export function SubmitProgressState({ label = 'Working...', style }: SubmitProgressStateProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        submitStyles.container,
        {
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <SkeletonCircle size={12} accessibilityLabel="Loading action" />
      <ThemedText style={[submitStyles.label, { color: colors.muted }]}>{label}</ThemedText>
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
  'UNSUPPORTED',
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
          <ThemedText
            style={[errorStyles.message, { color: colors.muted, fontFamily: 'monospace' }]}
          >
            {typeof debugDetails === 'string'
              ? debugDetails
              : JSON.stringify(debugDetails, null, 2)}
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
    gap: Spacing.md,
  },
  screenContainer: {
    flex: 1,
    padding: Spacing.sm,
  },
  sectionContainer: {
    paddingVertical: Spacing.xs,
  },
});

const sectionStyles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
});

const submitStyles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
  },
  label: {
    ...Typography.caption,
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
