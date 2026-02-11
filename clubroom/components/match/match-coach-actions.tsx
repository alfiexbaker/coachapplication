import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface MatchCoachActionsProps {
  isComplete: boolean;
  isUpcoming: boolean;
  isCancelled: boolean;
  hasResult: boolean;
  onRecordResult: () => void;
  onCancelMatch: () => void;
}

export const MatchCoachActions = memo(function MatchCoachActions({
  isComplete,
  isUpcoming,
  isCancelled,
  hasResult,
  onRecordResult,
  onCancelMatch,
}: MatchCoachActionsProps) {
  const { colors } = useTheme();

  const showRecordResult = isComplete && !hasResult;
  const showCancel = isUpcoming && !isCancelled;

  if (!showRecordResult && !showCancel) return null;

  return (
    <View style={styles.container}>
      {showRecordResult && (
        <Clickable style={[styles.button, { borderColor: colors.tint }]} onPress={onRecordResult}>
          <Row align="center" justify="center" gap="sm">
            <Ionicons name="trophy" size={18} color={colors.tint} />
            <ThemedText style={[Typography.bodySemiBold, { color: colors.tint }]}>
              Record Result
            </ThemedText>
          </Row>
        </Clickable>
      )}
      {showCancel && (
        <Clickable style={[styles.button, { borderColor: colors.error }]} onPress={onCancelMatch}>
          <Row align="center" justify="center" gap="sm">
            <Ionicons name="close-circle" size={18} color={colors.error} />
            <ThemedText style={[Typography.bodySemiBold, { color: colors.error }]}>
              Cancel Match
            </ThemedText>
          </Row>
        </Clickable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  button: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
});
