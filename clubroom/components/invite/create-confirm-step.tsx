/**
 * CreateConfirmStep — Review & Send step for the create invite wizard.
 *
 * Shows invite preview, summary card, recurring toggle, and disclaimer.
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row, Column } from '@/components/primitives';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { SummaryRow, ExistingSummary, NewSessionSummary } from '@/components/invite/create-confirm-summary';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { CreateInviteState, CreateInviteHandlers } from '@/hooks/use-create-invite';

export interface CreateConfirmStepProps {
  state: CreateInviteState;
  handlers: CreateInviteHandlers;
}

// ============================================================================
// RECURRING TOGGLE
// ============================================================================

interface RecurringToggleProps {
  isRecurring: boolean;
  recurrenceWeeks: number;
  onToggleRecurring: (value: boolean) => void;
  onSetWeeks: (weeks: number) => void;
  colors: ThemeColors;
}

const RecurringToggle = memo(function RecurringToggle({
  isRecurring,
  recurrenceWeeks,
  onToggleRecurring,
  onSetWeeks,
  colors,
}: RecurringToggleProps) {
  const handleToggle = useCallback(() => {
    onToggleRecurring(!isRecurring);
  }, [isRecurring, onToggleRecurring]);

  return (
    <SurfaceCard style={styles.recurringCard}>
      <Row align="center" justify="between">
        <Column gap="micro" style={styles.recurringInfo}>
          <ThemedText type="defaultSemiBold">Repeat Weekly</ThemedText>
          <ThemedText style={[styles.recurringDesc, { color: colors.muted }]}>
            Create a recurring session on the same day each week
          </ThemedText>
        </Column>
        <Clickable
          onPress={handleToggle}
          style={[styles.toggleTrack, { backgroundColor: isRecurring ? colors.tint : colors.border }]}
          accessibilityLabel={isRecurring ? 'Disable recurring' : 'Enable recurring'}
          accessibilityRole="button"
        >
          <View style={[
            styles.toggleThumb,
            { backgroundColor: colors.surface, transform: [{ translateX: isRecurring ? 20 : 0 }] },
          ]} />
        </Clickable>
      </Row>
      {isRecurring && (
        <Column gap="sm">
          <ThemedText style={[styles.recurringLabel, { color: colors.muted }]}>For how long?</ThemedText>
          <Row wrap gap="xs">
            {[4, 8, 12].map((weeks) => (
              <WeekChip key={weeks} weeks={weeks} isSelected={recurrenceWeeks === weeks} onSelect={onSetWeeks} colors={colors} />
            ))}
          </Row>
          <ThemedText style={[styles.recurringPreview, { color: colors.tint }]}>
            This will create {recurrenceWeeks} invites, one per week
          </ThemedText>
        </Column>
      )}
    </SurfaceCard>
  );
});

interface WeekChipProps {
  weeks: number;
  isSelected: boolean;
  onSelect: (weeks: number) => void;
  colors: ThemeColors;
}

const WeekChip = memo(function WeekChip({ weeks, isSelected, onSelect, colors }: WeekChipProps) {
  const handlePress = useCallback(() => { onSelect(weeks); }, [weeks, onSelect]);
  return (
    <Clickable
      onPress={handlePress}
      style={[styles.optionChip, { backgroundColor: isSelected ? colors.tint : colors.surface, borderColor: isSelected ? colors.tint : colors.border }]}
      accessibilityLabel={`${weeks} weeks`}
      accessibilityRole="button"
    >
      <ThemedText style={{ color: isSelected ? colors.onPrimary : colors.text, ...Typography.small }}>
        {weeks} weeks
      </ThemedText>
    </Clickable>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CreateConfirmStep = memo(function CreateConfirmStep({ state, handlers }: CreateConfirmStepProps) {
  const { colors } = state;
  const isExisting = state.inviteMode === 'existing' && state.selectedExistingSession !== null;
  const existingSession = state.selectedExistingSession;

  const athleteDisplay = state.selectedAthletes.length === 1
    ? state.selectedAthletes[0].name
    : `${state.selectedAthletes.length} athletes`;
  const clubDisplay = state.selectedClub ? ` to ${state.selectedClub.name}` : '';
  const sessionLabel = isExisting && existingSession
    ? existingSession.title
    : (state.selectedTemplate?.name || state.sessionType);

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Column gap="md">
        <ThemedText type="subtitle" style={styles.stepTitle}>Review & Send</ThemedText>

        {/* Invite Preview Banner */}
        <Row gap="sm" align="center" style={[styles.previewBanner, { backgroundColor: withAlpha(colors.tint, 0.06) }]}>
          <Ionicons name="mail-outline" size={18} color={colors.tint} />
          <ThemedText style={[styles.previewText, { color: colors.text }]}>
            Coach {state.currentUserName?.split(' ')[0] || 'You'} has invited {athleteDisplay}{clubDisplay} - {sessionLabel}
          </ThemedText>
        </Row>

        <SurfaceCard style={styles.summaryCard}>
          <SummaryRow icon="people-outline" color={colors.muted}>
            <ThemedText>{state.selectedAthletes.map((a) => a.name).join(', ')}</ThemedText>
          </SummaryRow>
          {(state.selectedClub || (isExisting && existingSession?.clubId)) && (
            <SummaryRow icon="business-outline" color={colors.tint}>
              <ThemedText style={{ color: colors.tint }}>
                Invite to {state.selectedClub?.name || existingSession?.clubId}
              </ThemedText>
            </SummaryRow>
          )}
          {isExisting && existingSession ? (
            <ExistingSummary session={existingSession} colors={colors} />
          ) : (
            <NewSessionSummary
              selectedTemplate={state.selectedTemplate}
              sessionType={state.sessionType}
              focus={state.focus}
              sessionInviteType={state.sessionInviteType}
              selectedAvailabilitySlots={state.selectedAvailabilitySlots}
              price={state.price}
              colors={colors}
            />
          )}
          {state.notes !== '' && (
            <SummaryRow icon="chatbubble-outline" color={colors.muted}>
              <ThemedText numberOfLines={2}>{state.notes}</ThemedText>
            </SummaryRow>
          )}
        </SurfaceCard>

        {state.inviteMode === 'new' && (
          <RecurringToggle
            isRecurring={state.isRecurring}
            recurrenceWeeks={state.recurrenceWeeks}
            onToggleRecurring={handlers.setIsRecurring}
            onSetWeeks={handlers.setRecurrenceWeeks}
            colors={colors}
          />
        )}

        <ThemedText style={[styles.disclaimer, { color: colors.muted }]}>
          The parent will receive a notification and have 7 days to respond. You can cancel the
          invite anytime before they respond.
        </ThemedText>
      </Column>
    </Animated.View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  stepTitle: { ...Typography.title },
  previewBanner: { padding: Spacing.md, borderRadius: Radii.md },
  previewText: { ...Typography.bodySmallSemiBold, flex: 1, lineHeight: 20 },
  summaryCard: { padding: Spacing.md, gap: Spacing.md },
  recurringCard: { padding: Spacing.md, gap: Spacing.md },
  recurringInfo: { flex: 1 },
  recurringDesc: { ...Typography.small },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 2, minHeight: 44, minWidth: 48 },
  toggleThumb: { width: 24, height: 24, borderRadius: 12 },
  recurringLabel: { ...Typography.smallSemiBold },
  recurringPreview: { ...Typography.smallSemiBold },
  optionChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, minHeight: 44 },
  disclaimer: { ...Typography.small, textAlign: 'center', marginTop: Spacing.md },
});
