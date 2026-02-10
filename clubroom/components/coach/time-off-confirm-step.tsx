/**
 * TimeOffConfirmStep — Confirm save step: summary, conflicts, actions.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { REASONS, formatDateDisplay } from '@/hooks/use-time-off-form';
import { Row } from '@/components/primitives';

interface Conflicts {
  bookingCount: number;
  holdCount: number;
  bookings: { id: string; date: string; time: string; athleteName?: string }[];
}

interface TimeOffConfirmStepProps {
  startDate: Date;
  endDate: Date;
  isSameDay: boolean;
  dayCount: number;
  reason: string;
  conflicts: Conflicts | null;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
}

function TimeOffConfirmStepInner({
  startDate, endDate, isSameDay, dayCount, reason, conflicts, saving, onSave, onBack,
}: TimeOffConfirmStepProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.content}>
      {/* Summary */}
      <SurfaceCard style={styles.summaryCard}>
        <Row style={styles.summaryRow}>
          <Ionicons name="airplane-outline" size={20} color={palette.tint} />
          <View style={styles.summaryInfo}>
            <ThemedText type="defaultSemiBold">
              {isSameDay ? formatDateDisplay(startDate) : `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`}
            </ThemedText>
            <ThemedText style={[styles.summaryMeta, { color: palette.muted }]}>
              {REASONS.find(r => r.id === reason)?.label}
              {!isSameDay ? ` \u00B7 ${dayCount} days` : ''}
            </ThemedText>
          </View>
        </Row>
      </SurfaceCard>

      {/* Conflict Info */}
      {conflicts && conflicts.bookingCount > 0 ? (
        <SurfaceCard style={[styles.conflictCard, { borderColor: palette.warning }]}>
          <Row style={styles.conflictHeader}>
            <Ionicons name="warning-outline" size={18} color={palette.warning} />
            <ThemedText style={[styles.conflictTitle, { color: palette.warning }]}>
              {conflicts.bookingCount} session{conflicts.bookingCount !== 1 ? 's' : ''} affected
            </ThemedText>
          </Row>
          {conflicts.bookings.slice(0, 3).map((b) => (
            <View key={b.id} style={styles.conflictItem}>
              <ThemedText style={[styles.conflictItemText, { color: palette.text }]}>
                {b.athleteName || 'Session'} - {b.date} at {b.time}
              </ThemedText>
            </View>
          ))}
          {conflicts.bookingCount > 3 && (
            <ThemedText style={[styles.conflictMore, { color: palette.muted }]}>+{conflicts.bookingCount - 3} more</ThemedText>
          )}
          <ThemedText style={[styles.conflictNote, { color: palette.muted }]}>
            You may need to cancel or reschedule these sessions.
          </ThemedText>
        </SurfaceCard>
      ) : (
        <Row style={[styles.allClear, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={palette.success} />
          <ThemedText style={[styles.allClearText, { color: palette.success }]}>No sessions affected</ThemedText>
        </Row>
      )}

      {/* Actions */}
      <Clickable onPress={onSave} disabled={saving} style={[styles.primaryBtn, { backgroundColor: palette.error }]} accessibilityLabel={saving ? 'Saving time off' : 'Confirm time off'}>
        <Ionicons name="airplane-outline" size={18} color={palette.onPrimary} />
        <ThemedText style={[styles.primaryBtnText, { color: palette.onPrimary }]}>{saving ? 'Saving...' : 'Confirm Time Off'}</ThemedText>
      </Clickable>

      <Clickable onPress={onBack} style={styles.backBtn} accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={16} color={palette.muted} />
        <ThemedText style={[styles.backBtnText, { color: palette.muted }]}>Back</ThemedText>
      </Clickable>
    </View>
  );
}

export const TimeOffConfirmStep = memo(TimeOffConfirmStepInner);

const styles = StyleSheet.create({
  content: { gap: Spacing.md },
  summaryCard: { padding: Spacing.md },
  summaryRow: { alignItems: 'center', gap: Spacing.md },
  summaryInfo: { flex: 1 },
  summaryMeta: { ...Typography.small, marginTop: Spacing.micro },
  conflictCard: { padding: Spacing.md, borderWidth: 1, gap: Spacing.xs },
  conflictHeader: { alignItems: 'center', gap: Spacing.xs },
  conflictTitle: { ...Typography.bodySemiBold },
  conflictItem: { paddingLeft: Spacing.lg },
  conflictItemText: { ...Typography.small },
  conflictMore: { ...Typography.small, paddingLeft: Spacing.lg },
  conflictNote: { ...Typography.caption, marginTop: Spacing.xs },
  allClear: { alignItems: 'center', gap: Spacing.xs, padding: Spacing.md, borderRadius: Radii.md },
  allClearText: { ...Typography.smallSemiBold },
  primaryBtn: { alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, minHeight: 52, borderRadius: Radii.md, marginTop: Spacing.xs },
  primaryBtnText: { ...Typography.bodySemiBold },
  backBtn: { alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, minHeight: 44 },
  backBtnText: { ...Typography.bodySmall },
});
