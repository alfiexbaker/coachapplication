import { memo } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { RescheduleDecision } from './reschedule-helpers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RescheduleActionsProps {
  processing: RescheduleDecision | null;
  showDeclineReason: boolean;
  declineReason: string;
  onDeclineReasonChange: (text: string) => void;
  onAccept: () => void;
  onSuggestDifferent: () => void;
  onDecline: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const RescheduleActions = memo(function RescheduleActions({
  processing,
  showDeclineReason,
  declineReason,
  onDeclineReasonChange,
  onAccept,
  onSuggestDifferent,
  onDecline,
}: RescheduleActionsProps) {
  const { colors: palette } = useTheme();

  return (
    <>
      {/* Decline reason input (conditional) */}
      {showDeclineReason && (
        <View style={styles.declineReasonWrap}>
          <ThemedText style={[styles.declineReasonLabel, { color: palette.muted }]}>
            Reason for declining (optional)
          </ThemedText>
          <TextInput
            placeholder="Let the coach know why..."
            placeholderTextColor={palette.muted}
            value={declineReason}
            onChangeText={onDeclineReasonChange}
            multiline
            numberOfLines={3}
            style={[
              styles.declineReasonInput,
              { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface },
            ]}
          />
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        {/* Accept */}
        <Clickable
          onPress={onAccept}
          disabled={processing !== null}
          style={[styles.actionButton, { backgroundColor: palette.success }]}
        >
          {processing === 'accepted' ? (
            <ActivityIndicator size="small" color={palette.surface} />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color={palette.surface} />
              <ThemedText style={[styles.actionButtonText, { color: palette.surface }]}>Accept</ThemedText>
            </>
          )}
        </Clickable>

        {/* Suggest Different */}
        <Clickable
          onPress={onSuggestDifferent}
          disabled={processing !== null}
          style={[
            styles.actionButton,
            { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1.5 },
          ]}
        >
          <Ionicons name="calendar-outline" size={18} color={palette.text} />
          <ThemedText style={[styles.actionButtonText, { color: palette.text }]}>
            Suggest Different
          </ThemedText>
        </Clickable>

        {/* Decline */}
        <Clickable
          onPress={onDecline}
          disabled={processing !== null}
          style={[
            styles.actionButton,
            {
              backgroundColor: showDeclineReason ? palette.error : palette.surface,
              borderColor: showDeclineReason ? palette.error : palette.border,
              borderWidth: 1.5,
            },
          ]}
        >
          {processing === 'declined' ? (
            <ActivityIndicator size="small" color={palette.surface} />
          ) : (
            <>
              <Ionicons
                name="close"
                size={18}
                color={showDeclineReason ? palette.surface : palette.error}
              />
              <ThemedText
                style={[
                  styles.actionButtonText,
                  { color: showDeclineReason ? palette.surface : palette.error },
                ]}
              >
                {showDeclineReason ? 'Confirm Decline' : 'Decline'}
              </ThemedText>
            </>
          )}
        </Clickable>
      </View>
    </>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  declineReasonWrap: {
    gap: Spacing.xs,
  },
  declineReasonLabel: {
    ...Typography.caption,
  },
  declineReasonInput: {
    ...Typography.bodySmall,
    minHeight: 72,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    padding: Spacing.sm,
    textAlignVertical: 'top',
  },
  actions: {
    gap: Spacing.xs,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: 44,
    borderRadius: Radii.card,
  },
  actionButtonText: {
    ...Typography.bodySemiBold,
  },
});
