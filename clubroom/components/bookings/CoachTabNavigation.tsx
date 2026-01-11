import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
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

export type TabType = 'today' | 'list' | 'create';

export interface CoachTabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  todaySessionCount?: number;
}

export function CoachTabNavigation({ activeTab, onTabChange, todaySessionCount = 0 }: CoachTabNavigationProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.tabContainer}>
      <Clickable
        onPress={() => onTabChange('today')}
        style={[
          styles.tab,
          activeTab === 'today' && { ...styles.activeTab, borderBottomColor: palette.success },
        ]}>
        <View style={styles.tabContent}>
          <Ionicons
            name="today-outline"
            size={20}
            color={activeTab === 'today' ? palette.success : palette.icon}
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === 'today' && { color: palette.success, fontWeight: '700' },
            ]}>
            Today
          </ThemedText>
          {todaySessionCount > 0 && (
            <View style={[styles.badge, { backgroundColor: palette.success }]}>
              <ThemedText style={styles.badgeText} lightColor="#FFFFFF" darkColor="#000000">
                {todaySessionCount}
              </ThemedText>
            </View>
          )}
        </View>
      </Clickable>

      <Clickable
        onPress={() => onTabChange('list')}
        style={[
          styles.tab,
          activeTab === 'list' && { ...styles.activeTab, borderBottomColor: palette.tint },
        ]}>
        <Ionicons
          name="list-outline"
          size={20}
          color={activeTab === 'list' ? palette.tint : palette.icon}
        />
        <ThemedText
          style={[
            styles.tabText,
            activeTab === 'list' && { color: palette.tint, fontWeight: '700' },
          ]}>
          All Sessions
        </ThemedText>
      </Clickable>

      <Clickable
        onPress={() => onTabChange('create')}
        style={[
          styles.tab,
          activeTab === 'create' && { ...styles.activeTab, borderBottomColor: palette.tint },
        ]}>
        <Ionicons
          name="add-circle-outline"
          size={20}
          color={activeTab === 'create' ? palette.tint : palette.icon}
        />
        <ThemedText
          style={[
            styles.tabText,
            activeTab === 'create' && { color: palette.tint, fontWeight: '700' },
          ]}>
          Create
        </ThemedText>
      </Clickable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
