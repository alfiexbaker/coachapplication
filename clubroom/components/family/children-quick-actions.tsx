/**
 * ChildrenQuickActions — Bottom action buttons (Find Coaches, View Bookings).
 *
 * Primary tint button + secondary outlined button for quick navigation.
 */

import { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Routes } from '@/navigation/routes';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export const ChildrenQuickActions = memo(function ChildrenQuickActions() {
  const { colors: palette } = useTheme();

  const handleFindCoaches = useCallback(() => {
    router.push(Routes.MORE);
  }, []);

  const handleViewBookings = useCallback(() => {
    router.push(Routes.BOOKINGS);
  }, []);

  return (
    <Animated.View entering={FadeInDown.delay(400).springify()}>
      <Row gap="sm">
        <Clickable
          style={[styles.actionButton, { backgroundColor: palette.tint }]}
          onPress={handleFindCoaches}
          accessibilityLabel="Find Coaches"
          accessibilityRole="button"
        >
          <Row gap="xs" align="center" justify="center" style={styles.buttonContent}>
            <Ionicons name="search-outline" size={20} color={palette.onPrimary} />
            <ThemedText style={[styles.actionButtonText, { color: palette.onPrimary }]}>
              Find Coaches
            </ThemedText>
          </Row>
        </Clickable>
        <Clickable
          style={[styles.actionButtonSecondary, { borderColor: palette.border }]}
          onPress={handleViewBookings}
          accessibilityLabel="View Bookings"
          accessibilityRole="button"
        >
          <Row gap="xs" align="center" justify="center" style={styles.buttonContent}>
            <Ionicons name="calendar-outline" size={20} color={palette.tint} />
            <ThemedText style={[styles.actionButtonTextSecondary, { color: palette.tint }]}>
              View Bookings
            </ThemedText>
          </Row>
        </Clickable>
      </Row>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  buttonContent: {
    minHeight: 44,
  },
  actionButtonText: {
    ...Typography.bodySemiBold,
  },
  actionButtonSecondary: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
  },
  actionButtonTextSecondary: {
    ...Typography.bodySemiBold,
  },
});
