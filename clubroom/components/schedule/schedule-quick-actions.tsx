/**
 * ScheduleQuickActions — Compact action pills: Create, Bookings, Manage.
 * Sits above the day detail for quick access.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';

import { Routes } from '@/navigation/routes';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export const ScheduleQuickActions = memo(function ScheduleQuickActions() {
  const { colors } = useTheme();

  const goCreate = useCallback(
    () => router.push(Routes.sessionsCreateIntent({ intent: 'new', source: 'schedule' })),
    [],
  );
  const goBookings = useCallback(() => router.push(Routes.BOOKINGS), []);
  const goManage = useCallback(() => router.push(Routes.MANAGE), []);

  return (
    <Row gap="xs" style={styles.container}>
      <Clickable
        onPress={goCreate}
        accessibilityLabel="Create session"
        style={[styles.pill, { backgroundColor: withAlpha(colors.tint, 0.09) }]}
      >
        <ThemedText style={[styles.pillText, { color: colors.tint }]}>Create</ThemedText>
      </Clickable>

      <Clickable
        onPress={goBookings}
        accessibilityLabel="View bookings"
        style={[styles.pill, { backgroundColor: withAlpha(colors.tint, 0.09) }]}
      >
        <ThemedText style={[styles.pillText, { color: colors.tint }]}>Bookings</ThemedText>
      </Clickable>

      <Clickable
        onPress={goManage}
        accessibilityLabel="Manage schedule"
        style={[styles.pill, { backgroundColor: withAlpha(colors.tint, 0.09) }]}
      >
        <ThemedText style={[styles.pillText, { color: colors.tint }]}>Manage</ThemedText>
      </Clickable>
    </Row>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
  },
  pill: {
    flex: 1,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  pillText: {
    ...Typography.bodySmallSemiBold,
  },
});
