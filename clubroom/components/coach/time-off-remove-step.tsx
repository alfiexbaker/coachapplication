/**
 * TimeOffRemoveStep — Confirm removal step: summary, warning, actions.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { AvailabilityOverride } from '@/constants/types';
import { Row } from '@/components/primitives';

interface TimeOffRemoveStepProps {
  removeDate: string;
  existingOverride: AvailabilityOverride;
  removing: boolean;
  onConfirmRemove: () => void;
  onBack: () => void;
}

function TimeOffRemoveStepInner({
  removeDate,
  existingOverride,
  removing,
  onConfirmRemove,
  onBack,
}: TimeOffRemoveStepProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.content}>
      <SurfaceCard style={styles.summaryCard}>
        <Row style={styles.summaryRow}>
          <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
            <Ionicons name="airplane-outline" size={22} color={palette.error} />
          </View>
          <View style={styles.details}>
            <ThemedText type="defaultSemiBold">{removeDate}</ThemedText>
            {existingOverride.reason ? (
              <ThemedText style={[styles.reason, { color: palette.muted }]}>
                {existingOverride.reason}
              </ThemedText>
            ) : null}
          </View>
        </Row>
      </SurfaceCard>

      <Row style={[styles.warning, { backgroundColor: withAlpha(palette.warning, 0.06) }]}>
        <Ionicons name="information-circle-outline" size={18} color={palette.warning} />
        <ThemedText style={[styles.warningText, { color: palette.warning }]}>
          This day will become available for bookings again.
        </ThemedText>
      </Row>

      <Clickable
        onPress={onConfirmRemove}
        disabled={removing}
        style={[styles.primaryBtn, { backgroundColor: palette.error }]}
        accessibilityLabel="Confirm remove time off"
      >
        {removing ? (
          <ThemedText style={[styles.primaryBtnText, { color: palette.onPrimary }]}>
            Removing...
          </ThemedText>
        ) : (
          <>
            <Ionicons name="trash-outline" size={18} color={palette.onPrimary} />
            <ThemedText style={[styles.primaryBtnText, { color: palette.onPrimary }]}>
              Yes, Remove Time Off
            </ThemedText>
          </>
        )}
      </Clickable>

      <Clickable
        onPress={onBack}
        disabled={removing}
        style={styles.backBtn}
        accessibilityLabel="Cancel removal"
      >
        <Ionicons name="arrow-back" size={16} color={palette.muted} />
        <ThemedText style={[styles.backBtnText, { color: palette.muted }]}>
          Keep Time Off
        </ThemedText>
      </Clickable>
    </View>
  );
}

export const TimeOffRemoveStep = memo(TimeOffRemoveStepInner);

const styles = StyleSheet.create({
  content: { gap: Spacing.md },
  summaryCard: { padding: Spacing.md },
  summaryRow: { alignItems: 'center', gap: Spacing.md },
  iconCircle: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1, gap: Spacing.micro },
  reason: { ...Typography.bodySmall },
  warning: { alignItems: 'center', gap: Spacing.xs, padding: Spacing.md, borderRadius: Radii.md },
  warningText: { ...Typography.bodySmall, flex: 1 },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 52,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  primaryBtnText: { ...Typography.bodySemiBold },
  backBtn: { alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, minHeight: 44 },
  backBtnText: { ...Typography.bodySmall },
});
