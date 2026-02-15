import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import { Row } from '@/components/primitives';

export interface QuickActionsProps {
  userRole: 'USER' | 'PARENT' | 'COACH' | string | undefined;
  onFindCoachPress?: () => void;
  onCalendarPress: () => void;
  onSettingsPress: () => void;
  onDiscoverSessionsPress?: () => void;
  /** For coaches, only show when on list tab */
  showCoachActions?: boolean;
}

export function QuickActions({
  userRole,
  onFindCoachPress,
  onCalendarPress,
  onSettingsPress,
  onDiscoverSessionsPress,
  showCoachActions = true,
}: QuickActionsProps) {
  const { colors: palette } = useTheme();

  // Quick Actions for Users/Parents - Discover + Find Coach
  // Invites are now shown inline as "Action Required" section above the bookings list
  if (userRole === 'USER' || userRole === 'PARENT') {
    return (
      <Row style={styles.quickActions}>
        <Clickable
          onPress={onDiscoverSessionsPress || (() => {})}
          style={[styles.actionPill, { borderColor: palette.border }]}
        >
          <Row align="center" justify="center" gap="xs">
            <Ionicons name="search-outline" size={18} color={palette.tint} />
            <ThemedText style={[styles.actionText, { color: palette.text }]}>Discover</ThemedText>
          </Row>
        </Clickable>

        <Clickable
          onPress={onFindCoachPress || (() => {})}
          style={[styles.actionPill, { borderColor: palette.border }]}
        >
          <Row align="center" justify="center" gap="xs">
            <Ionicons name="people-outline" size={18} color={palette.tint} />
            <ThemedText style={[styles.actionText, { color: palette.text }]}>Find Coach</ThemedText>
          </Row>
        </Clickable>
      </Row>
    );
  }

  // Quick Actions for Coaches - only show on list tab
  if (userRole === 'COACH' && showCoachActions) {
    return (
      <Row style={styles.quickActions}>
        <Clickable
          onPress={onCalendarPress}
          style={[styles.actionPill, { borderColor: palette.border }]}
        >
          <Row align="center" justify="center" gap="xs">
            <Ionicons name="calendar-outline" size={18} color={palette.tint} />
            <ThemedText style={[styles.actionText, { color: palette.text }]}>Calendar</ThemedText>
          </Row>
        </Clickable>

        <Clickable
          onPress={onSettingsPress}
          style={[styles.actionPill, { borderColor: palette.border }]}
        >
          <Row align="center" justify="center" gap="xs">
            <Ionicons name="person-outline" size={18} color={palette.tint} />
            <ThemedText style={[styles.actionText, { color: palette.text }]}>Settings</ThemedText>
          </Row>
        </Clickable>
      </Row>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  quickActions: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: Spacing.xs,
  },
  actionText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  actionPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
});
