/**
 * SquadConfirmStep — Confirmation step for squad bulk invite wizard.
 *
 * Shows a summary banner, session details card, and disclaimer text.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row, Column } from '@/components/primitives';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { TimeSlot } from '@/constants/types';

// ─── Summary Row (memo'd) ──────────────────────────────────────────────────

interface SummaryRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  colors: ThemeColors;
}

const SummaryRow = memo(function SummaryRow({ icon, text, colors }: SummaryRowProps) {
  return (
    <Row align="center" gap="md">
      <Ionicons name={icon} size={18} color={colors.muted} />
      <ThemedText style={styles.flex1}>{text}</ThemedText>
    </Row>
  );
});

// ─── Main Component ─────────────────────────────────────────────────────────

export interface SquadConfirmStepProps {
  squadName?: string;
  sessionTitle: string;
  sessionType: string;
  focus: string;
  selectedMemberCount: number;
  uniqueParentCount: number;
  proposedSlots: TimeSlot[];
  price: string;
  notes: string;
  colors: ThemeColors;
}

export const SquadConfirmStep = memo(function SquadConfirmStep({
  squadName,
  sessionTitle,
  sessionType,
  focus,
  selectedMemberCount,
  uniqueParentCount,
  proposedSlots,
  price,
  notes,
  colors,
}: SquadConfirmStepProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Column gap="md">
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Confirm & Send
        </ThemedText>

        {/* Summary banner */}
        <Row
          align="center"
          gap="md"
          style={[styles.summaryBanner, { backgroundColor: withAlpha(colors.tint, 0.06) }]}
        >
          <Ionicons name="paper-plane" size={24} color={colors.tint} />
          <Column gap="micro" style={styles.flex1}>
            <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
              Ready to send {uniqueParentCount} invite{uniqueParentCount !== 1 ? 's' : ''}
            </ThemedText>
            <ThemedText style={{ color: colors.tint, ...Typography.caption }}>
              to {selectedMemberCount} athlete{selectedMemberCount !== 1 ? 's' : ''}
              {squadName ? ` in ${squadName}` : ''}
            </ThemedText>
          </Column>
        </Row>

        {/* Details card */}
        <SurfaceCard style={styles.confirmCard}>
          <SummaryRow icon="football-outline" text={sessionTitle} colors={colors} />
          <SummaryRow icon="fitness-outline" text={`${sessionType} - ${focus}`} colors={colors} />
          <SummaryRow
            icon="calendar-outline"
            text={`${proposedSlots.length} time slot(s) proposed`}
            colors={colors}
          />
          <SummaryRow
            icon="people-outline"
            text={`${selectedMemberCount} athlete${selectedMemberCount !== 1 ? 's' : ''} selected`}
            colors={colors}
          />
          {price ? <SummaryRow icon="pricetag-outline" text={`$${price}`} colors={colors} /> : null}
          {notes ? (
            <Row align="center" gap="md">
              <Ionicons name="chatbubble-outline" size={18} color={colors.muted} />
              <ThemedText style={styles.flex1} numberOfLines={2}>
                {notes}
              </ThemedText>
            </Row>
          ) : null}
        </SurfaceCard>

        <ThemedText style={[styles.disclaimer, { color: colors.muted }]}>
          Parents will receive a notification and have 7 days to respond. They can accept one of the
          proposed time slots, decline, or suggest alternative times.
        </ThemedText>
      </Column>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  stepTitle: {
    ...Typography.title,
  },
  summaryBanner: {
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  flex1: {
    flex: 1,
  },
  confirmCard: {
    gap: Spacing.md,
  },
  disclaimer: {
    ...Typography.small,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
