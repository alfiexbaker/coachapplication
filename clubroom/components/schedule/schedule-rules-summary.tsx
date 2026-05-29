/**
 * ScheduleRulesSummary — Compact card showing active booking rules.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachSchedulingRules } from '@/constants/types';

interface Props {
  rules: CoachSchedulingRules;
  onPress: () => void;
}

export const ScheduleRulesSummary = function ScheduleRulesSummary({ rules, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(500).springify()}>
      <Clickable onPress={onPress} accessibilityLabel="View booking rules">
        <SurfaceCard style={styles.card}>
          <Row align="center" gap="xs">
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.muted} />
            <ThemedText style={[styles.title, { color: colors.muted }]}>
              Booking Rules Active
            </ThemedText>
          </Row>
          <ThemedText style={[styles.text, { color: colors.muted }]}>
            {rules.minimumAdvanceBookingHours}h notice · {rules.bufferMinutesDefault}m buffer ·{' '}
            {rules.allowSameDayBookings ? 'Same-day OK' : 'No same-day'}
          </ThemedText>
        </SurfaceCard>
      </Clickable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
  },
  title: {
    ...Typography.caption,
  },
  text: {
    ...Typography.caption,
    marginTop: Spacing.xxs,
  },
});
