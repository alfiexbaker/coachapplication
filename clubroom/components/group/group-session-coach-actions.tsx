import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface GroupSessionCoachActionsProps {
  sessionId: string;
  rosterCount: number;
  onCancel: () => void;
}

export const GroupSessionCoachActions = memo(function GroupSessionCoachActions({
  sessionId,
  rosterCount,
  onCancel,
}: GroupSessionCoachActionsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Clickable
        onPress={() => router.push(Routes.groupSessionRoster(sessionId))}
        style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Ionicons name="people" size={20} color={colors.tint} />
        <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>
          View Roster ({rosterCount})
        </ThemedText>
      </Clickable>
      <Clickable
        onPress={onCancel}
        style={[
          styles.button,
          { backgroundColor: withAlpha(colors.error, 0.06), borderColor: colors.error },
        ]}
      >
        <Ionicons name="close-circle" size={20} color={colors.error} />
        <ThemedText style={{ color: colors.error, fontWeight: '600' }}>Cancel Session</ThemedText>
      </Clickable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: Spacing.sm, marginTop: Spacing.md },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
});
