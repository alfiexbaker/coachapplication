/**
 * Recurring Session Actions
 *
 * Actions for a single instance of a recurring session:
 * - Skip this week
 * - Change time for this week
 * Shows "Part of weekly series (X of Y)" badge.
 */

import { View, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface RecurringSessionActionsProps {
  /** Which occurrence this is, e.g. 4 */
  occurrenceNumber: number;
  /** Total occurrences in the series */
  totalOccurrences: number;
  /** Called when user confirms skip */
  onSkip: () => void;
  /** Called when user wants to change time */
  onChangeTime: () => void;
  /** Whether this occurrence is already skipped */
  isSkipped?: boolean;
  /** Called to restore a skipped occurrence */
  onRestore?: () => void;
}

export function RecurringSessionActions({
  occurrenceNumber,
  totalOccurrences,
  onSkip,
  onChangeTime,
  isSkipped = false,
  onRestore,
}: RecurringSessionActionsProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const handleSkip = () => {
    Alert.alert(
      'Skip This Week?',
      'This will cancel only this session. The rest of the series continues as normal.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onSkip();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Series badge */}
      <View style={[styles.seriesBadge, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
        <Ionicons name="repeat" size={14} color={palette.tint} />
        <ThemedText style={[styles.seriesText, { color: palette.tint }]}>
          Part of weekly series ({occurrenceNumber} of {totalOccurrences})
        </ThemedText>
      </View>

      {/* Actions */}
      {isSkipped ? (
        <Clickable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRestore?.();
          }}
          style={[styles.actionBtn, { borderColor: palette.success }]}
        >
          <Ionicons name="refresh" size={16} color={palette.success} />
          <ThemedText style={[styles.actionText, { color: palette.success }]}>
            Restore This Week
          </ThemedText>
        </Clickable>
      ) : (
        <View style={styles.actionRow}>
          <Clickable
            onPress={handleSkip}
            style={[styles.actionBtn, { borderColor: palette.border, flex: 1 }]}
          >
            <Ionicons name="close-circle-outline" size={16} color={palette.muted} />
            <ThemedText style={[styles.actionText, { color: palette.text }]}>
              Skip This Week
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={onChangeTime}
            style={[styles.actionBtn, { borderColor: palette.tint, flex: 1 }]}
          >
            <Ionicons name="time-outline" size={16} color={palette.tint} />
            <ThemedText style={[styles.actionText, { color: palette.tint }]}>
              Change Time
            </ThemedText>
          </Clickable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  seriesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  seriesText: {
    ...Typography.small,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  actionText: {
    ...Typography.smallSemiBold,
  },
});
