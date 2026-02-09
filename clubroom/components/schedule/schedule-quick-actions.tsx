/**
 * ScheduleQuickActions — Three quick action buttons: Send Invite, Bookings, New Session.
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Routes } from '@/navigation/routes';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export const ScheduleQuickActions = memo(function ScheduleQuickActions() {
  const { colors } = useTheme();

  const goInvite = useCallback(() => router.push(Routes.SESSION_INVITES_CREATE), []);
  const goBookings = useCallback(() => router.push(Routes.BOOKINGS), []);
  const goCreate = useCallback(() => router.push(Routes.SESSIONS_CREATE), []);

  return (
    <Animated.View entering={FadeInDown.delay(400).springify()}>
      <Row gap="sm">
        <Clickable
          onPress={goInvite}
          accessibilityLabel="Send session invite"
          style={[styles.action, { backgroundColor: colors.surface }]}
        >
          <View style={[styles.icon, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
            <Ionicons name="paper-plane-outline" size={22} color={colors.success} />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Send Invite
          </ThemedText>
        </Clickable>

        <Clickable
          onPress={goBookings}
          accessibilityLabel="View bookings"
          style={[styles.action, { backgroundColor: colors.surface }]}
        >
          <View style={[styles.icon, { backgroundColor: withAlpha(colors.accent, 0.09) }]}>
            <Ionicons name="calendar-outline" size={22} color={colors.accent} />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Bookings
          </ThemedText>
        </Clickable>

        <Clickable
          onPress={goCreate}
          accessibilityLabel="Create new session"
          style={[styles.action, { backgroundColor: colors.surface }]}
        >
          <View style={[styles.icon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
            <Ionicons name="add-circle-outline" size={22} color={colors.tint} />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            New Session
          </ThemedText>
        </Clickable>
      </Row>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  action: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.caption,
  },
});
