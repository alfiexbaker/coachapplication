import React, { memo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatSessionDate } from '@/hooks/use-booking-cancel';

interface CancelRescheduleStepProps {
  isCoach: boolean;
  sessionTime: Date | null;
  sessionTitle: string;
  onPropose: () => void;
  onContinueCancel: () => void;
}

export const CancelRescheduleStep = memo(function CancelRescheduleStep({
  isCoach,
  sessionTime,
  sessionTitle,
  onPropose,
  onContinueCancel,
}: CancelRescheduleStepProps) {
  const { colors: palette } = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { backgroundColor: withAlpha(palette.success, 0.03) }]}>
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <Ionicons name="swap-horizontal" size={32} color={palette.success} />
        </View>
        <ThemedText type="subtitle" style={styles.heroTitle}>
          Reschedule instead of cancelling?
        </ThemedText>
        <ThemedText style={[styles.heroDesc, { color: palette.muted }]}>
          Instead of losing your slot, you can propose a different time. The{' '}
          {isCoach ? 'parent' : 'coach'} will be notified and can accept or suggest an alternative.
        </ThemedText>
      </View>

      {sessionTime && (
        <SurfaceCard style={styles.sessionCard}>
          <ThemedText style={[styles.sessionLabel, { color: palette.muted }]}>
            Current session
          </ThemedText>
          <ThemedText type="defaultSemiBold">{sessionTitle}</ThemedText>
          <View style={styles.sessionRow}>
            <Ionicons name="calendar-outline" size={16} color={palette.muted} />
            <ThemedText style={{ color: palette.muted }}>
              {formatSessionDate(sessionTime)}
            </ThemedText>
          </View>
        </SurfaceCard>
      )}

      <Clickable
        onPress={onPropose}
        style={[styles.primaryButton, { backgroundColor: palette.tint }]}
      >
        <Ionicons name="calendar" size={20} color={palette.onPrimary} />
        <ThemedText style={[styles.primaryText, { color: palette.onPrimary }]}>
          Propose a New Time
        </ThemedText>
      </Clickable>

      <Clickable
        onPress={onContinueCancel}
        style={[styles.outlineButton, { borderColor: palette.border }]}
      >
        <ThemedText style={[styles.outlineText, { color: palette.text }]}>
          No, continue with cancellation
        </ThemedText>
      </Clickable>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: 140, gap: Spacing.md },
  hero: { padding: Spacing.lg, borderRadius: Radii.card, alignItems: 'center', gap: Spacing.sm },
  iconCircle: { width: 56, height: 56, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center' },
  heroTitle: { textAlign: 'center' },
  heroDesc: { textAlign: 'center', ...Typography.bodySmall },
  sessionCard: { padding: Spacing.md, gap: Spacing.xxs },
  sessionLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, marginTop: Spacing.micro },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, height: 44, borderRadius: Radii.card },
  primaryText: { ...Typography.subheading },
  outlineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: Radii.card, borderWidth: 1.5 },
  outlineText: { ...Typography.bodySemiBold },
});
