/**
 * RsvpSummaryCard — Coach view of RSVP attendance breakdown.
 *
 * Shows "5 Going / 2 Maybe / 1 Can't / 3 Pending" as stat boxes
 * with optional "Remind" button for non-responders.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { RsvpCounts } from '@/hooks/use-group-session';

interface RsvpSummaryCardProps {
  counts: RsvpCounts;
  onSendReminder?: () => void;
}

function RsvpSummaryCardComponent({ counts, onSendReminder }: RsvpSummaryCardProps) {
  const { colors } = useTheme();

  const items = [
    { count: counts.going, label: 'Going', color: colors.success, icon: 'checkmark-circle' as const },
    { count: counts.maybe, label: 'Maybe', color: colors.warning, icon: 'help-circle' as const },
    { count: counts.notGoing, label: "Can't", color: colors.error, icon: 'close-circle' as const },
    { count: counts.pending, label: 'Pending', color: colors.muted, icon: 'time' as const },
  ];

  return (
    <SurfaceCard style={styles.card}>
      <Row align="center" justify="between">
        <ThemedText type="defaultSemiBold">Attendance</ThemedText>
        {onSendReminder && (
          <Clickable
            onPress={onSendReminder}
            style={[styles.reminderBtn, { backgroundColor: withAlpha(colors.tint, 0.09) }]}
            accessibilityLabel="Send reminders to non-responders"
          >
            <Row align="center" gap="xxs">
              <Ionicons name="notifications-outline" size={14} color={colors.tint} />
              <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>
                Remind ({counts.pending})
              </ThemedText>
            </Row>
          </Clickable>
        )}
      </Row>
      <Row gap="sm" style={{ marginTop: Spacing.sm }}>
        {items.map((item) => (
          <View key={item.label} style={[styles.stat, { backgroundColor: withAlpha(item.color, 0.06) }]}>
            <Ionicons name={item.icon} size={16} color={item.color} />
            <ThemedText style={[Typography.heading, { color: item.color }]}>{item.count}</ThemedText>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>{item.label}</ThemedText>
          </View>
        ))}
      </Row>
    </SurfaceCard>
  );
}

export const RsvpSummaryCard = memo(RsvpSummaryCardComponent);

const styles = StyleSheet.create({
  card: { padding: Spacing.md },
  reminderBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    minHeight: 32,
    justifyContent: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.micro,
  },
});
