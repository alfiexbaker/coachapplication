import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaleFont } from '@/utils/scale';

// Web-compatible clickable wrapper using Pressable
type ClickableProps = {
  onPress: () => void;
  style?: any;
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Quick Actions for Users/Parents - Invites, Discover, Find Coach
  if (userRole === 'USER' || userRole === 'PARENT') {
    return (
      <View style={styles.quickActions}>
        <Clickable
          onPress={onInvitesPress || (() => {})}
          style={[styles.actionPill, { borderColor: pendingInvites > 0 ? palette.tint : palette.border }]}>
          <View style={styles.iconWithBadge}>
            <Ionicons name="mail-outline" size={18} color={palette.tint} />
            {pendingInvites > 0 && (
              <View style={[styles.badge, { backgroundColor: palette.error }]}>
                <ThemedText style={styles.badgeText}>{pendingInvites}</ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={[styles.actionText, { color: palette.text }]}>Invites</ThemedText>
        </Clickable>

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
    paddingBottom: 12,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
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
    borderRadius: 12,
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
