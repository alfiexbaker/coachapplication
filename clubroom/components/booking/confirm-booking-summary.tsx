import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatGBP } from '@/utils/format';
import { Row } from '@/components/primitives';

interface ConfirmBookingSummaryProps {
  coachName: string;
  athletesInfo: { id: string; name: string }[];
  slotTitle: string;
  slotFocus: string;
  formattedDate: string;
  formattedTime: string;
  slotDuration: number;
  objectives: string[];
  isGroupSession: boolean;
  groupParticipantCount: number;
  price: number;
  totalPrice: number;
}

export const ConfirmBookingSummary = memo(function ConfirmBookingSummary({
  coachName,
  athletesInfo,
  slotTitle,
  slotFocus,
  formattedDate,
  formattedTime,
  slotDuration,
  objectives,
  isGroupSession,
  groupParticipantCount,
  price,
  totalPrice,
}: ConfirmBookingSummaryProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row style={styles.header}>
        <Ionicons name="calendar" size={24} color={palette.tint} />
        <ThemedText type="defaultSemiBold" style={styles.title}>
          Booking Summary
        </ThemedText>
      </Row>
      <Row style={styles.row}>
        <ThemedText style={{ color: palette.muted }}>Coach</ThemedText>
        <ThemedText type="defaultSemiBold">{coachName}</ThemedText>
      </Row>
      {athletesInfo.length > 0 && (
        <Row style={styles.row}>
          <ThemedText style={{ color: palette.muted }}>
            {athletesInfo.length === 1 ? 'Athlete' : 'Athletes'}
          </ThemedText>
          <ThemedText type="defaultSemiBold">
            {athletesInfo.map((a) => a.name).join(', ')}
          </ThemedText>
        </Row>
      )}
      <Row style={styles.row}>
        <ThemedText style={{ color: palette.muted }}>Session</ThemedText>
        <ThemedText type="defaultSemiBold">{slotTitle}</ThemedText>
      </Row>
      <Row style={styles.row}>
        <ThemedText style={{ color: palette.muted }}>Focus</ThemedText>
        <ThemedText type="defaultSemiBold">{slotFocus}</ThemedText>
      </Row>
      <Row style={styles.row}>
        <ThemedText style={{ color: palette.muted }}>Date</ThemedText>
        <ThemedText type="defaultSemiBold">{formattedDate}</ThemedText>
      </Row>
      <Row style={styles.row}>
        <ThemedText style={{ color: palette.muted }}>Time</ThemedText>
        <ThemedText type="defaultSemiBold">
          {formattedTime} ({slotDuration} min)
        </ThemedText>
      </Row>
      {objectives.length > 0 && (
        <View style={styles.objectivesSection}>
          <ThemedText style={{ color: palette.muted }}>Focus Areas</ThemedText>
          <Row style={styles.chips}>
            {objectives.map((obj: string, i: number) => (
              <Row
                key={i}
                style={[
                  styles.chip,
                  { backgroundColor: withAlpha(palette.tint, 0.09), borderColor: palette.tint },
                ]}
              >
                <Ionicons name="football" size={14} color={palette.tint} />
                <ThemedText style={[styles.chipText, { color: palette.tint }]}>{obj}</ThemedText>
              </Row>
            ))}
          </Row>
        </View>
      )}
      {isGroupSession && (
        <Row style={styles.participantsRow}>
          <Ionicons name="people" size={16} color={palette.muted} />
          <ThemedText style={{ color: palette.muted }}>
            Group Session: {groupParticipantCount + 1}/8 spots filled
          </ThemedText>
        </Row>
      )}
      <View style={[styles.divider, { backgroundColor: palette.border }]} />
      <Row style={styles.row}>
        <ThemedText type="defaultSemiBold">
          {athletesInfo.length > 1
            ? `Total (${athletesInfo.length} × ${formatGBP(price)})`
            : 'Total'}
        </ThemedText>
        <ThemedText type="subtitle" style={[styles.totalPrice, { color: palette.tint }]}>
          {formatGBP(totalPrice)}
        </ThemedText>
      </Row>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  title: { ...Typography.heading },
  row: { justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, marginVertical: Spacing.xs },
  objectivesSection: { gap: Spacing.sm },
  chips: { flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  chipText: { ...Typography.smallSemiBold },
  participantsRow: { alignItems: 'center', gap: Spacing.xs / 2 },
  totalPrice: { ...Typography.title },
});
