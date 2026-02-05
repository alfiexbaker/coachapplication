import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
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
              <View style={[styles.statIcon, { backgroundColor: `${palette.tint}10` }]}>
                <Ionicons name="calendar-outline" size={14} color={palette.tint} />
              </View>
              <ThemedText style={styles.statText}>
                {pkg.sessionCount} {pkg.sessionCount === 1 ? 'session' : 'sessions'}
              </ThemedText>
            </View>

            <View style={styles.stat}>
              <View style={[styles.statIcon, { backgroundColor: `${palette.success}10` }]}>
                <Ionicons name="pricetag-outline" size={14} color={palette.success} />
              </View>
              <ThemedText style={styles.statText}>
                {packageService.formatPrice(pricePerSession, pkg.currency)}/session
              </ThemedText>
            </View>

            <View style={styles.stat}>
              <View style={[styles.statIcon, { backgroundColor: `${palette.warning}10` }]}>
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
                <View key={f} style={[styles.focusTag, { backgroundColor: `${palette.tint}10` }]}>
                  <ThemedText style={[styles.focusText, { color: palette.tint }]}>{f}</ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Inactive indicator */}
          {!pkg.isActive && (
            <View style={[styles.inactiveBanner, { backgroundColor: `${palette.error}15` }]}>
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
    paddingVertical: 6,
    borderBottomLeftRadius: Radii.md,
    zIndex: 1,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    padding: Spacing.md,
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
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  coachName: {
    fontSize: 12,
    marginTop: 2,
  },
  priceSection: {
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  price: {
    fontSize: 20,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  focusRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  focusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  focusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inactiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    marginTop: 4,
  },
  inactiveText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PackageCard;
