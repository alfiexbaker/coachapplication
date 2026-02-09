/**
 * SchedulingRulesSummary — Summary card showing current scheduling rules.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface SchedulingRulesSummaryProps {
  colors: ThemeColors;
  minimumAdvanceHours: number;
  bufferMinutes: number;
  maxAdvanceDays: number;
  allowSameDayBookings: boolean;
}

export const SchedulingRulesSummary = memo(function SchedulingRulesSummary({
  colors,
  minimumAdvanceHours,
  bufferMinutes,
  maxAdvanceDays,
  allowSameDayBookings,
}: SchedulingRulesSummaryProps) {
  return (
    <SurfaceCard style={[styles.summaryCard, { backgroundColor: withAlpha(colors.tint, 0.03) }]}>
      <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.sm }}>
        Summary
      </ThemedText>
      <View style={styles.summaryList}>
        <View style={styles.summaryItem}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <ThemedText style={[styles.summaryText, { color: colors.text }]}>
            Athletes must book at least{' '}
            <ThemedText type="defaultSemiBold">
              {minimumAdvanceHours === 0 ? 'anytime' : `${minimumAdvanceHours} hours`}
            </ThemedText>{' '}
            before
          </ThemedText>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <ThemedText style={[styles.summaryText, { color: colors.text }]}>
            <ThemedText type="defaultSemiBold">{bufferMinutes} minutes</ThemedText> between sessions
          </ThemedText>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <ThemedText style={[styles.summaryText, { color: colors.text }]}>
            Booking up to{' '}
            <ThemedText type="defaultSemiBold">{maxAdvanceDays} days</ThemedText> in advance
          </ThemedText>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons
            name={allowSameDayBookings ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={allowSameDayBookings ? colors.success : colors.muted}
          />
          <ThemedText style={[styles.summaryText, { color: colors.text }]}>
            Same-day bookings{' '}
            <ThemedText type="defaultSemiBold">
              {allowSameDayBookings ? 'allowed' : 'not allowed'}
            </ThemedText>
          </ThemedText>
        </View>
      </View>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
  },
  summaryList: {
    gap: Spacing.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryText: {
    ...Typography.bodySmall,
    flex: 1,
  },
});
