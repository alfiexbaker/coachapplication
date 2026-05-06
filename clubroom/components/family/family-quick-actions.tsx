import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface FamilyQuickActionsProps {
  onCalendarPress: () => void;
  onRecurringPress: () => void;
}

export const FamilyQuickActions = memo(function FamilyQuickActions({
  onCalendarPress,
  onRecurringPress,
}: FamilyQuickActionsProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.container}>
      <Clickable
        onPress={onCalendarPress}
        style={[styles.card, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
      >
        <View style={[styles.icon, { backgroundColor: palette.tint }]}>
          <Ionicons name="calendar" size={24} color={palette.onPrimary} />
        </View>
        <View style={styles.text}>
          <ThemedText type="defaultSemiBold">Family Calendar</ThemedText>
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            Run the live family week
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </Clickable>

      <Clickable
        onPress={onRecurringPress}
        style={[styles.card, { backgroundColor: withAlpha(palette.success, 0.06) }]}
      >
        <View style={[styles.icon, { backgroundColor: palette.success }]}>
          <Ionicons name="repeat-outline" size={24} color={palette.onPrimary} />
        </View>
        <View style={styles.text}>
          <ThemedText type="defaultSemiBold">Recurring Plans</ThemedText>
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            Manage repeat session routines
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </Clickable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  card: { alignItems: 'center', padding: Spacing.md, borderRadius: Radii.lg, gap: Spacing.md },
  icon: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: Spacing.micro },
});
