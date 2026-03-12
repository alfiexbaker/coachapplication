import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BookingDeliverySummary } from '@/utils/booking-delivery';

interface BookingDeliveryOutcomeCardProps {
  childName: string;
  summary: BookingDeliverySummary;
  onOpenProgress?: () => void;
}

export const BookingDeliveryOutcomeCard = React.memo(function BookingDeliveryOutcomeCard({
  childName,
  summary,
  onOpenProgress,
}: BookingDeliveryOutcomeCardProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row align="center" gap="sm">
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
          <Ionicons name="football-outline" size={18} color={palette.tint} />
        </View>
        <View style={styles.flexOne}>
          <ThemedText type="defaultSemiBold">Session outcome</ThemedText>
          <ThemedText style={[Typography.bodySmall, { color: palette.muted }]}>
            What the coach logged for {childName} after this session.
          </ThemedText>
        </View>
      </Row>

      <ThemedText style={Typography.body}>{summary.headline}</ThemedText>

      {summary.focusAreas.length > 0 ? (
        <View style={styles.chips}>
          {summary.focusAreas.map((focus) => (
            <View
              key={focus}
              style={[styles.chip, { backgroundColor: withAlpha(palette.tint, 0.08) }]}
            >
              <ThemedText style={[Typography.caption, { color: palette.tint }]}>{focus}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      {summary.improvements ? (
        <View style={styles.block}>
          <ThemedText type="defaultSemiBold">Improvement focus</ThemedText>
          <ThemedText style={[Typography.bodySmall, { color: palette.muted }]}>
            {summary.improvements}
          </ThemedText>
        </View>
      ) : null}

      {summary.homework ? (
        <View style={styles.block}>
          <ThemedText type="defaultSemiBold">Homework</ThemedText>
          <ThemedText style={[Typography.bodySmall, { color: palette.muted }]}>
            {summary.homework}
          </ThemedText>
        </View>
      ) : null}

      {summary.effortLabel ? (
        <Row align="center" gap="xs">
          <Ionicons name="trending-up-outline" size={16} color={palette.success} />
          <ThemedText style={[Typography.caption, { color: palette.success }]}>
            {summary.effortLabel}
          </ThemedText>
        </Row>
      ) : null}

      {onOpenProgress ? (
        <Clickable
          onPress={onOpenProgress}
          style={[styles.cta, { borderColor: palette.border }]}
          accessibilityLabel="Open child progress"
        >
          <Ionicons name="analytics-outline" size={18} color={palette.tint} />
          <ThemedText style={[Typography.bodySemiBold, { color: palette.tint }]}>
            View Progress
          </ThemedText>
        </Clickable>
      ) : null}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.md, padding: Spacing.lg },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexOne: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  block: { gap: Spacing.xxs },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
});
