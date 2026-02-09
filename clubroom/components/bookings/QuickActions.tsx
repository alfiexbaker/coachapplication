import { View, StyleSheet, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Typography, Spacing} from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';

// Web-compatible clickable wrapper using Pressable
type ClickableProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

function Clickable({ onPress, style, children }: ClickableProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [style, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

export interface QuickActionsProps {
  userRole: 'USER' | 'PARENT' | 'COACH' | string | undefined;
  onRateCoachPress?: () => void;
  onFindCoachPress?: () => void;
  onCalendarPress: () => void;
  onSettingsPress: () => void;
  onGroupSessionsPress?: () => void;
  onDiscoverSessionsPress?: () => void;
  onInvitesPress?: () => void;
  pendingInvites?: number;
  /** For coaches, only show when on list tab */
  showCoachActions?: boolean;
}

export function QuickActions({
  userRole,
  onRateCoachPress,
  onFindCoachPress,
  onCalendarPress,
  onSettingsPress,
  onGroupSessionsPress,
  onDiscoverSessionsPress,
  onInvitesPress,
  pendingInvites = 0,
  showCoachActions = true,
}: QuickActionsProps) {
  const { colors: palette } = useTheme();

  // Quick Actions for Users/Parents - Discover, Find Coach, Groups
  // Invites are now shown inline as "Action Required" section above the bookings list
  if (userRole === 'USER' || userRole === 'PARENT') {
    return (
      <View style={styles.quickActions}>
        <Clickable
          onPress={onDiscoverSessionsPress || (() => {})}
          style={[styles.actionPill, { borderColor: palette.border }]}>
          <Ionicons name="search-outline" size={18} color={palette.tint} />
          <ThemedText style={[styles.actionText, { color: palette.text }]}>Discover</ThemedText>
        </Clickable>

        <Clickable
          onPress={onFindCoachPress || (() => {})}
          style={[styles.actionPill, { borderColor: palette.border }]}>
          <Ionicons name="people-outline" size={18} color={palette.tint} />
          <ThemedText style={[styles.actionText, { color: palette.text }]}>Find Coach</ThemedText>
        </Clickable>

        <Clickable
          onPress={onGroupSessionsPress || (() => {})}
          style={[styles.actionPill, { borderColor: palette.border }]}>
          <Ionicons name="people-circle-outline" size={18} color={palette.tint} />
          <ThemedText style={[styles.actionText, { color: palette.text }]}>Groups</ThemedText>
        </Clickable>
      </View>
    );
  }

  // Quick Actions for Coaches - only show on list tab
  if (userRole === 'COACH' && showCoachActions) {
    return (
      <View style={styles.quickActions}>
        <Clickable
          onPress={onGroupSessionsPress || (() => {})}
          style={[styles.actionPill, { borderColor: palette.border }]}>
          <Ionicons name="people-outline" size={18} color={palette.tint} />
          <ThemedText style={[styles.actionText, { color: palette.text }]}>Groups</ThemedText>
        </Clickable>

        <Clickable
          onPress={onCalendarPress}
          style={[styles.actionPill, { borderColor: palette.border }]}>
          <Ionicons name="calendar-outline" size={18} color={palette.tint} />
          <ThemedText style={[styles.actionText, { color: palette.text }]}>Calendar</ThemedText>
        </Clickable>

        <Clickable
          onPress={onSettingsPress}
          style={[styles.actionPill, { borderColor: palette.border }]}>
          <Ionicons name="person-outline" size={18} color={palette.tint} />
          <ThemedText style={[styles.actionText, { color: palette.text }]}>Settings</ThemedText>
        </Clickable>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: Spacing.xs + Spacing.xxs,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.xs + Spacing.xxs,
  },
  actionText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  iconWithBadge: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  badgeText: { ...Typography.micro },
});
