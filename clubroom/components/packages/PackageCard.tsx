import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography, Components , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SessionPackage } from '@/constants/types';
import { packageService } from '@/services/package-service';

/**
 * Props for the PackageCard component
 */
export interface PackageCardProps {
  /** The package to display */
  pkg: SessionPackage;
  /** Animation delay index for staggered entrance */
  index?: number;
  /** Callback when the card is pressed */
  onPress?: () => void;
  /** Whether to show the coach name */
  showCoach?: boolean;
  /** Whether this is a compact variant */
  compact?: boolean;
}

/**
 * Card component for displaying a session package with discount badge.
 * Shows package name, session count, price, and savings.
 */
export function PackageCard({
  pkg,
  index = 0,
  onPress,
  showCoach = false,
  compact = false,
}: PackageCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const pricePerSession = pkg.pricePerSession ?? Math.round((pkg.price / pkg.sessionCount) * 100) / 100;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard style={[styles.card, compact ? styles.cardCompact : undefined]} onPress={onPress}>
        {/* Discount Badge */}
        {pkg.discountPercent > 0 && (
          <View style={[styles.discountBadge, { backgroundColor: palette.success }]}>
            <ThemedText style={styles.discountText}>
              Save {pkg.discountPercent}%
            </ThemedText>
          </View>
        )}

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleSection}>
              <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={2}>
                {pkg.name}
              </ThemedText>
              {showCoach && pkg.coachName && (
                <ThemedText style={[styles.coachName, { color: palette.muted }]}>
                  {pkg.coachName}
                </ThemedText>
              )}
            </View>
            <View style={styles.priceSection}>
              <ThemedText type="heading" style={[styles.price, { color: palette.tint }]}>
                {packageService.formatPrice(pkg.price, pkg.currency)}
              </ThemedText>
            </View>
          </View>

          {/* Description */}
          {!compact && pkg.description && (
            <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
              {pkg.description}
            </ThemedText>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                <Ionicons name="calendar-outline" size={14} color={palette.tint} />
              </View>
              <ThemedText style={styles.statText}>
                {pkg.sessionCount} {pkg.sessionCount === 1 ? 'session' : 'sessions'}
              </ThemedText>
            </View>

            <View style={styles.stat}>
              <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
                <Ionicons name="pricetag-outline" size={14} color={palette.success} />
              </View>
              <ThemedText style={styles.statText}>
                {packageService.formatPrice(pricePerSession, pkg.currency)}/session
              </ThemedText>
            </View>

            <View style={styles.stat}>
              <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.warning, 0.06) }]}>
                <Ionicons name="time-outline" size={14} color={palette.warning} />
              </View>
              <ThemedText style={styles.statText}>
                {pkg.validDays} days valid
              </ThemedText>
            </View>
          </View>

          {/* Focus Areas */}
          {!compact && pkg.focus && pkg.focus.length > 0 && (
            <View style={styles.focusRow}>
              {pkg.focus.slice(0, 3).map((f) => (
                <View key={f} style={[styles.focusTag, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                  <ThemedText style={[styles.focusText, { color: palette.tint }]}>{f}</ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Inactive indicator */}
          {!pkg.isActive && (
            <View style={[styles.inactiveBanner, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
              <Ionicons name="alert-circle-outline" size={14} color={palette.error} />
              <ThemedText style={[styles.inactiveText, { color: palette.error }]}>
                Currently unavailable
              </ThemedText>
            </View>
          )}
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  cardCompact: {
    // Smaller padding for compact mode
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderBottomLeftRadius: Radii.md,
    zIndex: 1,
  },
  discountText: { ...Typography.caption, color: Colors.light.onPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5 },
  content: {
    padding: Components.card.padding,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  title: { ...Typography.subheading, lineHeight: 22 },
  coachName: { ...Typography.caption, marginTop: Spacing.micro },
  priceSection: {
    alignItems: 'flex-end',
    paddingTop: Spacing.micro,
  },
  price: { ...Typography.title },
  description: { ...Typography.small, lineHeight: 18 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: { ...Typography.caption },
  focusRow: {
    flexDirection: 'row',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs,
  },
  focusTag: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  focusText: { ...Typography.caption },
  inactiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    marginTop: Spacing.xxs,
  },
  inactiveText: { ...Typography.caption },
});

export default PackageCard;
