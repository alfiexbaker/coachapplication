/**
 * ScheduleAvailabilitySegment — Content for the "Availability" tab:
 * WeekPatternGrid, session type chips, take time off, booking rules.
 */

import React, { memo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { WeekPatternGrid } from '@/components/coach/week-pattern-grid';
import { SessionTypeChips } from '@/components/coach/session-type-chips';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { AvailabilityTemplate, AvailabilityOverride } from '@/constants/types';
import type { SessionTemplate } from '@/constants/session-types';

interface Props {
  templates: AvailabilityTemplate[];
  overrides: AvailabilityOverride[];
  blockedDates: Set<string>;
  coachId: string;
  sessionTemplates: SessionTemplate[];
  onDayPress: (dow: number, templateId?: string, dateStr?: string) => void;
  onTimeOffPress: (dateStr: string, existingOverride?: AvailabilityOverride) => void;
  onSetupComplete: (newTemplates: AvailabilityTemplate[]) => void;
  onSessionTypePress: (t: SessionTemplate) => void;
  onSessionTypeAdd: () => void;
  onTakeTimeOff: () => void;
  onRulesOpen: () => void;
}

export const ScheduleAvailabilitySegment = memo(function ScheduleAvailabilitySegment({
  templates,
  overrides,
  blockedDates,
  coachId,
  sessionTemplates,
  onDayPress,
  onTimeOffPress,
  onSetupComplete,
  onSessionTypePress,
  onSessionTypeAdd,
  onTakeTimeOff,
  onRulesOpen,
}: Props) {
  const { colors } = useTheme();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <WeekPatternGrid
        templates={templates}
        overrides={overrides}
        blockedDates={blockedDates}
        coachId={coachId}
        isSetupMode={templates.length === 0}
        onDayPress={onDayPress}
        onTimeOffPress={onTimeOffPress}
        onSetupComplete={onSetupComplete}
      />

      {templates.length > 0 && (
        <SessionTypeChips
          templates={sessionTemplates}
          onPress={onSessionTypePress}
          onAdd={onSessionTypeAdd}
        />
      )}

      {templates.length > 0 && (
        <Clickable
          onPress={onTakeTimeOff}
          accessibilityLabel="Take time off"
          style={[
            styles.actionRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Row align="center" gap="sm" flex>
            <Ionicons name="airplane-outline" size={18} color={colors.muted} />
            <ThemedText style={[styles.actionText, { color: colors.text }]}>
              Take Time Off
            </ThemedText>
          </Row>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Clickable>
      )}

      {templates.length > 0 && (
        <Clickable
          onPress={onRulesOpen}
          accessibilityLabel="Booking rules"
          style={[
            styles.actionRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Row align="center" gap="sm" flex>
            <Ionicons name="settings-outline" size={18} color={colors.muted} />
            <ThemedText style={[styles.actionText, { color: colors.text }]}>
              Booking Rules
            </ThemedText>
          </Row>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Clickable>
      )}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  actionText: {
    ...Typography.bodySmall,
    flex: 1,
  },
});
