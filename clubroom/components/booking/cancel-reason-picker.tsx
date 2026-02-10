import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CancellationReason } from '@/hooks/use-booking-cancel';
import { Row } from '@/components/primitives';

interface CancelReasonPickerProps {
  isCoach: boolean;
  reasons: CancellationReason[];
  selectedReason: string;
  onSelectReason: (key: string) => void;
}

export const CancelReasonPicker = memo(function CancelReasonPicker({
  isCoach,
  reasons,
  selectedReason,
  onSelectReason,
}: CancelReasonPickerProps) {
  const { colors: palette } = useTheme();

  const handlePress = useCallback(
    (key: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectReason(key);
    },
    [onSelectReason],
  );

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        {isCoach ? 'Reason for cancelling (required)' : 'Why are you cancelling?'}
      </ThemedText>
      <View style={styles.options}>
        {reasons.map((r) => {
          const active = selectedReason === r.key;
          return (
            <Clickable
              key={r.key}
              onPress={() => handlePress(r.key)}
              style={[
                styles.option,
                {
                  borderColor: active ? palette.tint : palette.border,
                  backgroundColor: active ? withAlpha(palette.tint, 0.06) : palette.surface,
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: active ? withAlpha(palette.tint, 0.09) : withAlpha(palette.muted, 0.06) },
                ]}
              >
                <Ionicons name={r.icon} size={16} color={active ? palette.tint : palette.muted} />
              </View>
              <ThemedText style={{ color: active ? palette.tint : palette.text, flex: 1 }}>
                {r.label}
              </ThemedText>
              {active && <Ionicons name="checkmark-circle" size={20} color={palette.tint} />}
            </Clickable>
          );
        })}
      </View>

      {isCoach && !selectedReason && (
        <Row style={[styles.notice, { backgroundColor: withAlpha(palette.error, 0.03) }]}>
          <Ionicons name="alert-circle-outline" size={14} color={palette.error} />
          <ThemedText style={[styles.noticeText, { color: palette.error }]}>
            A reason is required for coach cancellations
          </ThemedText>
        </Row>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.sm },
  title: { marginBottom: Spacing.xxs },
  options: { gap: Spacing.xs },
  option: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radii.sm, borderWidth: 1.5 },
  iconCircle: { width: 28, height: 28, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  notice: { alignItems: 'center', gap: Spacing.xxs, padding: Spacing.xs, borderRadius: Radii.sm },
  noticeText: { ...Typography.caption },
});
