/**
 * BadgeCtaSection — "View All Achievements" and "Ready for the next level?" CTAs.
 *
 * Two separate SurfaceCard CTAs with navigation to badges index,
 * bookings, and coach discovery.
 */

import { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export const BadgeCtaSection = memo(function BadgeCtaSection() {
  const { colors: palette } = useTheme();

  const handleBrowseAll = useCallback(() => {
    router.push(Routes.BADGES_INDEX);
  }, []);

  const handleViewBookings = useCallback(() => {
    router.push(Routes.BOOKINGS);
  }, []);

  const handleFindCoach = useCallback(() => {
    router.push(Routes.BOOK_COACH);
  }, []);

  return (
    <>
      {/* View All Achievements CTA */}
      <SurfaceCard style={styles.card}>
        <Row gap="sm" align="center">
          <Row
            style={[styles.allBadgesIcon, { backgroundColor: withAlpha(palette.text, 0.07) }]}
            align="center"
            justify="center"
          >
            <Ionicons name="trophy" size={24} color={palette.tint} />
          </Row>
          <Column gap="xxs" flex>
            <ThemedText type="defaultSemiBold">View All Milestones</ThemedText>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              See all milestones and development progress
            </ThemedText>
          </Column>
        </Row>
        <Clickable
          onPress={handleBrowseAll}
          style={[styles.primaryButton, { backgroundColor: palette.tint }]}
          accessibilityLabel="Browse all milestones"
          accessibilityRole="button"
        >
          <Row gap="xs" align="center" justify="center">
            <Ionicons name="grid-outline" size={18} color={palette.onPrimary} />
            <ThemedText style={[styles.primaryButtonText, { color: palette.onPrimary }]}>
              Browse All Milestones
            </ThemedText>
          </Row>
        </Clickable>
      </SurfaceCard>

      {/* Ready for Progression CTA */}
      <SurfaceCard style={styles.card}>
        <Column gap="xxs">
          <ThemedText type="defaultSemiBold">Ready for the next level?</ThemedText>
          <ThemedText style={[styles.hint, { color: palette.muted }]}>
            Book a session to keep building momentum
          </ThemedText>
        </Column>
        <Row gap="sm">
          <Clickable
            onPress={handleViewBookings}
            style={[styles.primaryButton, { backgroundColor: palette.tint, flex: 1 }]}
            accessibilityLabel="View bookings"
            accessibilityRole="button"
          >
            <ThemedText style={[styles.primaryButtonText, { color: palette.onPrimary }]}>
              View bookings
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={handleFindCoach}
            style={[styles.secondaryButton, { borderColor: palette.border, flex: 1 }]}
            accessibilityLabel="Find a coach"
            accessibilityRole="button"
          >
            <ThemedText style={[styles.secondaryButtonText, { color: palette.foreground }]}>
              Find a coach
            </ThemedText>
          </Clickable>
        </Row>
      </SurfaceCard>
    </>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  allBadgesIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
  },
  hint: {
    ...Typography.small,
  },
  primaryButton: {
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs + Spacing.xxs,
    minHeight: 44,
  },
  primaryButtonText: {
    ...Typography.bodySemiBold,
  },
  secondaryButton: {
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs + Spacing.xxs,
    borderWidth: 1,
    minHeight: 44,
  },
  secondaryButtonText: {
    ...Typography.bodySemiBold,
  },
});
