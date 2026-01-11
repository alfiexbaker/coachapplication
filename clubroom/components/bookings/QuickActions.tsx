import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
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
  onMyGoalsPress: () => void;
  onProgressPress: () => void;
  onCalendarPress: () => void;
  onSettingsPress: () => void;
  /** For coaches, only show when on list tab */
  showCoachActions?: boolean;
}

export function QuickActions({
  userRole,
  onMyGoalsPress,
  onProgressPress,
  onCalendarPress,
  onSettingsPress,
  showCoachActions = true,
}: QuickActionsProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Quick Actions for Users/Parents
  if (userRole === 'USER' || userRole === 'PARENT') {
    return (
      <View style={styles.quickActions}>
        <Clickable onPress={onMyGoalsPress}>
          <SurfaceCard style={styles.actionCard}>
            <Ionicons name="football-outline" size={24} color={palette.tint} />
            <ThemedText style={styles.actionText}>My Goals</ThemedText>
          </SurfaceCard>
        </Clickable>

        <Clickable onPress={onProgressPress}>
          <SurfaceCard style={styles.actionCard}>
            <Ionicons name="stats-chart-outline" size={24} color={palette.tint} />
            <ThemedText style={styles.actionText}>Progress</ThemedText>
          </SurfaceCard>
        </Clickable>
      </View>
    );
  }

  // Quick Actions for Coaches - only show on list tab
  if (userRole === 'COACH' && showCoachActions) {
    return (
      <View style={styles.quickActions}>
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
});
