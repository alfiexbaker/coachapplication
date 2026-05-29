/**
 * LoadingScreen Primitive
 *
 * Centered loading indicator with optional title and subtitle.
 * Use for full-screen or section loading states.
 *
 * Usage:
 *   <LoadingScreen />
 *   <LoadingScreen title="Loading sessions..." />
 *   <LoadingScreen title="Please wait" subtitle="Fetching your data" fullScreen={false} />
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoadingScreenProps {
  /** Optional title displayed below the spinner */
  title?: string;
  /** Optional subtitle displayed below the title */
  subtitle?: string;
  /** Whether to fill SafeAreaView (default: true) */
  fullScreen?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function LoadingScreenInner({ title, subtitle, fullScreen = true }: LoadingScreenProps) {
  const { colors } = useTheme();

  const content = (
    <View style={styles.content}>
      <ActivityIndicator size="large" color={colors.tint} />
      {title ? (
        <ThemedText style={[styles.title, { color: colors.text }]}>{title}</ThemedText>
      ) : null}
      {subtitle ? (
        <ThemedText style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</ThemedText>
      ) : null}
    </View>
  );

  if (fullScreen) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {content}
      </SafeAreaView>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

export const LoadingScreen = LoadingScreenInner;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.heading,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
});
