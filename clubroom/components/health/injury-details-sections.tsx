/**
 * Extracted sub-components for InjuryDetailsStep.
 *
 * InjurySummaryCard — body part + severity summary.
 * ShareWithCoachToggle — toggle card for sharing injury with coach.
 */

import React from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { injuryService } from '@/services/injury-service';
import type { BodyPart, InjurySeverity } from '@/constants/types';
import { scaleFont } from '@/utils/scale';
import { Row } from '@/components/primitives';

// ============================================================================
// INJURY SUMMARY CARD
// ============================================================================

interface InjurySummaryCardProps {
  bodyPart: BodyPart | null;
  severity: InjurySeverity | null;
}

export const InjurySummaryCard = React.memo(function InjurySummaryCard({
  bodyPart,
  severity,
}: InjurySummaryCardProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.summary, { backgroundColor: palette.surface }]}>
      <Row style={styles.summaryRow}>
        <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
          Body Part
        </ThemedText>
        <ThemedText style={styles.summaryValue}>
          {bodyPart ? injuryService.getBodyPartLabel(bodyPart) : '-'}
        </ThemedText>
      </Row>
      <Row style={styles.summaryRow}>
        <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
          Severity
        </ThemedText>
        <ThemedText
          style={[
            styles.summaryValue,
            severity && { color: injuryService.getSeverityInfo(severity).color },
          ]}
        >
          {severity ? injuryService.getSeverityInfo(severity).label : '-'}
        </ThemedText>
      </Row>
    </View>
  );
});

// ============================================================================
// SHARE WITH COACH TOGGLE
// ============================================================================

interface ShareWithCoachToggleProps {
  sharedWithCoach: boolean;
  onToggle: (value: boolean) => void;
}

export const ShareWithCoachToggle = React.memo(function ShareWithCoachToggle({
  sharedWithCoach,
  onToggle,
}: ShareWithCoachToggleProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.toggleCard}>
      <Row style={styles.toggleRow}>
        <Row style={styles.toggleInfo}>
          <Ionicons name="share-social-outline" size={24} color={palette.text} />
          <View style={styles.toggleText}>
            <ThemedText style={styles.toggleLabel}>Share with coach</ThemedText>
            <ThemedText style={[styles.toggleDescription, { color: palette.muted }]}>
              Your coach will be able to see this injury
            </ThemedText>
          </View>
        </Row>
        <Switch
          value={sharedWithCoach}
          onValueChange={onToggle}
          trackColor={{ false: palette.border, true: withAlpha(palette.tint, 0.31) }}
          thumbColor={sharedWithCoach ? palette.tint : palette.surface}
        />
      </Row>
    </SurfaceCard>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  summary: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xxs,
  },
  summaryLabel: {
    fontSize: scaleFont(14),
  },
  summaryValue: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  toggleCard: {
    marginBottom: Spacing.md,
  },
  toggleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  toggleDescription: {
    fontSize: scaleFont(13),
  },
});
