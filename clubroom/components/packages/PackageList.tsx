import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { PackageCard } from './PackageCard';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SessionPackage } from '@/constants/types';

/**
 * Props for the PackageList component
 */
export interface PackageListProps {
  /** Array of packages to display */
  packages: SessionPackage[];
  /** Whether the list is loading */
  loading?: boolean;
  /** Callback when a package is pressed */
  onPackagePress?: (pkg: SessionPackage) => void;
  /** Whether to show the coach name on each card */
  showCoach?: boolean;
  /** Title to show above the list */
  title?: string;
  /** Subtitle to show below the title */
  subtitle?: string;
  /** Message to show when the list is empty */
  emptyMessage?: string;
  /** Action label for empty state */
  emptyActionLabel?: string;
  /** Callback for empty state action */
  onEmptyAction?: () => void;
  /** Whether to use compact card variant */
  compact?: boolean;
  /** Filter function to apply to packages */
  filter?: (pkg: SessionPackage) => boolean;
}

/**
 * Component for displaying a list of session packages.
 * Handles loading states, empty states, and optional filtering.
 */
export function PackageList({
  packages,
  loading = false,
  onPackagePress,
  showCoach = false,
  title,
  subtitle,
  emptyMessage = 'No packages available',
  emptyActionLabel,
  onEmptyAction,
  compact = false,
  filter,
}: PackageListProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Apply filter if provided
  const filteredPackages = filter ? packages.filter(filter) : packages;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.tint} />
        <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
          Loading packages...
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      {(title || subtitle) && (
        <View style={styles.header}>
          {title && (
            <ThemedText type="subtitle" style={styles.title}>
              {title}
            </ThemedText>
          )}
          {subtitle && (
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              {subtitle}
            </ThemedText>
          )}
        </View>
      )}

      {/* Package List or Empty State */}
      {filteredPackages.length === 0 ? (
        <EmptyState
          icon="pricetags-outline"
          title="No Packages"
          message={emptyMessage}
          actionLabel={emptyActionLabel}
          onPressAction={onEmptyAction}
        />
      ) : (
        <View style={styles.list}>
          {filteredPackages.map((pkg, index) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              index={index}
              onPress={onPackagePress ? () => onPackagePress(pkg) : undefined}
              showCoach={showCoach}
              compact={compact}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: 14,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 13,
  },
  list: {
    gap: Spacing.md,
  },
});

export default PackageList;
